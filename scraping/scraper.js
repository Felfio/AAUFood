"use strict";

const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const Food = require("../models/food");
const Menu = require("../models/menu");
const config = require('../config');
const timeHelper = require('../helpers/timeHelper');

var MensaUrl = config.scraper.mensaUrl;
var UniwirtUrl = config.scraper.uniwirtUrl;
var MittagstischUrl = config.scraper.mittagstischUrl;

function parseWeek(html, parseFunction) {
    var menus = [];
    for (let day = 0; day < 7; day++) {
        menus[day] = parseFunction(html, day);
    }

    return menus;
}

function getUniwirtWeekPlan() {
    return request.getAsync(UniwirtUrl)
        .then(res => res.body)
        .then(body => parseWeek(body, parseUniwirt));
}

function getUniwirtPlan(day) {
    return request.getAsync(UniwirtUrl)
        .then(res => res.body)
        .then(body => parseUniwirt(body, day));
}

function parseUniwirt(html, day) {
    var result = new Menu();

    var $ = cheerio.load(html);
    var dayInWeek;
    if (day === null || day === undefined) {
        dayInWeek = ((new Date()).getDay() + 6) % 7;
    } else {
        dayInWeek = day;
    }

    var $currentDayRows = $("#StandardWrapper").find(".col600 > .col360.noMargin").eq(dayInWeek).find('tr');

    $currentDayRows.each((index, item) => {
        var $tds = $(item).children();
        var name = $tds.eq(0).text();
        var price = $tds.eq(2).text();

        if (contains(name, true, ["feiertag", "ruhetag"])) {
            result.closed = true;
        } else if (!price) {
            result.starters.push(new Food(name));
        } else {
            price = +price.substring(2).replace(',', '.');
            result.mains.push(new Food(name, price));
        }
    });

    return result;
}

function getMensaWeekPlan() {
    return request.getAsync(MensaUrl)
        .then(res => res.body)
        .then(body => parseWeek(body, parseMensa));
}

function getMensaPlan(day) {
    return request.getAsync(MensaUrl)
        .then(res => res.body)
        .then(body => parseMensa(body, day));
}

function parseMensa(html, day) {
    var result = new Menu();
    var $ = cheerio.load(html);
    var dayInWeek;
    if (day === null || day === undefined) {
        dayInWeek = ((new Date()).getDay() + 6) % 7;
    } else {
        dayInWeek = day;
    }

    if (dayInWeek > 4) {
        result.closed = true;
        return result;
    }

    var $classic1 = $('.menu-item').eq(2);
    var $classic2 = $('.menu-item').eq(3);
    var $dailySpecial = $('.menu-item').eq(4);

    var currentDay1 = $classic1.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');
    var currentDay2 = $classic2.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');
    var currentDaySpecial = $dailySpecial.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');

    if (contains(currentDay1.text(), true, ["feiertag", "ruhetag"]) ||
        contains(currentDay2.text(), true, ["feiertag", "ruhetag"]) ||
        contains(currentDaySpecial.text(), true, ["feiertag", "ruhetag"])) {
        result.closed = true;
        return result;
    }

    currentDay1 = currentDay1.map((index, item) => $(item).text()).filter(isNotBlank).toArray();
    currentDay2 = currentDay2.map((index, item) => $(item).text()).filter(isNotBlank).toArray();
    currentDaySpecial = currentDaySpecial.map((index, item) => $(item).text()).filter(isNotBlank).toArray();

    result.mains = [];
    if (currentDay1.length) {
        result.mains.push(createFoodFromMenuSection($classic1, currentDay1, dayInWeek));
    }
    if (currentDay2.length) {
        result.mains.push(createFoodFromMenuSection($classic2, currentDay2, dayInWeek));
    }
    if (currentDaySpecial.length) {
        result.mains.push(createFoodFromMenuSection($dailySpecial, currentDaySpecial, dayInWeek));
    }
    return result;
}

