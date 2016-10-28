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
var PizzeriaUrl = config.scraper.unipizzeriaUrl;

function parseWeek(input, parseFunction) {
    var menus = [];
    for (let day = 0; day < 7; day++) {
        menus[day] = parseFunction(input, day);
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

    if ($("#StandardWrapper").find(".col600 > .col360.noMargin > h3").html().indexOf(timeHelper.getMondayDate()) == -1) {
        result.outdated = true;
        return result;
    }

    var $currentDayRows = $("#StandardWrapper").find(".col600 > .col360.noMargin").eq(dayInWeek).find('tr');

    $currentDayRows.each((index, item) => {
        var $tds = $(item).children();
        var name = $tds.eq(0).text();
        name = sanitizeName(name);
        var price = $tds.eq(2).text();

        if (contains(name, true, ["feiertag", "ruhetag", "wir machen pause"])) {
            result.closed = true;
        } else if (!price) {
            result.starters.push(new Food(name));
        } else {
            price = +price.substring(2).replace(',', '.');
            result.mains.push(new Food(name, price));
        }
    });

    return setErrorOnEmpty(result);
}

function getMensaWeekPlan() {
    return request.getAsync(MensaUrl)
        .then(res => res.body)
        .then(body => parseMensa(body));
}

function parseMensa(html) {
    var result = new Array(7);

    let closedMenu = new Menu();
    closedMenu.closed = true;
    result[5] = result[6] = closedMenu;

    var $ = cheerio.load(html);

    let $weekDates = $('#days').find('.date');
    if ($weekDates.text().indexOf(timeHelper.getMondayDate()) == -1) {
        for (let i = 0; i < 5; i++) {
            let outdatedMenu = new Menu();
            outdatedMenu.outDated = true;
            result[i] = outdatedMenu;
        }
        return result;
    }


    //Get days
    let days = $("#days").find(".day");
    for (let dayInWeek = 0; dayInWeek < 5; dayInWeek++) {
        let menu = new Menu();
        result[dayInWeek] = menu;

        let day = days.eq(dayInWeek);

        //Check if closed
        let firstContentText = day.find(".category-content").eq(0).text();
        if (contains(firstContentText, true, ["geschlossen", "feiertag", "ruhetag"])) {
            menu.closed = true;
            continue;
        }

        let classic1Category = day.find('#category133');
        let classic2Category = day.find('#category134');
        let dailySpecialCategory = day.find('#category247');

        try {
            let classic1Food = createFoodFromMensaCategory(classic1Category);
            menu.mains.push(classic1Food);

            let classic2Food = createFoodFromMensaCategory(classic2Category);
            menu.mains.push(classic2Food);

            let dailySpecialFood = createFoodFromMensaCategory(dailySpecialCategory);
            menu.mains.push(dailySpecialFood);
        } catch (ex) {
            //Do not log error, as it is most likely to be a parsing error, which we do not want to fill the log file
            menu.error = true;
        }

        //Just to be sure
        setErrorOnEmpty(menu);
    }
    return result;
}

function createFoodFromMensaCategory(category) {
    let categoryContent = category.find(".category-content");

    let meals = categoryContent.find("p").eq(0);
    meals.find("br").replaceWith(' ');

    //Names
    let foodNames = [];

    //Check Soup
    let contents = meals.contents();
    if (!contents.eq(0).is("strong")) {
        //WE HAVE A SUPPE
        foodNames.push(sanitizeName(contents.eq(0).text()));
        contents = contents.slice(1);
    }

    foodNames.push(sanitizeName(contents.text()));

    //Price
    let priceTag = categoryContent.find("p").eq(1);
    let match = priceTag.text().match(/€\s[0-9](,|.)[0-9]+/);

    let priceStr = null;
    if (match != null && match.length > 0) {
        priceStr = match[0].match(/[0-9]+(,|.)[0-9]+/)[0].replace(',', '.');
    }

    let price = +priceStr;
    //isInfo <=> price could not get parsed (or is empty --> 0) and there is only one line of text in .category-content
    var isInfo = (price === 0 || isNaN(price)) && categoryContent.children().length === 1;

    return new Food(foodNames, price, isInfo);
}

function getUniPizzeriaWeekPlan() {
    return request.getAsync(PizzeriaUrl)
        .then(res => res.body)
        .then(body => parseWeek(parseUniPizzeria(body), getUniPizzeriaDayPlan));
}

function getUniPizzeriaPlan(day) {
    return request.getAsync(PizzeriaUrl)
        .then(res => res.body)
        .then(body => {
            var weekMenu = parseUniPizzeria(body);
            return getUniPizzeriaDayPlan(weekMenu, day);
        });
}

function getUniPizzeriaDayPlan(weekMenu, day) {
    var dayInWeek;
    if (day === null || day === undefined) {
        dayInWeek = ((new Date()).getDay() + 6) % 7;
    } else {
        dayInWeek = day;
    }

    var menu = new Menu();

    if (weekMenu.outdated) {
        menu.outdated = true;
        return menu;
    }

    if (dayInWeek > 4) {
        let info = new Food("Kein Mittagsmenü.", null, true);
        menu.mains.push(info);
    } else if (dayInWeek < weekMenu.mains.length) {
        let combinedFood = weekMenu.mains[dayInWeek];

        //Handle holidays (no menu)
        if (contains(combinedFood.name, true, ["feiertag"])) {
            let info = new Food("Kein Mittagsmenü.", null, true);
            menu.mains.push(info);
        } else {

            let splitted = combinedFood.name.split("<br>");
            let starterExists = splitted.length > 1;

            if (starterExists) {
                //There is a starter
                let name = sanitizeName(splitted[0]);
                let starter = new Food(name);
                menu.starters.push(starter);
            }

            let i = starterExists ? 1 : 0;
            for (; i < splitted.length; i++) {
                let name = sanitizeName(splitted[i]);
                let main = new Food(name, combinedFood.price);
                menu.mains.push(main);
            }
        }
    }

    return setErrorOnEmpty(menu);
}

function parseUniPizzeria(html) {

    var result = new Menu();

    var $ = cheerio.load(html);
    var _days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'je Mittagsteller € 7,80'];
    var _uniPizzeriaPrice = 7.80;

    var $menuContent = $('[itemprop="articleBody"]');

    if ($menuContent.find('p > strong').text().indexOf(timeHelper.getMondayDate()) == -1) {
        result.outdated = true;
        return result;
    }

    var currentFood = null;
    $menuContent.find('p').each((index, item) => {

        var content = $(item).text().trim();

        // When the content of <p> is a weekday, start new food
        if (_checkWeekday(content)) {
            if (currentFood != null) {
                result.mains.push(currentFood);
            }
            currentFood = new Food("", _uniPizzeriaPrice);
        }
        if (currentFood != null) {
            currentFood.name += _normalizeFood(content);
        }

    });

    if (currentFood != null && currentFood.name.length > 0) {
        result.mains.push(currentFood);
    }
    return setErrorOnEmpty(result);

    function _replaceWeekday(str) {
        for (var index in _days) {
            str = str.replace(_days[index], "");
        }
        return str;
    }

    function _checkWeekday(str) {
        var weekday = false;
        for (var index in _days) {
            if (str.indexOf(_days[index]) >= 0) {
                weekday = true;
            }
        }
        return weekday;
    }

    function _normalizeFood(str) {

        str = _replaceWeekday(str);
        str = str.replace(/\*+/, '<br>');

        return str;
    }

}

