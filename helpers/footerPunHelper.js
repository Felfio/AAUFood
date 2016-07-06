"use strict";
const config = require('../config');

var footerPuns = config.footerPuns;
var defaultPun = config.footerPuns[0];

var footerPunsMap = {};
for (let footerPun of footerPuns) {
    footerPunsMap[footerPun.name] = footerPun;
}

function formatFooterPun(footerPun) {
    var iconLink = footerPun.iconLink || "/about";

    //We keep the template here, as template strings cannot be stored (in config e.g.) for later interpolation
    var html = `<a href="/about">${footerPun.preText}</a>
     <a href="${iconLink}">
        <i class="fa ${footerPun.icon}" aria-hidden="true"></i>`;
    if (footerPun.postText) {
        html += `<a href="/about">${footerPun.postText}</a>`;
    }
    return html;
}

function getRandomFooterPun() {
    var rand = footerPuns[Math.floor(Math.random() * footerPuns.length)];
    return formatFooterPun(rand);
}

function getFooterPun(name) {
    var pun = footerPunsMap[name] || defaultPun;
    return formatFooterPun(pun);
}

module.exports = {
    getRandomFooterPun: getRandomFooterPun,
    getFooterPun: getFooterPun
};