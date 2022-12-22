"use strict";

const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const PDFJS = require("pdfjs-dist");
const moment = require('moment');
const _ = require('lodash');

const Food = require("../models/food");
const Menu = require("../models/menu");
const config = require('../config');
const timeHelper = require('../helpers/timeHelper');
const scraperHelper = require('./scraperHelper')

const laPastaScraper = require('./lapasta-scraper');

var MensaUrl = config.scraper.mensaUrl;
var UniwirtUrl = config.scraper.uniwirtUrl;
var HotspotUrl = config.scraper.hotspotUrl;
var PizzeriaUrl = config.scraper.unipizzeriaUrl;
var BitsAndBytesUrl = config.scraper.bitsAndBytesUrl;
var VillaLidoUrl = config.scraper.villaLidoUrl;
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

    // Get Monday Date
    const mondayString = $("h3:contains(Montag)").text().split(" ")[1];
    const mondayDate = moment(mondayString, "DD.MM.YY");

    // Set outdated
    if (mondayDate.isValid() && mondayDate.format("D.M") !== timeHelper.getMondayDate()) {
        for (let i = 0; i < 6; i++) {
            let outdatedMenu = new Menu();
            outdatedMenu.outdated = true;
            weekPlan[i] = outdatedMenu;
        }
        return weekPlan;
    }

    var date = mondayDate;
    for (let dayInWeek = 0; dayInWeek < 6; dayInWeek++) {
        var dateString = date.format("DD.MM.YY");
        var dayEntry = $(`h3:contains(${dateString})`).parent();
        try {
            weekPlan[dayInWeek] = createUniwirtDayMenu(dayEntry);
        } catch (ex) {
            let errorMenu = new Menu();
            errorMenu.error = true;
            weekPlan[dayInWeek] = errorMenu;
        }
        date.add(1, 'days');
    }

    // Saturday a la carte
    weekPlan[5].noMenu = true;

    return weekPlan
}

function createUniwirtDayMenu(dayEntry) {
    var dayMenu = new Menu();
    var paragraphs = dayEntry.find("p");
    //Omit first <p> as it is the date
    var dateParagraph = paragraphs.eq(0);
    paragraphs = paragraphs.slice(1, paragraphs.length);
    paragraphs = paragraphs.filter(":not(:empty)");

    if (paragraphs.length < 2) {
        //Special cases
        let pText = paragraphs.length === 0 ? dateParagraph.text() : paragraphs.text();
        pText = pText.replace(/\d\d\.\d\d\.\d+/, "").trim();

        if (scraperHelper.contains(pText, true, ["feiertag", "ruhetag", "wir machen pause", "wir haben geschlossen", "closed"])) {
            dayMenu.closed = true;
        } else if (scraperHelper.contains(pText, true, ["Empfehlung"])) {
            dayMenu.noMenu = true;
        } else {
            pText = pText.charAt(0).toUpperCase() + pText.slice(1);
            let info = new Food(pText, null, true);
            dayMenu.mains.push(info);
        }
    } else {
        for (let i = 0; i < paragraphs.length; i++) {
            let pEntry = paragraphs.eq(i);

            let text = pEntry.text().trim();
            let name = scraperHelper.sanitizeName(text);

            let price = text.match(/\d+[\.\,]\d+$/);
            price = price ? +(price[0].replace(',', '.')) : null;

            let food = new Food(name, price);

            //If it has a price, it is a main course, otherwise a starter
            let hasName = !!name.trim();
            if (hasName) {
                if (price) {
                    dayMenu.mains.push(food);
                } else {
                    dayMenu.starters.push(food);
                }
            }

        }
    }

    return scraperHelper.setErrorOnEmpty(dayMenu);
}

function getMensaWeekPlan() {
    return request.getAsync({ url: MensaUrl, jar: true })
        .then(res => res.body)
        .then(body => parseMensa(body));
}

