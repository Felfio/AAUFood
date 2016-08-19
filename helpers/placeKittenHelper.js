"use strict";
const config = require("../config");


function catFactHeaderUrl() {
    let randomWidth = config.externalApis.placeKittenWidth + getRandomInt(0, config.externalApis.placeKittenWidthSpan);
    return config.externalApis.placeKittenApi.replace(config.externalApis.paramKey, randomWidth);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    catFactHeaderUrl: catFactHeaderUrl
};