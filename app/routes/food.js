const express = require('express');
const router = express.Router();
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

router.get('/hotspot/:day?', function (req, res) {
    /*var day = +req.params.day;
     scraper.getHotspotPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('hotspot', timeHelper.sanitizeDay(req.params.day))
        .then(menu => res.send(menu));
});

router.get('/mensa/:day?', function (req, res) {
    /* var day = +req.params.day;
     scraper.getuniwirtMensaPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('mensa', timeHelper.sanitizeDay(req.params.day))
        .then(menu => res.send(menu));
});

router.get('/unipizzeria/:day?', function (req, res) {
    /* var day = +req.params.day;
     scraper.getMensaPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('uniPizzeria', timeHelper.sanitizeDay(req.params.day))
        .then(menu => res.send(menu));
});

router.get('/lapasta/:day?', function (req, res) {
    /* var day = +req.params.day;
     scraper.getMensaPlan(day)
     .then(result => res.json(result));*/
    res.setHeader('Content-Type', 'application/json');
    cache.getMenu('lapasta', timeHelper.sanitizeDay(req.params.day))
        .then(menu => res.send(menu));
});

router.get('/logs', function (req, res) {
    res.download('logfile.log');
});

router.get('/sync', function (req, res) {
    cache.update();
    res.send("Ok")
});

module.exports = router;
