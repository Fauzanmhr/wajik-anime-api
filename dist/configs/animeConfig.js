"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getProxyPrefix = () => {
    const proxy = process.env.PROXY_URL;
    if (!proxy)
        return '';
    return proxy.endsWith('/') ? proxy : `${proxy}/`;
};
const animeConfig = {
    PORT: 3001,
    baseUrl: {
        otakudesu: `${getProxyPrefix()}https://otakudesu.cloud`,
        samehadaku: `${getProxyPrefix()}https://samehadaku.mba`,
    },
    response: {
        href: true,
        sourceUrl: true,
    },
};
exports.default = animeConfig;