function parseMensa(html) {
    var result = new Array(7);

    let closedMenu = new Menu();
    closedMenu.closed = true;
    result[5] = result[6] = closedMenu;

    var $ = cheerio.load(html);

    let mondayDateString = $(".weekdays .date").first().text();
    let mondayDate = moment(mondayDateString, "DD.MM.");
    if (mondayDate.isValid() && mondayDate.week() !== moment().week()) {
        for (let i = 0; i < 5; i++) {
            let outdatedMenu = new Menu();
            outdatedMenu.outdated = true;
            result[i] = outdatedMenu;
        }
        return result;
    }

    var leftMenuElements = $("#leftColumn .menu-left .menu-category > *");
    var rightMenuElements = $("#middleColumn .menu-category > *");

    var menuElements = $.merge(leftMenuElements, rightMenuElements);
    var menuElementsGroupedByName = _.groupBy(menuElements, e => $(e).find("> :header").text());

    var foodsPerWeekday = [[], [], [], [], []]; //.fill only works with primitive values
    _.forOwn(menuElementsGroupedByName, (menusForWeek, name) => {
        var foodsForWeek = menusForWeek.map(m => createMensaFoodMenuFromElement($, m, name));
        for (let i = 0; i < foodsForWeek.length; i++) {
            foodsPerWeekday[i].push(foodsForWeek[i]);
        }
    });

    for (let i = 0; i < 5; i++) {
        let menu = new Menu();
        result[i] = menu;

        for (let food of foodsPerWeekday[i]) {
            menu.mains.push(food);
        }

        orderMensaMenusOfDay(menu, i);

        scraperHelper.setErrorOnEmpty(menu);
    }

    return result;
}

function createMensaFoodMenusFromElements($, elements, name) {
    return elements.map((i, e) => createMensaFoodMenuFromElement($, e, name)).toArray();
}

function createMensaFoodMenuFromElement($, e, name) {
    e = $(e);

    let foodNames = e.find("> p:not(:contains(€))").toArray()
        .map(x => $(x).text().trim().replace("&nbsp;", " "));

    // remove additional entries that does not contain dishes (= everything from "ohne Suppe und Salat" on)
    let start = foodNames.indexOf('ohne Suppe und Salat');
    if (start >= 0) {
        foodNames.splice(start, foodNames.length - start);
    }

    // If Mensa changes to splitting foods by <br> again, look in git history for this section how to handle this 
    let priceStr = e.find("> p:contains(€)").text();
    let price = scraperHelper.parsePrice(priceStr);

    let food = new Food(name, price);
    food.entries = foodNames.map(n => new Food(n));
    return food;
}

/**
 * Changes the order of a menu to "Veggie - Herzhaft - Wochen-Angebote".
 */
function orderMensaMenusOfDay(menu, dayIndex) {
    let from = 3; // move element from this index
    let to = 2; // ... to this index

    // I don't know why first day of week is special ¯\_(ツ )_/¯
    if (dayIndex !== 0) {
        from = 2;
        to = 1;
    }

    const temp = menu.mains[from];
    // shift elements to the left
    for (let j = from; j >= to; j--) {
        menu.mains[j] = menu.mains[j - 1];
    }

    menu.mains[to] = temp;
}

function createWochenspecialFoodMenusFromElements($, elements) {
    return elements.map((i, e) => createWochenspecialFoodMenuFromElement($, e)).toArray();
}

function createWochenspecialFoodMenuFromElement($, e) { // Kept here in case mensa changes its page once again
    e = $(e);
    let contentElement = e.find("> p :contains(Wochenhit)").last();

    if (!contentElement.length) {
        return null;
    }

    let nameWithPrice = contentElement.text();
    let price = scraperHelper.parsePrice(nameWithPrice);
    let foodNames = nameWithPrice
        .replace(/Wochenhit:?/, "") //Remove title
        .replace(/(\d+,\d+\s*)?€.*$/, "") // Remove leading prices (with leading or trailing €)
        .split(")") //Split at end of allergens, don't worry about missing closing )
        .map(s => s.trim());

    let food = new Food("Wochenspecial", price);
    food.entries = foodNames.map(n => new Food(n));
    return food;
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
        if (scraperHelper.contains(combinedFood.name, true, ["feiertag"])) {
            menu.noMenu = true;
        } else {

            let splitted = combinedFood.name.split("<br>");
            let starterExists = splitted.length > 1;

            if (starterExists) {
                //There is a starter
                let name = scraperHelper.sanitizeName(splitted[0]);
                let starter = new Food(name);
                menu.starters.push(starter);
            }

            let i = starterExists ? 1 : 0;
            for (; i < splitted.length; i++) {
                let name = scraperHelper.sanitizeName(splitted[i]);
                let main = new Food(name, combinedFood.price);
                menu.mains.push(main);
            }
        }
    }

    return scraperHelper.setErrorOnEmpty(menu);
}

