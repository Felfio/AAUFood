"use strict";

const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const PDFJS = require("pdfjs-dist");
global.XMLHttpRequest = require('xhr2');
const moment = require('moment');
const Food = require("../models/food");
const Menu = require("../models/menu");
const config = require('../config');
const timeHelper = require('../helpers/timeHelper');

const laPastaScraper = require('./lapasta-scraper');

var MensaUrl = config.scraper.mensaUrl;
var UniwirtUrl = config.scraper.uniwirtUrl;
var MittagstischUrl = config.scraper.mittagstischUrl;
var PizzeriaUrl = config.scraper.unipizzeriaUrl;
let PrincsUrl = config.scraper.princsUrl;

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
        .then(body => parseUniwirt(body));
}

function parseUniwirt(html) {
    var weekPlan = new Array(7);

    //Set Sunday closed
    let closedMenu = new Menu();
    closedMenu.closed = true;
    weekPlan[6] = closedMenu;

    var $ = cheerio.load(html);

    var dayEntries = $("#mittag").find(".vc_col-sm-2 .hgr-content-tb");

    //Get Monday Date
    let mondayDate = moment(dayEntries.first().find("p").first().text(), "DD.MM.YY");
    if (mondayDate.isValid() && mondayDate.format("D.M") !== timeHelper.getMondayDate()) {
        for (let i = 0; i < 6; i++) {
            let outdatedMenu = new Menu();
            outdatedMenu.outdated = true;
            weekPlan[i] = outdatedMenu;
        }
        return weekPlan;
    }

    for (let dayInWeek = 0; dayInWeek < 6; dayInWeek++) {
        var dayEntry = dayEntries.eq(dayInWeek);
        try {
            weekPlan[dayInWeek] = createUniwirtDayMenu(dayEntry);
        } catch (ex) {
            let errorMenu = new Menu();
            errorMenu.error = true;
            weekPlan[dayInWeek] = errorMenu;
        }
    }

    return weekPlan
}

