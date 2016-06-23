/**
 * Created by Markus on 23.06.2016.
 */
const visitorCache = require('../caching/visitorCache');

function countVisitors(req, res, next) {
    visitorCache.incrementCounters()
        .then(visitorStats => {
            req.visitorStats = visitorStats;
            next();
        });
}

module.exports = {
    countVisitors: countVisitors
};