function createFoodFromMenuSection(section, menu, dayInWeek) {
    var price = null;
    var priceArray = section.find('.menu-item-content').eq(dayInWeek).find('.menu-item-price').text().match(/€ (\S*)/);
    if (priceArray && priceArray.length) {
        price = priceArray[1];
        price = +price.replace(',', '.');
    }

    //isInfo <=> price could not get parsed (or is empty --> 0) and there is only one line of text
    var isInfo = (price == null || isNaN(price) || price === 0) && menu.length === 1;

    return new Food(menu, price, isInfo);
}

function getUniPizzeriaPlan(day) {
    return request.getAsync('http://www.uni-pizzeria.at/speisen/mittagsteller.html')
        .then(res => res.body)
        .then(body => parseUniPizzeria(body, day));
}

function parseUniPizzeria(html, day) {
    var result = new Menu();
    var $ = cheerio.load(html);
}

function getMittagstischWeekPlan() {
    return request.getAsync(MittagstischUrl)
        .then(res => res.body)
        .then(body => parseWeek(body, parseMittagstisch));
}

function getMittagstischPlan(day) {
    return request.getAsync(MittagstischUrl)
        .then(res => res.body)
        .then(body => parseMittagstisch(body, day));
}

function parseMittagstisch(body, day) {
    var foodMenu = new Menu();

    var dayInWeek;
    if (day === null || day === undefined) {
        dayInWeek = ((new Date()).getDay() + 6) % 7;
    } else {
        dayInWeek = day;
    }

    if (dayInWeek > 4) {
        foodMenu.closed = true;
        return foodMenu;
    }

    var $ = cheerio.load(body);

    var dayStates = $(".resp-tabs-list").children();
    var currentDayClosed = false;
    var closedDaysMap = {};
    var closedCnt = 0;

    //Count number of closed days before each day (so we can adjust indices by this amount
    dayStates.each((index, item) => {
        closedDaysMap["" + index] = closedCnt;

        if (item.attribs.class.indexOf("closed") > -1) {
            closedCnt++;

            if (index === dayInWeek) {
                currentDayClosed = true;
            }
        }
    });

    if (currentDayClosed) {
        foodMenu.closed = true;
        return foodMenu;
    }

    var closedDays = closedDaysMap["" + dayInWeek];

    var plans = $(".resp-tabs-container .daydata");

    //Wochentag nicht verfügbar
    if (plans.length <= dayInWeek * 2 - closedDays) {
        return foodMenu;
    }

    //Menü
    var menu = plans.eq(dayInWeek * 2 - closedDays);
    var menuRows = menu.find("tr");
    var first = menuRows.first();

    var soupRows = first.nextUntil('.free', 'tr');
    if (!first.hasClass("free")) {
        soupRows.unshift(first);
    }

    soupRows.splice(0, 1);
    soupRows.each((index, item) => {
        var name = $(item).children().first().text();
        foodMenu.starters.push(new Food(name));
    });

    //Hauptspeisen
    var mainsRows = soupRows.last().next().nextUntil('.free', 'tr');
    mainsRows.splice(0, 1);

    mainsRows.each((index, item) => {
        var name = $(item).children().first().text();
        foodMenu.mains.push(new Food(name, 7.4));
    });

    //á la carte
    var aLaCarte = plans.eq(dayInWeek * 2 + 1 - closedDays);
    var aLaCarteRows = aLaCarte.find("tr");
    first = aLaCarteRows.first();

    var aLaCartes = first.nextUntil('.free', 'tr');
    if (!first.hasClass("free") && aLaCartes.unshift) {
        aLaCartes.unshift(first);
    }

    aLaCartes.splice(0, 1);
    aLaCartes.each((index, item) => {
        var entries = $(item).children();
        var name = entries.first().text();
        var price = +entries.eq(1).text().replace(",", ".");
        foodMenu.alacarte.push(new Food(name, price));
    });


    return foodMenu;
}


function isNotBlank(index, element) {
    return element.length !== 0 && element.trim();
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

module.exports = {
    getUniwirtPlan: getUniwirtPlan,
    getUniwirtWeekPlan: getUniwirtWeekPlan,
    getMittagstischPlan: getMittagstischPlan,
    getMittagstischWeekPlan: getMittagstischWeekPlan,
    getMensaPlan: getMensaPlan,
    getMensaWeekPlan: getMensaWeekPlan
};