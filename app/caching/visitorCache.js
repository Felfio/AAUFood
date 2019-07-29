/**
 * Created by Markus on 22.06.2016.
 */

'use strict';

const EventEmitter = require('events');
const config = require('../config');
const overallVisitorKey = config.cache.overallVisitorKey;
const dailyVisitorKey = config.cache.dailyVisitorKey;

class VisitorCache extends EventEmitter {
    init(redisClient, io) {
        this.client = redisClient;
        this.client.setnxAsync(dailyVisitorKey, 0);
        this.io = io;
    }

    getCounters() {
        var dailyVisitors = this.client.getAsync(config.cache.dailyVisitorKey);
        var overallVisitors = this.client.getAsync(config.cache.overallVisitorKey);

        return Promise.all([dailyVisitors, overallVisitors])
            .then(results => {
                return {
                    dailyVisitors: results[0],
                    overallVisitors: results[1]
                };
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
        return this.client.incrAsync(dailyVisitorKey).then(newValue => {
            if (newValue === 1) {
                this._setExpireAtMidnight(dailyVisitorKey);
            }

            return newValue;
        });
    }

    _incrementOverallVisitors() {
        return this.client.incrAsync(overallVisitorKey);
    }

    _setExpireAtMidnight(keyName) {
        var unixTime = this._getUnixTimeMidnight();
        return this.client.pexpireatAsync(keyName, unixTime);
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