function parseUniPizzeria(html) {

    var result = new Menu();

    var $ = cheerio.load(html);
    var _days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'je Mittagsteller € 7,90'];
    var _uniPizzeriaPrice = 7.90;

    var $menuContent = $('[itemprop="articleBody"]');

    if (!timeHelper.checkInputForCurrentWeek($menuContent.find('p > strong').text())) {
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
    return scraperHelper.setErrorOnEmpty(result);

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

function getHotspotWeekPlan() {
    return request.getAsync(HotspotUrl)
        .then(res => res.body)
        .then(body => parseHotspot(body));
}

function parseHotspot(html) {
    var result = new Array(7);
    let closedMenu = new Menu();
    closedMenu.closed = true;
    result[4] = result[5] = result[6] = closedMenu;

    var $ = cheerio.load(html);

    var mainContent = $("section > .content");
    var heading = mainContent.find("h1:contains(Restaurant Hotspot)").eq(0).text() || "";
    var weekIsOutdated = heading.indexOf(timeHelper.getMondayDate()) === -1;

    if (weekIsOutdated) {
        return scraperHelper.invalidateMenus(result);
    }

    var contentTable = mainContent.find("> table > tbody");

    // Hauptspeisen
    const contentTableDict = []
    let isMainDish = false;
    contentTable.find('tr').each((ind, itm) => {
        // filter out soups and salats and menu sets ("MENÜ-SET-PREIS")
        if ($(itm).find("td:contains(MENÜ-SET-PREIS)").length === 1) {
            isMainDish = false;
        } else {
            if (isMainDish) {
                if ($(itm).text().trim() !== "" && $(itm).has('li').length) {
                    contentTableDict.push(itm);
                }
            } else {
                if ($(itm).find("td:contains(MENÜHAUPTSPEISEN)").length > 0) {
                    isMainDish = true;
                }
            }
        }
    })

    for (let dayInWeek = 0; dayInWeek < 4; dayInWeek++) { // Hotspot currently only MON-THU
        var menuForDay = new Menu();
        var menuct = 0;
        if (Object.keys(contentTableDict).length) {
            for (let entry of contentTableDict) {
                let description = $(entry).find("> td").eq(0).text().trim();
                let title = `Menü ${++menuct}`;
                let priceField = $(entry).find("> td:contains(€)");
                let price = scraperHelper.parsePrice(priceField.text());
                let mainCourse = new Food(title, price);
                mainCourse.entries = [new Food(description)];
                menuForDay.mains.push(mainCourse);
            }
        }
        result[dayInWeek] = menuForDay;
    }

    return result;
}

function getBitsAndBytesWeekPlan() {
    return request.getAsync(BitsAndBytesUrl)
        .then(res => res.body)
        .then(body => parseBitsnBytes(body));
}

function parseBitsnBytes(html) {
    var result = new Array(7);
    let closedMenu = new Menu();
    closedMenu.closed = true;
    result[5] = result[6] = closedMenu;

    var $ = cheerio.load(html);

    var mainContent = $("section > .content");
    var heading = mainContent.find("h1:contains(Bits & Bytes Marketplace)").eq(0).text() || "";
    var weekIsOutdated = heading.indexOf(timeHelper.getMondayDate()) === -1;

    if (weekIsOutdated) {
        return scraperHelper.invalidateMenus(result);
    }

    var contentTable = mainContent.find("> table > tbody");

    // Hauptspeisen
    const contentTableDict = []
    let isMainDish = false;
    contentTable.find('tr').each((ind, itm) => {
        // filter out pizza and wok
        if ($(itm).find("td:contains(WOK)").length === 1) {
            isMainDish = false;
        } else {
            if (isMainDish) {
                if ($(itm).text().trim() !== "" && $(itm).has('li').length) {
                    contentTableDict.push(itm);
                }
            } else {
                if ($(itm).find("td:contains(HEISSE THEKE)").length > 0) {
                    isMainDish = true;
                }
            }
        }
    })

    for (let dayInWeek = 0; dayInWeek < 5; dayInWeek++) {
        var menuForDay = new Menu();
        var menuct = 0;
        if (Object.keys(contentTableDict).length) {
            for (let entry of contentTableDict) {
                let description = $(entry).find("> td").eq(0).text().trim();
                let title = `Menü ${++menuct}`;
                let priceField = $(entry).find("> td:contains(€)");
                let price = scraperHelper.parsePrice(priceField.text());
                let mainCourse = new Food(title, price);
                mainCourse.entries = [new Food(description)];
                menuForDay.mains.push(mainCourse);
            }
        }
        result[dayInWeek] = menuForDay;
    }

    return result;
}

async function getVillaLidoWeekPlan() {
    var result = new Array(7);
    let alacarte = new Menu();
    alacarte.noMenu = true;
    result[5] = result[6] = alacarte;
    let weekdays = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag"];
    for (var i = 0; i < 5; i++) {
        result[i] = await request.getAsync(VillaLidoUrl + weekdays[i] + "/")
            .then(res => res.body)
            .then(body => parseVillaLidoDay(body, i))
    }
    return Promise.resolve(result);
}

function parseVillaLidoDay(html, weekDay) {
    var dayMenu = new Menu();

    var $ = cheerio.load(html);
    var mainContent = $(".mkdf-smi-content-holder");

    if ($("h2").eq(0).text().toLowerCase().includes("nicht gefunden")) {
        dayMenu.noMenu = true;
        return dayMenu;
    }

    var currentField = $(mainContent).children().eq(0); // Date, check for validity
    dayMenu.outdated = !timeHelper.checkInputForWeekday(currentField.text(), weekDay)

    while ((currentField = $(currentField).next()).length > 0 && !currentField.text().includes("Lebensmittelinformationsverordnung")) {
        let titleRaw = currentField.text()
        let isMainCourse = titleRaw.includes("€");
        if (isMainCourse) {
            let courseName = titleRaw.substring(0, titleRaw.indexOf("€"));
            currentField = $(currentField).next();
            let description = currentField.text();
            let price = titleRaw.substring(titleRaw.indexOf("€")).replace("€ ", "");
            price = parseFloat(price.replace(",", ".").trim());
            let mainCourse = new Food(courseName, price);
            mainCourse.entries = [new Food(description)];
            dayMenu.mains.push(mainCourse);
        } else {
            currentField = $(currentField).next();
            let name = currentField.text();
            let starter = new Food(name);
            dayMenu.starters.push(starter)
        }
    }

    scraperHelper.setErrorOnEmpty(dayMenu);
    return dayMenu;
}

function getPrincsWeekPlan() {
    return request.getAsync(PrincsUrl)
        .then(res => res.body)
        .then(function (body) {
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
    for (let i = 0; i < 5; i++) {
        result[i] = parsePrinceDayMenu(contentString.slice(pos[i], pos[i + 1]));
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
    menuString.splice(0, 2);

    let starter = new Food(menuString[0]);
    dayMenu.starters.push(starter);

    menuString.splice(0, 1);
    let main = new Food(menuString.join("").replace(/\s*\|/g, ","), 8.70);
    dayMenu.mains.push(main);

    return dayMenu;
}

module.exports = {
    getUniwirtWeekPlan: getUniwirtWeekPlan,
    getHotspotWeekPlan: getHotspotWeekPlan,
    getMensaWeekPlan: getMensaWeekPlan,
    getUniPizzeriaPlan: getUniPizzeriaPlan,
    getUniPizzeriaWeekPlan: getUniPizzeriaWeekPlan,
    getLapastaWeekPlan: laPastaScraper.getWeekPlan,
    getPrincsWeekPlan: getPrincsWeekPlan,
    getVillaLidoWeekPlan: getVillaLidoWeekPlan,
    getBitsAndBytesWeekPlan: getBitsAndBytesWeekPlan
};
