const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');

/* GET users listing. */
router.get('/uniwirt/:day?', function (req, res) {
    var day = +req.params.day;
    scraper.getUniwirtPlan(day)
        .then(result => res.json(result));
});

router.get('/mittagstisch/:day?', function (req, res) {
    var day = +req.params.day;
    scraper.getMittagstischPlan(day)
        .then(result => res.json(result));
});

router.get('/mensa/:day?', function (req, res) {
    var day = +req.params.day;
    scraper.getMensaPlan(day)
        .then(result => res.json(result));
});

module.exports = router;
