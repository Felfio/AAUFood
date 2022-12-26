const express = require('express');
const router = express.Router();
const Promise = require("bluebird");
const menuCache = require('../caching/menuCache');
const externalApis = require('../externals/externalApis');
const { getWeekErrorModel } = require('../scraping/scraperHelper');
const config = require('../config');
const { waitUntilMenuCacheIsInitialized } = require('../middleware/waitUntilMenuCacheIsInitialized');

router.get('/:day(-?\\d*)?', waitUntilMenuCacheIsInitialized, function (req, res, next) {
    var restaurantCalls = getMenus(config.restaurants.uni);
    return restaurantCalls.then(results => res.render('index', results));
});

router.get('/city/:day(-?\\d*)?', waitUntilMenuCacheIsInitialized, function (req, res, next) {
    var restaurantCalls = getMenus(config.restaurants.city);
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
router.get('/print', waitUntilMenuCacheIsInitialized, function (req, res, next) {
    var restaurantCalls = getMenus(config.restaurants.uni);
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
