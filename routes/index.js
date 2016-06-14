const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const cache = require('../caching/menuCache');
const timeHelper = require('../helpers/timeHelper');

router.get('/:day(\\d*)?', function (req, res, next) {
    var day = timeHelper.sanitizeDay(req.params.day);

    var uniwirtPlan = cache.getMenu('uniwirt', day);
    var mensaPlan = cache.getMenu('mensa', day);
    var mittagstischPlan = cache.getMenu('mittagstisch', day);

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