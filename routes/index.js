const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const menuCache = require('../caching/menuCache');
const visitorCache = require('../caching/visitorCache');
timeHelper = require('../helpers/timeHelper');

router.use(function (req, res, next) {
    visitorCache.incrementCounters()
        .then(visitorStats => {
            req.visitorStats = visitorStats;
            next();
        });
});

router.get('/:day(-?\\d*)?', function (req, res, next) {
    var uniwirtPlan = menuCache.getMenu('uniwirt');
    var mensaPlan = menuCache.getMenu('mensa');
    var mittagstischPlan = menuCache.getMenu('mittagstisch');

    Promise.all([uniwirtPlan, mensaPlan, mittagstischPlan])
        .then(results => {
            res.render('index', {
                uniwirt: JSON.parse(results[0]),
                mensa: JSON.parse(results[1]),
                mittagstisch: JSON.parse(results[2]),
                visitorStats: req.visitorStats
            });
        });
});

router.get('/about', function (req, res, next) {
    res.render('about', {visitorStats: req.visitorStats});
});

module.exports = router;