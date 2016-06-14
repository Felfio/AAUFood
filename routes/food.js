const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');
const cache = require('../caching/menuCache');
const timeHelper = require('../helpers/timeHelper');

/* GET users listing. */
router.get('/uniwirt/:day?', function (req, res) {
    /*var day = +req.params.day;
     scraper.getUniwirtPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('uniwirt', timeHelper.sanitizeDay(req.params.day))
        .then(menu => res.send(menu));
});

router.get('/mittagstisch/:day?', function (req, res) {
    /*var day = +req.params.day;
     scraper.getMittagstischPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('mittagstisch', timeHelper.sanitizeDay(req.params.day))
        .then(menu => res.send(menu));
});

router.get('/mensa/:day?', function (req, res) {
    /* var day = +req.params.day;
     scraper.getMensaPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('mensa', timeHelper.sanitizeDay(req.params.day))
        .then(menu => res.send(menu));
});

router.get('/logs', function (req, res) {
    res.download('logfile.log');
});

module.exports = router;
