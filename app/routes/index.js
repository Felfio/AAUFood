const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const menuCache = require('../caching/menuCache');
const externalApis = require('../externals/externalApis');
const { getWeekErrorModel } = require('../scraping/scraperHelper');

const uniRestaurants = ['uniwirt', 'mensa', 'hotspot', 'uniPizzeria', 'villaLido', 'bitsAndBytes'];
const cityRestaurants = ['lapasta', 'princs'];

router.get('/:day(-?\\d*)?', function (req, res, next) {
    var restaurantCalls = getMenus(uniRestaurants);
    return restaurantCalls.then(results => res.render('index', results));
});

router.get('/city/:day(-?\\d*)?', function (req, res, next) {
    var restaurantCalls = getMenus(cityRestaurants);
    return restaurantCalls.then(results => res.render('cityfood', results));
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
    var restaurantCalls = getMenus(uniRestaurants);
    return restaurantCalls.then(results => res.render('print', results));
});


function getMenus(restaurants) {
    const cacheCalls = {};
    for (let restaurantName of restaurants) {
        cacheCalls[restaurantName] = menuCache.getMenu(restaurantName)
            .then(menu => menu ? JSON.parse(menu) : getWeekErrorModel())
            .catch(err => {
                console.error(err);
                return getWeekErrorModel();
            });
    }

    return Promise.props(cacheCalls);
}


module.exports = router;
