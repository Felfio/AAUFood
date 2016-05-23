const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');
const Promise = require("bluebird");


router.get('/', function (req, res, next) {
    var uniwirtPlan = scraper.getUniwirtPlan();
    var mensaPlan = scraper.getMensaPlan();
    var mittagstischPlan = scraper.getMensaPlan();

    Promise.all([uniwirtPlan, mensaPlan, mittagstischPlan])
        .then(results => {
            res.render('index', {uniwirt: results[0], mensa: results[1], mittagstisch: results[2]});
        });
});

module.exports = router;