function getMittagstischWeekPlan() {
    return request.getAsync(MittagstischUrl)
        .then(res => res.body)
        .then(body => parseMittagstisch(body));
}

function parseMittagstisch(html) {
    var result = new Array(7);

    let closedMenu = new Menu();
    closedMenu.closed = true;
    result[5] = result[6] = closedMenu;

    var $ = cheerio.load(html);

    var weekIsOutdated = $('.companyinfo').text().indexOf(timeHelper.getMondayDate()) == -1;

    //Get container divs for single days
    let days = $(".resp-tabs-container > div");

    for (let dayInWeek = 0; dayInWeek < 5; dayInWeek++) {
        let dayMenu = new Menu();
        result[dayInWeek] = dayMenu;

        let dayDatas = days.eq(dayInWeek).find(".daydata");

        //Check if current day is closed
        let isClosed = false;

        for (let d = 0; d < dayDatas.length; d++) {
            let dayData = dayDatas.eq(d);

            if (dayData.hasClass("closed"))
                isClosed = true;
            else if (contains(dayData.text(), true, ["geschlossen", "feiertag", "ruhetag"]))
                isClosed = true;

            if (isClosed)
                break;
        }

        if (isClosed) {
            dayMenu.closed = true;
            continue;
        }

        try {
            parseMittagstischDayMenu(dayDatas, dayMenu);
            //Just to be sure
            setErrorOnEmpty(dayMenu);

            if (!dayMenu.error && weekIsOutdated)
                dayMenu.outdated = true;
        } catch (ex) {
            //Do not log parsing errors. They will simply fill the log
            dayMenu.error = true;
        }
    }

    return result;
}

