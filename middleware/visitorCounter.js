/**
 * Created by Markus on 23.06.2016.
 */
const visitorCache = require('../caching/visitorCache');
const winston = require('winston');

function countVisitors(req, res, next) {
    visitorCache.increment(req.session)
        .then((visitorStats) => {
            req.visitorStats = visitorStats;
            next()
        })
        .catch(() => {
            winston.info('Visits could not be updated.');
        });
}

module.exports = {
    countVisitors: countVisitors
};