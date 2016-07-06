const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const menuCache = require('../caching/menuCache');
const externalApis = require('../externals/externalApis');
const visitorCache = require('../caching/visitorCache');
const timeHelper = require('../helpers/timeHelper');
const footerPunHelper = require('../helpers/footerPunHelper');
const counter = require('../middleware/visitorCounter');

router.get('/:day(-?\\d*)?', counter.countVisitors, function (req, res, next) {
    var uniwirtPlan = menuCache.getMenu('uniwirt');
    var mensaPlan = menuCache.getMenu('mensa');
    var mittagstischPlan = menuCache.getMenu('mittagstisch');

    Promise.all([uniwirtPlan, mensaPlan, mittagstischPlan])
        .then(results => {
            res.render('index', {
                uniwirt: JSON.parse(results[0]),
                mensa: JSON.parse(results[1]),
                mittagstisch: JSON.parse(results[2]),
                visitorStats: req.visitorStats,
                footerPun: footerPunHelper.getRandomFooterPun()
            });
        });
});

router.get('/about', counter.countVisitors, function (req, res, next) {
    var dailyVisitors = req.visitorStats.dailyVisitors;
    var overallVisitors = req.visitorStats.overallVisitors;

    var dailyVisitorsFact = externalApis.getNumberFact(dailyVisitors);
    var overallVisitiorsFact = externalApis.getNumberFact(overallVisitors);
    var catFact = externalApis.getCatFact();

    Promise.all([dailyVisitorsFact, overallVisitiorsFact, catFact])
        .then(facts => {
            res.render('about', {
                dailyVisitorsFact: facts[0],
                overallVisitiorsFact: facts[1],
                catFact: facts[2],
                visitorStats: req.visitorStats,
                footerPun: footerPunHelper.getRandomFooterPun()
            });
        });
});

module.exports = router;