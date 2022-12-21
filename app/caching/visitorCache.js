/**
 * Created by Markus on 22.06.2016.
 */

'use strict';

const EventEmitter = require('events');
const config = require('../config');
const overallVisitorKey = config.cache.overallVisitorKey;
const dailyVisitorKey = config.cache.dailyVisitorKey;

class VisitorCache extends EventEmitter {
    init(cacheClient, io) {
        this.client = cacheClient;
        this.io = io;

        if (!this.client.get(dailyVisitorKey)) {
            this.client.set(dailyVisitorKey, 0);
        }
    }

    getCounters() {
        var dailyVisitors = this.client.get(config.cache.dailyVisitorKey);
        var overallVisitors = this.client.get(config.cache.overallVisitorKey);

        return Promise.resolve({
            dailyVisitors,
            overallVisitors
        });
    }

    increment(session) {
        var lastCountedVisit = session.lastCountedVisit;
        var currentDayMidnight = this._getCurrentDayMidnight();

        // If no visit is registered, or user has not visited today.
        if (!lastCountedVisit || (lastCountedVisit && (new Date(lastCountedVisit) < currentDayMidnight))) {
            session.lastCountedVisit = currentDayMidnight;
            return this._incrementCounters().then(stats => {
                this.io.emit('newVisitor', stats);
                return stats;
            });
        }
        // User already visited today.
        else {
            return this.getCounters();
        }
    }

    _incrementCounters() {
        return Promise.all([this._incrementDailyVisitors(), this._incrementOverallVisitors()])
            .then(results => {
                return {
                    dailyVisitors: results[0],
                    overallVisitors: results[1]
                };
            });
    }

    _getCurrentDayMidnight() {
        var date = new Date();
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);

        return date;
    }

    _incrementDailyVisitors() {
        let val = this.client.get(dailyVisitorKey) || 0;
        this.client.set(dailyVisitorKey, ++val);

        if (val === 1) {
            this._setExpireAtMidnight(dailyVisitorKey);
        }

        return Promise.resolve(val);
    }

    _incrementOverallVisitors() {
        let val = this.client.get(overallVisitorKey) || 0;
        this.client.set(overallVisitorKey, ++val);
        return Promise.resolve(val);
    }

    _setExpireAtMidnight(keyName) {
        // TODO
        //var unixTime = this._getUnixTimeMidnight();
        //return this.client.pexpireatAsync(keyName, unixTime);
    }

    _getUnixTimeMidnight() {
        var newDate = new Date();
        newDate.setDate(newDate.getDate() + 1);
        newDate.setHours(0);
        newDate.setMinutes(0);
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);

        return newDate.getTime();
    }
}

module.exports = new VisitorCache();