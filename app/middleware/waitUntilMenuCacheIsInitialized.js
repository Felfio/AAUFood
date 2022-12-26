/**
 * Created by Markus on 23.06.2016.
 */

const menuCache = require("../caching/menuCache");

function waitUntilMenuCacheIsInitialized(req, res, next) {
    return menuCache.initialization.finally(() => next());
}

module.exports = {
    waitUntilMenuCacheIsInitialized
};