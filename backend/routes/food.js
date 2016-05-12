const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');

router.get('/uniwirt', function(req, res, next) {
    scraper.downloadUniwirt()
        .then(body => res.send(body));
});

router.get('/mittagstisch', function(req, res, next) {
    scraper.downloadMittagstisch()
        .then(body => res.send(body));
});

module.exports = router;
