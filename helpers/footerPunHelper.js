"use strict";
const config = require('../config');

var footerPuns = config.footerPuns;

var footerPunsMap = {};
for (let footerPun of footerPuns) {
    footerPunsMap[footerPun.name] = footerPun;
}

var defaultPun = getFooterPunByName(config.settings.defaultFooterPun);


function formatFooterPun(footerPun) {
    var iconLink = footerPun.iconLink || "/about";

    //We keep the template here, as template strings cannot be stored (in config e.g.) for later interpolation
    var html = `<a href="/about">${footerPun.preText}</a>
     <a href="${iconLink}">
        <i class="${footerPun.icon}" aria-hidden="true"></i></a>`;
    if (footerPun.postText) {
        html += `<a href="/about">${footerPun.postText}</a>`;
    }
    return html;
}

function getRandomFooterPun() {
    var rand = footerPuns[Math.floor(Math.random() * footerPuns.length)];
    return formatFooterPun(rand);
}

function getFooterPunByName(name) {
    var pun = footerPunsMap[name] || defaultPun;
    return formatFooterPun(pun);
}

function getFooterPun() {
    if (config.settings.useRandomFooterPuns)
        return getRandomFooterPun();
    else
        return defaultPun;
}

module.exports = {
    getRandomFooterPun: getRandomFooterPun,
    getFooterPunByName: getFooterPunByName,
    getFooterPun: getFooterPun
};