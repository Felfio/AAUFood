"use strict";
const config = require('../config');

function isOnBreak(restaurant) {
    if (restaurant == null) {
        return false;
    } else if (typeof restaurant === "string") {
        return getBreakInfo(restaurant) == null;
    } else {
        //Object is set in settings. This restaurant is on a break :)
        return true;
    }
}

function getBreakInfo(restaurant) {
    return restaurant != null ? config.onBreak[restaurant] : null;
}

module.exports = {
    getBreakInfo: getBreakInfo,
    isOnBreak: isOnBreak
};