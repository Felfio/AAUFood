const express = require('express');
const router = express.Router();
const scraper = require('../scraping/scraper');

/* GET users listing. */
router.get('/uniwirt', function (req, res) {
    scraper.getUniwirtPlan()
        .then(result => res.json(result));
});

router.get('/mittagstisch', function(req, res) {
    scraper.getMittagstischPlan()
        .then(result => res.json(result));
});

router.get('/mensa', function(req, res){
    scraper.getMensaPlan()
        .then(result => res.json(result));
});

module.exports = router;
