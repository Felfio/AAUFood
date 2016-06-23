/**
 * Created by Markus on 22.06.2016.
 */

'use strict';

const redis = require('redis');
const bluebird = require('bluebird');
const EventEmitter = require('events');
const config = require('../config');
const overallVisitorKey = config.cache.overallVisitorKey;
const dailyVisitorKey = config.cache.dailyVisitorKey;

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

class VisitorCache extends EventEmitter {
    init() {
        this.client = redis.createClient(config.cache.redisUrl);
        this.client.setnxAsync(dailyVisitorKey, 0)
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

    incrementCounters() {
        return Promise.all([this._incrementDailyVisitors(), this._incrementOverallVisitors()])
            .then(results => {
                return {
                    dailyVisitors: results[0],
                    overallVisitors: results[1]
                };
            });
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