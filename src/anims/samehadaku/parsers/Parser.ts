import * as IP from "./interfaces/IParser";
import * as IPE from "./interfaces/IParser.extra";
import type { Server } from "../../../interfaces/IGlobal";
import { wajikFetch } from "../../../services/dataFetcher";
import ExtraSamehadakuParser from "./Parser.extra";
import getMinFromMs from "../../../helpers/getMinFromMs";

export default class SamehadakuParser extends ExtraSamehadakuParser {
  parseHome(): Promise<IP.Home> {
    return this.scrape<IP.Home>(
      {
        path: "/",
        initialData: {
          recent: { href: "", samehadakuUrl: "", episodeList: [] },
          batch: { href: "", samehadakuUrl: "", batchList: [] },
          movie: { href: "", samehadakuUrl: "", animeList: [] },
        },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, data) => {
        data.recent.href = this.generateHref("recent");
        data.recent.samehadakuUrl = this.getSourceUrl($(".wp-block-button__link").attr("href"));

        data.batch.href = this.generateHref("batch");
        data.batch.samehadakuUrl = this.getSourceUrl($(".widget-title h3 .linkwidget").attr("href"));

        data.movie.href = this.generateHref("movies");
        data.movie.samehadakuUrl = this.getSourceUrl($(".widgets h3 .linkwidget").attr("href"));

        const animeWrapperElements = $(".post-show").toArray();

        animeWrapperElements.forEach((animeWrapperEl, index) => {
          const animeElements = $(animeWrapperEl).find("ul li").toArray();

          animeElements.forEach((animeEl) => {
            const card = this.parseAnimeCard1($(animeEl), index === 0 ? "episode" : "batch");

            (index === 0 ? data.recent.episodeList : data.batch.batchList).push(card);
          });
        });

        const animeMovieElements = $(".widgetseries ul li").toArray();

        animeMovieElements.forEach((animeMovieElement) => {
          const card = this.parseAnimeCard3($, $(animeMovieElement));

          data.movie.animeList.push(card);
        });

        const isEmpty =
          data.recent.episodeList.length === 0 &&
          data.batch.batchList.length === 0 &&
          data.movie.animeList.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }

  parseAllGenres(): Promise<IP.AllGenres> {
    return this.scrape<IP.AllGenres>(
      {
        path: "/daftar-anime-2",
        initialData: { genreList: [] },
        cacheConfig: { useCache: true },
      },
      async ($, data) => {
        const genreElements = $(".filter_act.genres .tax_fil").toArray();

        genreElements.forEach((genreElement) => {
          const oriUrl = `${this.baseUrl}/genre/${$(genreElement).find("input").attr("value")}`;
          const title = $(genreElement).text().trim();
          const samehadakuUrl = this.getSourceUrl(oriUrl);
          const genreId = this.getSlugFromUrl(oriUrl);
          const href = this.generateHref("genres", genreId);

          data.genreList.push({
            title,
            genreId,
            href,
            samehadakuUrl,
          });
        });

        const isEmpty = data.genreList.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }

  parseAllAnimes(): Promise<IP.AllAnimes> {
    return this.scrape<IP.AllAnimes>(
      {
        path: "/daftar-anime-2/?list",
        initialData: { list: [] },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, data) => {
        const listElements = $(".listpst .listbar").toArray();

        listElements.forEach((listElement) => {
          const animeList: IPE.AnimeLinkCard[] = [];
          const startWith = $(listElement).find(".listabj").text();
          const animeElements = $(listElement).find(".listttl ul li a").toArray();

          animeElements.forEach((animeElement) => {
            const card = this.parseLinkCard($(animeElement), "anime");

            animeList.push({
              title: card.title,
              animeId: card.slug,
              href: card.href,
              samehadakuUrl: card.samehadakuUrl,
            });
          });

          data.list.push({
            startWith,
            animeList,
          });
        });

        const isEmpty = data.list.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }

  parseSchedule(): Promise<IP.Schedule> {
    return this.scrape<IP.Schedule>(
      {
        path: "/jadwal",
        initialData: { days: [] },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, data) => {
        const dayElements = $(".schedule .tab-dates").toArray();

        dayElements.forEach((dayElement) => {
          const day = $(dayElement).text().trim();
          const animeList: IPE.AnimeCard4[] = [];
          const animeElements = $(dayElement).next().find(".animepost").toArray();

          animeElements.forEach((animeElement) => {
            const card = this.parseAnimeCard4($(animeElement));

            animeList.push(card);
          });

          data.days.push({
            day,
            animeList,
          });
        });

        const isEmpty = data.days.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }

  parseRecentEpisodes(page: number): Promise<IP.RecentEpisodes> {
    return this.scrape<IP.RecentEpisodes>(
      {
        path: `/anime-terbaru/page/${page}`,
        initialData: { data: { episodeList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        const animeElements = $(".post-show ul li").toArray();

        animeElements.forEach((animeElement) => {
          const card = this.parseAnimeCard1($(animeElement), "episode");

          data.episodeList.push(card);
        });

        pagination = this.parsePagination($);

        const isEmpty = data.episodeList.length === 0;

        this.checkEmptyData(isEmpty);

        return { data, pagination };
      }
    );
  }

  parseOngoingAnimes(page: number, order: string): Promise<IP.Animes> {
    return this.scrape<IP.Animes>(
      {
        path: `/daftar-anime-2/page/${page}/?status=Currently%20Airing&order=${order}`,
        initialData: { data: { animeList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        data = this.parseAnimeCard2List($, "anime");
        pagination = this.parsePagination($);

        return { data, pagination };
      }
    );
  }

  parseCompletedAnimes(page: number, order: string): Promise<IP.Animes> {
    return this.scrape<IP.Animes>(
      {
        path: `/daftar-anime-2/page/${page}/?status=Finished%20Airing&order=${order}`,
        initialData: { data: { animeList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        data = this.parseAnimeCard2List($, "anime");
        pagination = this.parsePagination($);

        return { data, pagination };
      }
    );
  }

  parsePopularAnimes(page: number): Promise<IP.Animes> {
    return this.scrape<IP.Animes>(
      {
        path: `/daftar-anime-2/page/${page}/?order=popular`,
        initialData: { data: { animeList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        data = this.parseAnimeCard2List($, "anime");
        pagination = this.parsePagination($);

        return { data, pagination };
      }
    );
  }

  parseMovies(page: number): Promise<IP.Animes> {
    return this.scrape<IP.Animes>(
      {
        path: `/anime-movie/page/${page}`,
        initialData: { data: { animeList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        data = this.parseAnimeCard2List($, "anime");
        pagination = this.parsePagination($);

        return { data, pagination };
      }
    );
  }

  parseBatches(page: number): Promise<IP.Batches> {
    return this.scrape<IP.Batches>(
      {
        path: `/daftar-batch/page/${page}`,
        initialData: { data: { batchList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        data.batchList = this.parseAnimeCard2List($, "batch").animeList;
        pagination = this.parsePagination($);

        return { data, pagination };
      }
    );
  }

  parseSearch(q: string, page: number): Promise<IP.Animes> {
    return this.scrape<IP.Animes>(
      {
        path: `/page/${page}/?s=${q}`,
        initialData: { data: { animeList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        data = this.parseAnimeCard2List($, "anime");
        pagination = this.parsePagination($);

        return { data, pagination };
      }
    );
  }

  parseGenreAnimes(genreId: string, page: number): Promise<IP.Animes> {
    return this.scrape<IP.Animes>(
      {
        path: `/genre/${genreId}/page/${page}`,
        initialData: { data: { animeList: [] } },
        cacheConfig: { useCache: true, TTL: getMinFromMs(10) },
      },
      async ($, { data, pagination }) => {
        data = this.parseAnimeCard2List($, "anime");
        pagination = this.parsePagination($);

        return { data, pagination };
      }
    );
  }

  parseAnimeDetails(animeId: string): Promise<IP.AnimeDetails> {
    return this.scrape<IP.AnimeDetails>(
      {
        path: `/anime/${animeId}`,
        initialData: {
          title: "",
          poster: "",
          score: { value: "", users: "" },
          japanese: "",
          synonyms: "",
          english: "",
          status: "",
          type: "",
          source: "",
          duration: "",
          episodes: 0,
          season: "",
          studios: "",
          producers: "",
          aired: "",
          trailer: "",
          synopsis: { paragraphs: [], connections: [] },
          genreList: [],
          batchList: [],
          episodeList: [],
        },
        cacheConfig: { useCache: true },
      },
      async ($, data) => {
        const info = this.parseDetails($);
        const batchElements = $(".listbatch a").toArray();

        batchElements.forEach((batchElement) => {
          const oriUrl = $(batchElement).attr("href");
          const title = $(batchElement).text().trim();
          const samehadakuUrl = this.getSourceUrl(oriUrl);
          const batchId = this.getSlugFromUrl(oriUrl);
          const href = this.generateHref("batch", batchId);

          data.batchList.push({
            title,
            batchId,
            href,
            samehadakuUrl,
          });
        });

        const genreElements = $(".genre-info a").toArray();

        genreElements.forEach((genreElement) => {
          const card = this.parseLinkCard($(genreElement), "genres");

          data.genreList.push({
            title: card.title,
            genreId: card.slug,
            href: card.href,
            samehadakuUrl: card.samehadakuUrl,
          });
        });

        const episodeElements = $(".lstepsiode ul li .eps a").toArray();

        episodeElements.forEach((episodeElement) => {
          const card = this.parseLinkCard($(episodeElement), "episode");

          data.episodeList.push({
            title: Number(card.title.split(" ")[0]) || null,
            episodeId: card.slug,
            href: card.href,
            samehadakuUrl: card.samehadakuUrl,
          });
        });

        data.title = $(".infoanime h1.entry-title").text().replace("Nonton Anime", "").trim();
        data.poster = $(".infoanime .thumb img").attr("src") || "";
        data.score.value = $(".rating-area [itemprop=ratingValue]").text();
        data.score.users = $(".rating-area [itemprop=ratingCount]").text();
        data.episodes = Number(info.totalEpisode) || null;
        data.studios = info.studio;
        data.aired = info.released;
        data.trailer = $(".trailer-anime iframe").attr("src") || "";
        data.synopsis = this.parseSynopsis($);

        delete info["totalEpisode"];
        delete info["studio"];
        delete info["released"];

        data = { ...data, ...info };

        const isEmpty = !data.title && data.episodeList.length === 0 && data.genreList.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }

  parseAnimeEpisode(episodeId: string): Promise<IP.AnimeEpisode> {
    return this.scrape<IP.AnimeEpisode>(
      {
        path: `/${episodeId}`,
        initialData: {
          title: "",
          poster: "",
          releasedOn: "",
          defaultStreamingUrl: "",
          streamingUrlsHref: "",
          hasPrevEpisode: false,
          prevEpisode: null,
          hasNextEpisode: false,
          nextEpisode: null,
          synopsis: { paragraphs: [], connections: [] },
          genreList: [],
          downloadUrl: { formats: [] },
          recommendedEpisodeList: [],
          movie: { href: "", samehadakuUrl: "", animeList: [] },
        },
        cacheConfig: { useCache: true },
      },
      async ($, data) => {
        const getDefaultStreaming = async () => {
          const el = $($(".east_player_option")[0]);

          const postData = el.attr("data-post");
          const numeData = el.attr("data-nume");
          const typeData = el.attr("data-type");

          const result = await wajikFetch(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
            axiosConfig: {
              method: "POST",
              responseType: "text",
              data: new URLSearchParams({
                action: "player_ajax",
                post: postData || "",
                nume: numeData || "",
                type: typeData || "",
              }),
            },
            cacheConfig: {
              useCache: true,
              key: `server:${this.enrawr(`${postData}-${numeData}-${typeData}`)}`,
            },
          });

          return this.generateSrcFromIframeTag(result);
        };

        data.title = $("h1.entry-title").text();
        data.poster = $(".thumb img").attr("src") || "";
        data.releasedOn = $(".time-post").text().trim();
        data.defaultStreamingUrl = await getDefaultStreaming();
        data.streamingUrlsHref = `${this.baseRoute}/episode/${episodeId}/servers`;
        data.downloadUrl = this.parseDownloadUrl($);

        const navigationElements = $(".naveps .nvs:not(.nvsc) a").toArray();

        navigationElements.forEach((navigationElement, index) => {
          const card = this.parseLinkCard($(navigationElement), "episode");

          if (card.slug !== "#") {
            if (index === 0) {
              data.prevEpisode = {
                title: "Prev",
                episodeId: card.slug,
                href: card.href,
                samehadakuUrl: card.samehadakuUrl,
              };
            } else {
              data.nextEpisode = {
                title: "Next",
                episodeId: card.slug,
                href: card.href,
                samehadakuUrl: card.samehadakuUrl,
              };
            }
          }
        });

        data.hasPrevEpisode = data.prevEpisode ? true : false;
        data.hasNextEpisode = data.nextEpisode ? true : false;
        data.movie.href = this.generateHref("movies");
        data.movie.samehadakuUrl = this.getSourceUrl($(".widgets h3 .linkwidget").attr("href"));

        const movieElements = $(".widgetseries ul li").toArray();

        movieElements.forEach((movieElement) => {
          const card = this.parseAnimeCard3($, $(movieElement));

          data.movie.animeList.push(card);
        });

        const connectionElements = $(".desc a").toArray();

        connectionElements.forEach((connectionElement) => {
          const card = this.parseLinkCard($(connectionElement), "anime");

          data.synopsis.connections?.push({
            title: card.title,
            animeId: card.slug,
            href: card.href,
            samehadakuUrl: card.samehadakuUrl,
          });
        });

        $(".desc a").remove();

        const paragraph = $(".desc").text().trim();

        data.synopsis.paragraphs.push(paragraph);

        const genreElements = $(".genre-info a").toArray();

        genreElements.forEach((genreElement) => {
          const card = this.parseLinkCard($(genreElement), "genres");

          data.genreList.push({
            title: card.title,
            genreId: card.slug,
            href: card.href,
            samehadakuUrl: card.samehadakuUrl,
          });
        });

        const animeElements = $(".lstepsiode ul li").toArray();

        animeElements.forEach((animeElement) => {
          const title = $(animeElement).find(".epsleft .lchx").text();
          const poster = $(animeElement).find(".epsright img").attr("src") || "";
          const releaseDate = $(animeElement).find(".epsleft .date").text();
          const oriUrl = $(animeElement).find(".epsright a").attr("href");
          const samehadakuUrl = this.getSourceUrl(oriUrl);
          const animeId = this.getSlugFromUrl(oriUrl);
          const href = this.generateHref("episode", animeId);

          data.recommendedEpisodeList.push({
            title,
            poster,
            releaseDate,
            episodeId,
            href,
            samehadakuUrl,
          });
        });

        const isEmpty = !data.title && data.genreList.length === 0 && data.downloadUrl.formats.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }

  parseAnimeServers(episodeId: string): Promise<IP.AnimeServers> {
    return this.scrape<IP.AnimeServers>(
      {
        path: `/${episodeId}`,
        initialData: { qualities: [] },
        cacheConfig: { useCache: true },
      },
      async ($, data) => {
        const serverElements = $(".server_option ul li .east_player_option").toArray();

        type Q = "360p" | "480p" | "720p" | "1080p" | "4k";

        const qualities: { title: Q; serverList: Server[] }[] = [
          { title: "360p", serverList: [] },
          { title: "480p", serverList: [] },
          { title: "720p", serverList: [] },
          { title: "1080p", serverList: [] },
          { title: "4k", serverList: [] },
        ];

        qualities.forEach((quality) => {
          serverElements.forEach((serverElement) => {
            if (!$(serverElement).attr("style")?.includes("not-allowed")) {
              const title = $(serverElement).text().trim();
              const postData = $(serverElement).attr("data-post") || "";
              const numeData = $(serverElement).attr("data-nume") || "";
              const typeData = $(serverElement).attr("data-type") || "";
              const serverId = this.enrawr(`${postData}-${numeData}-${typeData}`);
              const href = this.generateHref("server", serverId);

              if (title.toLowerCase().includes(quality.title)) {
                quality.serverList.push({ title, serverId, href });
              }
            }
          });
        });

        data.qualities = qualities;

        const isEmpty = data.qualities.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }

  async parseServerUrl(serverId: string): Promise<IP.ServerUrl> {
    const data: IP.ServerUrl = { url: "" };
    const serverIdArr = this.derawr(serverId).split("-");
    const post = serverIdArr[0];
    const nume = serverIdArr[1];
    const type = serverIdArr[2];
    const url = await wajikFetch(
      `${this.baseUrl}/wp-admin/admin-ajax.php`,
      {
        axiosConfig: {
          method: "POST",
          responseType: "text",
          data: new URLSearchParams({
            action: "player_ajax",
            post: post || "",
            nume: nume || "",
            type: type || "",
          }),
        },
        cacheConfig: {
          useCache: true,
          TTL: getMinFromMs(2),
          key: `server:${serverId}`,
        },
      },
      (response) => {
        if (!response.data) throw { status: 400 };
      }
    );

    data.url = this.generateSrcFromIframeTag(url);

    const isEmpty = !data.url || data.url === "No iframe found";

    this.checkEmptyData(isEmpty);

    return data;
  }

  parseAnimeBatch(batchId: string): Promise<IP.AnimeBatch> {
    return this.scrape<IP.AnimeBatch>(
      {
        path: `/batch/${batchId}`,
        initialData: {
          title: "",
          poster: "",
          japanese: "",
          synonyms: "",
          english: "",
          status: "",
          type: "",
          source: "",
          score: "",
          duration: "",
          episodes: 0,
          season: "",
          studios: "",
          producers: "",
          aired: "",
          releasedOn: "",
          synopsis: { paragraphs: [], connections: [] },
          genreList: [],
          downloadUrl: { formats: [] },
          recommendedAnimeList: [],
        },
        cacheConfig: { useCache: true },
      },
      async ($, data) => {
        const details = this.parseDetails($);

        data.title = $(".entry-title").text();
        data.episodes = Number(details.totalEpisode) || null;
        data.studios = details.studio;
        data.aired = details.released;
        data.releasedOn = $(".year").text().split("-")[1].trim();
        data.poster = $(".thumb-batch img").attr("src") || "";
        data.synopsis = this.parseSynopsis($);
        data.downloadUrl = this.parseDownloadUrl($);

        delete details["totalEpisode"];
        delete details["studio"];
        delete details["released"];
        delete details["genre"];

        const genreElements = $($(".infox .spe span")[11]).find("a").toArray();

        genreElements.forEach((genreElement) => {
          const card = this.parseLinkCard($(genreElement), "genres");

          data.genreList.push({
            title: card.title,
            genreId: card.slug,
            href: card.href,
            samehadakuUrl: card.samehadakuUrl,
          });
        });

        const animeElements = $(".widget-post .animepost").toArray();

        animeElements.forEach((animeElement) => {
          const title = $(animeElement).find("a").attr("title") || "";
          const poster = $(animeElement).find("img").attr("src") || "";
          const oriUrl = $(animeElement).find("a").attr("href");
          const samehadakuUrl = this.getSourceUrl(oriUrl);
          const animeId = this.getSlugFromUrl(oriUrl);
          const href = this.generateHref("anime", animeId);

          data.recommendedAnimeList.push({
            title,
            poster,
            animeId,
            href,
            samehadakuUrl,
          });
        });

        data = { ...data, ...details };

        const isEmpty = !data.title && data.downloadUrl.formats.length === 0 && data.genreList.length === 0;

        this.checkEmptyData(isEmpty);

        return data;
      }
    );
  }
}