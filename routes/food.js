const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');
const cache = require('../caching/menuCache');

/* GET users listing. */
router.get('/uniwirt/:day?', function (req, res) {
    /*var day = +req.params.day;
     scraper.getUniwirtPlan(day)
     .then(result => res.json(result));*/

    cache.getMenu('uniwirt')
        .then(menu => res.json(menu));
});

router.get('/mittagstisch/:day?', function (req, res) {
    /*var day = +req.params.day;
     scraper.getMittagstischPlan(day)
     .then(result => res.json(result));*/

    cache.getMenu('mittagstisch')
        .then(menu => res.json(menu));
});

router.get('/mensa/:day?', function (req, res) {
    /* var day = +req.params.day;
     scraper.getMensaPlan(day)
     .then(result => res.json(result));*/

    cache.getMenu('mensa')
        .then(menu => res.json(menu));
});

module.exports = router;
