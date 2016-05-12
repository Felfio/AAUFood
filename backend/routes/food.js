const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');

/* GET users listing. */
router.get('/uniwirt', function (req, res) {
    scraper.getUniwirtPlan()
        .then(result => res.json(result));
});

module.exports = router;
