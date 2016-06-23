const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const menuCache = require('../caching/menuCache');
const visitorCache = require('../caching/visitorCache');
const timeHelper = require('../helpers/timeHelper');
const counter = require('../middleware/visitorCounter')

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
                visitorStats: req.visitorStats
            });
        });
});

router.get('/about', counter.countVisitors, function (req, res, next) {
    res.render('about');
});

module.exports = router;