const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');

/* GET users listing. */
router.get('/uniwirt', function(req, res, next) {
    scraper.downloadUniwirt()
        .then(body => res.send(body));
});

module.exports = router;