function createUniwirtDayMenu(dayEntry) {
    var dayMenu = new Menu();
    var paragraphs = dayEntry.find("p");
    //Omit first <p> as it is the date
    paragraphs = paragraphs.slice(1, paragraphs.length);

    if (paragraphs.length === 1) {
        //Special cases
        let pText = paragraphs.text();
        if (contains(pText, true, ["feiertag", "ruhetag", "wir machen pause", "wir haben geschlossen", "closed"])) {
            dayMenu.closed = true;
        } else if (contains(pText, true, ["Empfehlung"])) {
            dayMenu.noMenu = true;
        } else {
            let info = new Food(pText, null, true);
            dayMenu.mains.push(info);
        }
    } else {
        for (let i = 0; i < paragraphs.length; i++) {
            let pEntry = paragraphs.eq(i);

            let text = pEntry.text().trim();
            let name = sanitizeName(text);

            let price = text.match(/\d+[\.\,]\d+$/);
            price = price ? +(price[0].replace(',', '.')) : null;

            let food = new Food(name, price);

            //If it has a price, it is a main course, otherwise a starter
            if (price)
                dayMenu.mains.push(food);
            else
                dayMenu.starters.push(food);
        }
    }

    return setErrorOnEmpty(dayMenu);
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
    let mondayDate = moment($weekDates.first().text(), "DD.MM.YY");
    if (mondayDate.isValid() && mondayDate.format("D.M") !== timeHelper.getMondayDate()) {
        for (let i = 0; i < 5; i++) {
            let outdatedMenu = new Menu();
            outdatedMenu.outdated = true;
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
        let AAUSpecialCategory = day.find('#category132');

        try {
            let dailySpecialFood = createFoodFromMensaCategory(dailySpecialCategory);
            menu.mains.push(dailySpecialFood);

            let classic1Food = createFoodFromMensaCategory(classic1Category);
            menu.mains.push(classic1Food);

            let classic2Food = createFoodFromMensaCategory(classic2Category);
            menu.mains.push(classic2Food);

            let AAUSpecialFood = createFoodFromMensaAAUSpecialCategory(AAUSpecialCategory, dayInWeek);
            if (AAUSpecialFood != null){
                menu.mains.push(AAUSpecialFood);
            }
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

    // ugly bugfix, courtesy of behackl
    if (categoryContent.find("p").length > 2) {
        let allContent = categoryContent.find("p")
        for (var i = 0; i < allContent.length - 1; i++) {
            foodNames.push(sanitizeName(allContent.eq(i).text()));
        }
    }
    else {
        //Check Soup
        let contents = meals.contents();
        if (!contents.eq(0).is("strong")) {
            //WE HAVE A SUPPE
            foodNames.push(sanitizeName(contents.eq(0).text()));
            contents = contents.slice(1);
        }

        foodNames.push(sanitizeName(contents.text()));
    }

    //Price //more ugly bugfix
    let priceTag = categoryContent.find("p").eq(categoryContent.find("p").length - 1);
    let match = priceTag.text().match(/(€|e|E)[\s]+[0-9](,|\.)[0-9]+/);

    let priceStr = null;
    if (match != null && match.length > 0) {
        priceStr = match[0].match(/[0-9]+(,|\.)[0-9]+/)[0].replace(',', '.');
    }

    let price = +priceStr;
    //isInfo <=> price could not get parsed (or is empty --> 0) and there is only one line of text in .category-content
    var isInfo = (price === 0 || isNaN(price)) && categoryContent.children().length === 1;

    return new Food(foodNames, price, isInfo);
}

function createFoodFromMensaAAUSpecialCategory(category, currentDay) {
    let dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    let currentDayName = dayNames[currentDay];
    let categoryContent = category.find(".category-content");

    let meal = categoryContent.find(`p:contains(${currentDayName})`).text();
    if (meal.length === 0){
        return null;
    } else {
        meal = meal.split(":")[1].trim();
    }
    let foodNames = [meal];

    //Price
    let priceTag = categoryContent.find("p").eq(categoryContent.find("p").length - 1);
    let match = categoryContent.text().match(/(€|e|E)[\s]+[0-9](,|\.)[0-9]+/);

    let priceStr = null;
    if (match != null && match.length > 0) {
        priceStr = match[0].match(/[0-9]+(,|\.)[0-9]+/)[0].replace(',', '.');
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
        menu.noMenu = true;
    } else if (dayInWeek < weekMenu.mains.length) {
        let combinedFood = weekMenu.mains[dayInWeek];

        //Handle holidays (no menu)
        if (contains(combinedFood.name, true, ["feiertag"])) {
            menu.noMenu = true;
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
    var _days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'je Mittagsteller € 7,90'];
    var _uniPizzeriaPrice = 7.90;

    var $menuContent = $('[itemprop="articleBody"]');

    if (! timeHelper.checkInputForCurrentWeek($menuContent.find('p > strong').text())) {
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
            else if (contains(dayData.text(), true, ["geschlossen", "feiertag", "ruhetag", "ostermontag"]))
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
    //Remove "Hauptspeise" Info, but only if there is more then one entry and the price info does not hold a price
    if (mainsRows.length > 1 && mainsRows.eq(0).children().eq(1).text().search(/[0-9](,|.)?[0-9]*/) == -1)
        mainsRows.splice(0, 1);

    for (let m = 0; m < mainsRows.length; m++) {
        let mainsRow = mainsRows.eq(m);
        let name = mainsRow.children().first().text();
        name = sanitizeName(name);
        let price = (+mainsRow.children().eq(1).text().replace(",", ".")) || 8.0;
        dayMenu.mains.push(new Food(name, price));
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

function getPrincsWeekPlan() {
    return request.getAsync(PrincsUrl)
        .then(res => res.body)
        .then(function(body) {
            let $ = cheerio.load(body);
            let pdfurl = PrincsUrl + $("a:contains('WOCHENKARTE')").attr('href');
            return PDFJS.getDocument(pdfurl).then(
                pdf => pdf.getPage(1).then(
                    page => page.getTextContent().then(
                        textContent => parsePrincsPDFContent(textContent)
                    )
                )
            );
        });
}

function parsePrincsPDFContent(content) {
    let result = new Array(7);

    let closedMenu = new Menu();
    closedMenu.closed = true;
    result[5] = result[6] = closedMenu;

    let contentString = "";
    content.items.forEach(itm => contentString += itm.str + (itm.str == ' ' ? '\n' : ''));

    let pos = ["MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "WOCHENMENÜ"]
                .map(day => contentString.indexOf(day));
    for (let i = 0; i<5; i++) {
        result[i] = parsePrinceDayMenu(contentString.slice(pos[i], pos[i+1]));
    }

    return result;
}

function parsePrinceDayMenu(menuString) {
    let dayMenu = new Menu();
    if (menuString.toLowerCase().indexOf("feiertag") > -1) {
        dayMenu.closed = true;
        return dayMenu;
    }

    // assumed menuString structure at this point:
    // 1st + 2nd line: DAY, DATE \n YEAR
    // 3rd line: starter
    // remaining lines: food, separated by |
    menuString = menuString.split("\n");
    menuString.splice(0,2);

    let starter = new Food(menuString[0]);
    dayMenu.starters.push(starter);

    menuString.splice(0,1);
    let main = new Food(menuString.join("").replace(/\s*\|/g, ","), 8.70);
    dayMenu.mains.push(main);

    return dayMenu;
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
    if (!menu.closed && !menu.noMenu && (menu.starters.length + menu.mains.length + menu.alacarte.length === 0)) {
        menu.error = true;
    }
    return menu;
}

function sanitizeName(val) {
    if (typeof val === "string") {
        val = val.replace(/€?\s[0-9](,|.)[0-9]+/, ""); // Replace '€ 00.00'
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
    getUniwirtWeekPlan: getUniwirtWeekPlan,
    getMittagstischWeekPlan: getMittagstischWeekPlan,
    getMensaWeekPlan: getMensaWeekPlan,
    getUniPizzeriaPlan: getUniPizzeriaPlan,
    getUniPizzeriaWeekPlan: getUniPizzeriaWeekPlan,
    getLapastaWeekPlan: laPastaScraper.getWeekPlan,
    getPrincsWeekPlan: getPrincsWeekPlan
};
