const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const menuCache = require('../caching/menuCache');
const externalApis = require('../externals/externalApis');
const visitorCache = require('../caching/visitorCache');
const timeHelper = require('../helpers/timeHelper');
const counter = require('../middleware/visitorCounter');

router.get('/:day(-?\\d*)?', counter.countVisitors, function (req, res, next) {
    var uniwirtPlan = menuCache.getMenu('uniwirt');
    var mensaPlan = menuCache.getMenu('mensa');
    var hotspotPlan = menuCache.getMenu('hotspot');
    var unipizzeriaPlan = menuCache.getMenu('uniPizzeria');
    var villaLidoPlan = menuCache.getMenu('villaLido')

    Promise.all([uniwirtPlan, mensaPlan, hotspotPlan, unipizzeriaPlan, villaLidoPlan])
        .then(results => {
            res.render('index', {
                uniwirt: JSON.parse(results[0]) || [],
                mensa: JSON.parse(results[1]) || [],
                hotspot: JSON.parse(results[2]) || [],
                uniPizzeria: JSON.parse(results[3]) || [],
                villaLido: JSON.parse(results[4] || []),
                visitorStats: req.visitorStats,
            });
        });
});

router.get('/city/:day(-?\\d*)?', counter.countVisitors, function (req, res, next) {
    var lapastaPlan = menuCache.getMenu('lapasta');
    var princsPlan = menuCache.getMenu('princs');

    Promise.all([lapastaPlan, princsPlan])
        .then(results => {
            res.render('cityfood', {
                lapasta: JSON.parse(results[0]) || [],
                princs: JSON.parse(results[1]) || [],
                visitorStats: req.visitorStats,
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
            });
        });
});
router.get('/print', counter.countVisitors, function (req, res, next) {
    var uniwirtPlan = menuCache.getMenu('uniwirt');
    var mensaPlan = menuCache.getMenu('mensa');
    var hotspotPlan = menuCache.getMenu('hotspot');
    var unipizzeriaPlan = menuCache.getMenu('uniPizzeria');
    var villaLidoPlan = menucache.getMenu('villaLido')

    Promise.all([uniwirtPlan, mensaPlan, hotspotPlan, unipizzeriaPlan, villaLidoPlan])
        .then(results => {
            res.render('print', {
                uniwirt: JSON.parse(results[0]),
                mensa: JSON.parse(results[1]),
                hotspot: JSON.parse(results[2]),
                uniPizzeria: JSON.parse(results[3]),
                villaLido: JSON.parse(results[4])
            });
        });
});


module.exports = router;
