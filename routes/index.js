const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const cache = require('../caching/menuCache');

router.get('/', function (req, res, next) {
    var uniwirtPlan = cache.getMenu('uniwirt');
    var mensaPlan = cache.getMenu('mensa');
    var mittagstischPlan = cache.getMenu('mittagstisch');

    Promise.all([uniwirtPlan, mensaPlan, mittagstischPlan])
        .then(results => {
            res.render('index', {
                uniwirt: JSON.parse(results[0]),
                mensa: JSON.parse(results[1]),
                mittagstisch: JSON.parse(results[2])
            });
        });
});

router.get('/about', function (req, res, next) {
    res.render('about');
});

module.exports = router;