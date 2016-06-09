/**
 * Created by Markus on 08.06.2016.
 */

'use srtrict';

const redis = require('redis');
const bluebird = require('bluebird');
const EventEmitter = require('events');
const config = require('../config');
const scraper = require('../scraping/scraper');
const winston = require('winston');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

class MenuCache extends EventEmitter {
    init() {
        this.client = redis.createClient(config.cache.redisUrl);
        this.update();
        winston.info('Initialized Logger.');
    }

    update() {
        scraper.getMensaPlan()
            .then(menu => this._updateIfInvalid('mensa', menu));

        scraper.getMittagstischPlan()
            .then(menu => this._updateIfInvalid('mittagstisch', menu));

        scraper.getUniwirtPlan()
            .then(menu => this._updateIfInvalid('uniwirt', menu));

        winston.info('Updating caches.');
    }

    _updateIfInvalid(menuName, newMenu) {
        var newMenuJson = JSON.stringify(newMenu);

        this.getMenu(menuName).then(cachedMenu => {
            if (cachedMenu !== newMenuJson) {
                this._cacheMenu(menuName, newMenuJson);
                this.emit(`menu:${menuName}`, newMenuJson);
                winston.info(`${menuName} has changed the menu. -> Cache updated.`)
            }
        });
    }

    _cacheMenu(menuName, menuJson) {
        return this.client.setAsync(`menu:${menuName}`, menuJson);
    }

    getMenu(menuName) {
        return this.client.getAsync(`menu:${menuName}`);
    }
}

module.exports = new MenuCache();