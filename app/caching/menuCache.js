/**
 * Created by Markus on 08.06.2016.
 */

'use strict';

const { Promise } = require('bluebird');
const EventEmitter = require('events');
const scraper = require('../scraping/scraper');

class MenuCache extends EventEmitter {
    initialization = Promise.resolve();

    init(cacheClient) {
        this.client = cacheClient;
        return this.initialization = this.update();
    }

    update() {
        const updates = {};

        updates.mensa = scraper.getMensaWeekPlan()
            .then(weekPlan => this._updateIfInvalid('mensa', weekPlan));

        updates.hotspot = scraper.getHotspotWeekPlan()
            .then(weekPlan => this._updateIfInvalid('hotspot', weekPlan));

        updates.uniwirt = scraper.getUniwirtWeekPlan()
            .then(weekPlan => this._updateIfInvalid('uniwirt', weekPlan));

        updates.uniPizzeria = scraper.getUniPizzeriaWeekPlan()
            .then(weekPlan => this._updateIfInvalid('uniPizzeria', weekPlan));

        updates.lapasta = scraper.getLapastaWeekPlan()
            .then(weekPlan => this._updateIfInvalid('lapasta', weekPlan));

        updates.villaLido = scraper.getVillaLidoWeekPlan()
            .then(weekPlan => this._updateIfInvalid('villaLido', weekPlan));

        updates.bitsAndBytes = scraper.getBitsAndBytesWeekPlan()
            .then(weekPlan => this._updateIfInvalid('bitsAndBytes', weekPlan));

        //updates.princs = scraper.getPrincsWeekPlan()
        //    .then(weekPlan => this._updateIfInvalid('princs', weekPlan));

        console.log('Updating caches.');

        return Promise.props(updates);
    }

    _updateIfInvalid(restaurantName, newWeekPlan) {
        var newWeekPlanJson = JSON.stringify(newWeekPlan);

        this.getMenu(restaurantName).then(cachedMenu => {
            if (cachedMenu !== newWeekPlanJson) {
                this._cacheMenu(restaurantName, newWeekPlan, newWeekPlanJson);
                this.emit(`menu:${restaurantName}`, newWeekPlanJson); //Should we emit all single menus?
                console.log(`${restaurantName} has changed the menu. -> Cache updated.`)
            }
        });
    }

    _cacheMenu(restaurantName, weekPlan, weekPlanJson) {
        this.client.set(`menu:${restaurantName}`, weekPlanJson); //Store whole weekPlan

        for (let day = 0; day < weekPlan.length; day++) {
            let key = `menu:${restaurantName}:${day}`;
            let menuJson = JSON.stringify(weekPlan[day]);
            this.client.set(key, menuJson);
        }

        return Promise.resolve();
    }

    getMenu(menuName, day) {
        var key = day != null ? `menu:${menuName}:${day}` : `menu:${menuName}`;
        return Promise.resolve(this.client.get(key));
    }
}

module.exports = new MenuCache();
