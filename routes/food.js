const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');
const cache = require('../caching/menuCache');

/* GET users listing. */
router.get('/uniwirt/:day?', function (req, res) {
    /*var day = +req.params.day;
     scraper.getUniwirtPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('uniwirt', getDay(req))
        .then(menu => res.send(menu));
});

router.get('/mittagstisch/:day?', function (req, res) {
    /*var day = +req.params.day;
     scraper.getMittagstischPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('mittagstisch', getDay(req))
        .then(menu => res.send(menu));
});

router.get('/mensa/:day?', function (req, res) {
    /* var day = +req.params.day;
     scraper.getMensaPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('mensa', getDay(req))
        .then(menu => res.send(menu));
});

router.get('/logs', function (req, res) {
    res.download('logfile.log');
});

function getDay(req) {
    var day = req.params.day;
    if (!day || isNaN(day)) {
        return ((new Date()).getDay() + 6) % 7;
    } else {
        return Number(day) % 7;
    }
}

module.exports = router;
