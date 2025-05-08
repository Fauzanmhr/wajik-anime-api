const getProxyPrefix = () => {
  const proxy = process.env.PROXY_URL;
  if (!proxy) return '';
  return proxy.endsWith('/') ? proxy : `${proxy}/`;
};

const animeConfig = {
  PORT: 3001,

  baseUrl: {
    otakudesu: `${getProxyPrefix()}https://otakudesu.cloud`,
    samehadaku: `${getProxyPrefix()}https://samehadaku.mba`,
  },

  response: {
    /* ngebalikin respon href biar gampang nyari ref idnya contoh {"href": "/otakudesu/anime/animeId"} value = false akan mengurangi ukuran response <> up to 30% */
    href: true,

    /* ngebalikin respon url sumber contoh {"otakudesuUrl": "https://otakudesu.cloud/anime/animeId"}                          ""                              40% */
    sourceUrl: true,
  },
};

export default animeConfig;
