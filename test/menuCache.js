'use strict';

const chai = require('chai');
const expect = chai.expect;
const Menu = require('../models/menu');
const Food = require('../models/food');
const config = require('../config');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const redisClient = redis.createClient(config.cache.redisUrl);
const cache = require('../caching/menuCache');

describe('MenuCache', function () {
    before('Initialze Cache', function () {
        cache.init(redisClient);
    });

    describe('#getMenu()', function () {
        var menus = [];

        before('Store menu in cache', function () {
            for (let i = 0; i < 7; i++) {
                let menu = new Menu();
                menu.starters = [new Food(`Food${i}`)];
                menu.mains = [new Food(`Food${i}`, i + 1)];
                menus.push(menu);
            }

            return cache._cacheMenu('restaurant1', menus, JSON.stringify(menus));
        });

        after('Delete menu from cache', function () {
            var keysToDelete = ['menu:restaurant1'];

            for (let i = 0; i < menus.length; i++) {
                keysToDelete.push(`menu:restaurant1:${i}`);
            }

            return cache.client.delAsync(keysToDelete).then(result => {
                expect(result).to.equal(keysToDelete.length);
            });
        });

        it('should get "menu:${menuName}" if only "menuName" is passed.', function () {
            return cache.getMenu('restaurant1').then(cachedMenus => {
                expect(cachedMenus).to.be.equal(JSON.stringify(menus));
            });
        });

        it('should get "menu:${menuName}:${day}" if "menuName" and "day" is passed.', function () {
            return cache.getMenu('restaurant1', 0).then(cachedMenu => {
                expect(cachedMenu).to.be.equal(JSON.stringify(menus[0]));
            });
        });
    });
});
