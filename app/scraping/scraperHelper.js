"use strict";
const moment = require('moment');
const Menu = require("../models/menu");

function setErrorOnEmpty(menu) {
    if (!menu.closed && !menu.noMenu && (menu.starters.length + menu.mains.length + menu.alacarte.length === 0)) {
        menu.error = true;
    }
    return menu;
}

function invalidateMenus(weekPlan) {
    for (let i = 0; i < 6; i++) {
        let outdatedMenu = new Menu();
        outdatedMenu.outdated = true;
        weekPlan[i] = outdatedMenu;
    }
    return weekPlan;
}

function sanitizeName(val) {
    if (typeof val === "string") {
        val = val.replace(/  +/g, " "); // multiple spaces to one
        val = val.replace(/€?\s[0-9]+(,|.)[0-9]+/, ""); // Replace '€ 00.00'
        val = val.replace(/^[1-9].\s/, ""); // Replace '1. ', '2. '
        val = val.replace(/^[1-9]./, ""); // Replace '1.', '2.'
        val = val.replace(/^[,\.\-\\\? ]+/, "");
        val = val.replace(/[,\.\-\\\? ]+$/, "");
        return val.trim();
    } else if (typeof val === "object" && val.length > 0) {
        for (let i = 0; i < val.length; i++) {
            val[i] = sanitizeName(val[i]);
        }
        return val;
    } else {
        return val;
    }
}

function decapitalize(string) {
    const exceptionList = ["in", "an", "mit", "und"]; //words that should not be capitalized
    const seperators = [" ", "\"", "-"]; //seperators, make sure to keep "-" at end (different semantics)
    var regex = new RegExp("[" + seperators.join("") + "]", "g")
    // split string and captialize words
    let words = string.split(regex);
    words.forEach(function callback(element, index, array) {
        if (!exceptionList.includes(element))
            array[index] = capitalizeFirstLetter(element);
    })
    let returnstring = words.join(" ");

    // interweave with old string to insert correct special characters
    let i = string.length;
    while (i--) {
        if (string.charAt(i).match(regex))
            returnstring = returnstring.substr(0, i) + string.charAt(i) + returnstring.substr(i + 1);
    }
    return returnstring;
}

function capitalizeFirstLetter(string, delim, exceptionList) {
    if (string !== "" && string !== null) {
        let retstring = string.toLowerCase();
        retstring = retstring[0].toUpperCase() + retstring.substr(1);
        return retstring;
    } else {
        return "";
    }
}

const priceRegex = /(\d+[,\.]?\d*)/
function parsePrice(str) {
    if (!str) {
        return null;
    }

    let match = priceRegex.exec(str);
    if (match) {
        return +match[0].replace(',', '.');
    } else {
        return null;
    }
}

function stripHtml(str) {
    if (!str) {
        return str;
    }

    return str.replace(/<\/?[^>]+(>|$)/g, "");
}

function contains(str, ignoreCase, searches) {
    if (!str)
        return false;
    if (ignoreCase) {
        str = str.toLowerCase();
    }

    for (var i = 0; i < searches.length; i++) {
        var search = ignoreCase ? searches[i].toLowerCase() : searches[i];
        if (str.includes(search)) {
            return true;
        }
    }
    return false;
}

function isInCurrentWeek(date) {
    return date != null ? moment().isSame(date, "isoweek") : false;
}

function findKW(str) {
    let match = str.match(/KW\s*(\d{1,2})$/);
    if (!match) { return null; }
    return match[1];
}

function isCurrentKW(kw) {
    return kw != null ? moment().week() == kw : false;
}

function findDate(str) {
    let match = str.match(/(\d{1,2}\.\d{1,2})/);
    if (!match) {
        return null;
    }

    let dateStr = match[1].replace(/(^|[^\d])0(\d)/g, "$1$2");
    return moment(dateStr, "D.M.YYYY")
}

function getWeekErrorModel() {
    return new Array(7).fill(1).map(() => {
        let m = new Menu();
        m.error = true;
        return m;
    });
}

module.exports = {
    setErrorOnEmpty,
    invalidateMenus,
    sanitizeName,
    capitalizeFirstLetter,
    decapitalize,
    parsePrice,
    stripHtml,
    contains,
    isInCurrentWeek,
    isCurrentKW,
    findKW,
    findDate,
    getWeekErrorModel,
};