function parseMittagstischDayMenu(dayDatas, dayMenu) {
    var menu = dayDatas.eq(0);
    var menuRows = menu.find("tr");
    var first = menuRows.first();

    var soupRows = first.nextUntil('.free', 'tr');
    if (!first.hasClass("free")) {
        soupRows.unshift(first);
    }

    soupRows.splice(0, 1);
    for (let s = 0; s < soupRows.length; s++) {
        let soupRow = soupRows.eq(s);
        let name = soupRow.children().first().text();
        name = sanitizeName(name);
        dayMenu.starters.push(new Food(name));
    }

    //Hauptspeisen
    var mainsRows = soupRows.last().next().nextUntil('.free', 'tr');
    mainsRows.splice(0, 1);

    for (let m = 0; m < mainsRows.length; m++) {
        let mainsRow = mainsRows.eq(m);
        let name = mainsRow.children().first().text();
        name = sanitizeName(name);
        dayMenu.mains.push(new Food(name, 7.4));
    }

    //á la carte
    if (dayDatas.length > 1) {
        var aLaCarte = dayDatas.eq(1);

        let aLaCarteRows = aLaCarte.find("tr");
        first = aLaCarteRows.first();
        var aLaCartes = first.nextUntil('.free', 'tr');

        if (!first.hasClass("free") && aLaCartes.unshift) {
            aLaCartes.unshift(first);
        }

        aLaCartes.splice(0, 1);

        for (let a = 0; a < aLaCartes.length; a++) {
            let entries = aLaCartes.eq(a).children();
            let name = entries.first().text();
            name = sanitizeName(name);
            let price = +entries.eq(1).text().replace(",", ".");
            dayMenu.alacarte.push(new Food(name, price));
        }
    }
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

function setErrorOnEmpty(menu) {
    if (!(menu.starters.length || menu.mains.length || menu.alacarte.length)) {
        menu.error = true;
    }
    return menu;
}

function sanitizeName(val) {
    if (typeof val === "string") {
        val = val.replace(/€\s[0-9](,|.)[0-9]+/, ""); // Replace '€ 00.00'
        val = val.replace(/^[1-9].\s/, ""); // Replace '1. ', '2. '
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

module.exports = {
    getUniwirtPlan: getUniwirtPlan,
    getUniwirtWeekPlan: getUniwirtWeekPlan,
    getMittagstischWeekPlan: getMittagstischWeekPlan,
    getMensaWeekPlan: getMensaWeekPlan,
    getUniPizzeriaPlan: getUniPizzeriaPlan,
    getUniPizzeriaWeekPlan: getUniPizzeriaWeekPlan
};
