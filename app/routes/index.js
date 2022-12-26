const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const menuCache = require('../caching/menuCache');
const externalApis = require('../externals/externalApis');

router.get('/:day(-?\\d*)?', function (req, res, next) {
    var uniwirtPlan = menuCache.getMenu('uniwirt');
    var mensaPlan = menuCache.getMenu('mensa');
    var hotspotPlan = menuCache.getMenu('hotspot');
    var unipizzeriaPlan = menuCache.getMenu('uniPizzeria');
    var villaLidoPlan = menuCache.getMenu('villaLido');
    var bitsAndBytesPlan = menuCache.getMenu('bitsAndBytes');

    Promise.all([uniwirtPlan, mensaPlan, hotspotPlan, unipizzeriaPlan, villaLidoPlan, bitsAndBytesPlan])
        .then(results => {
            let [uniwirt, mensa, hotspot, uniPizzeria, villaLido, bitsAndBytes] = results.map(res => {
                try {
                    return JSON.parse(res);
                } catch (e) {
                    return [];
                }
            });

            res.render('index', {
                uniwirt,
                mensa,
                hotspot,
                uniPizzeria,
                villaLido,
                bitsAndBytes,
            });
        });
});

router.get('/city/:day(-?\\d*)?', function (req, res, next) {
    var lapastaPlan = menuCache.getMenu('lapasta');
    var princsPlan = menuCache.getMenu('princs');

    Promise.all([lapastaPlan, princsPlan])
        .then(results => {
            res.render('cityfood', {
                lapasta: JSON.parse(results[0]) || [],
                princs: JSON.parse(results[1]) || [],
            });
        });
});

router.get('/about', function (req, res, next) {
    var catFact = externalApis.getCatFact();

    return catFact.then(catFact => {
        res.render('about', {
            catFact,
        });
    });
});
router.get('/print', function (req, res, next) {
    var uniwirtPlan = menuCache.getMenu('uniwirt');
    var mensaPlan = menuCache.getMenu('mensa');
    var hotspotPlan = menuCache.getMenu('hotspot');
    var unipizzeriaPlan = menuCache.getMenu('uniPizzeria');
    var villaLidoPlan = menuCache.getMenu('villaLido');
    var bitsAndBytesPlan = menuCache.getMenu('bitsAndBytes');

    Promise.all([uniwirtPlan, mensaPlan, hotspotPlan, unipizzeriaPlan, villaLidoPlan, bitsAndBytesPlan])
        .then(results => {
            res.render('print', {
                uniwirt: JSON.parse(results[0]),
                mensa: JSON.parse(results[1]),
                hotspot: JSON.parse(results[2]),
                uniPizzeria: JSON.parse(results[3]),
                villaLido: JSON.parse(results[4]),
                bitsAndBytes: JSON.parse(results[5])
            });
        });
});


module.exports = router;
