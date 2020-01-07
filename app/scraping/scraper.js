"use strict";

const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const PDFJS = require("pdfjs-dist");
global.XMLHttpRequest = require('xhr2');
const moment = require('moment');
const he = require('he');

const Food = require("../models/food");
const Menu = require("../models/menu");
const config = require('../config');
const timeHelper = require('../helpers/timeHelper');
const mensaMenuNameHelper = require('../helpers/mensaMenuNameHelper');
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

    var dayEntries = $("body").find(".vc_custom_1411211617286"); // better search for vc_row? look at changes

    // Get Monday Date
    let mondayDate = moment(dayEntries.find("h4:contains(Montag)").next().text(), "DD.MM.YYYY");

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
        var dateString = date.format("DD.MM.YYYY");
        var dayEntry = dayEntries.find(`p:contains(${dateString})`).parent();
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

    var tagestellerAndClassic2Elements = $("#leftColumn .menu-left .menu-category > *");
    var classic1AndSpecialElements = $("#middleColumn .menu-category > *");

    var tagestellerElements = tagestellerAndClassic2Elements.filter(":contains(Tagesteller)");
    var tagestellerFoods = createMensaFoodMenusFromElements($, tagestellerElements, "Tagesteller");
    var classic2Elements = tagestellerAndClassic2Elements.filter(":contains(Classic)");
    var classic2Foods = createMensaFoodMenusFromElements($, classic2Elements, "Menü Classic 2");

    var classic1Elements = classic1AndSpecialElements.filter(":contains(Classic)");
    var classic1Foods = createMensaFoodMenusFromElements($, classic1Elements, "Menü Classic 1");

    var wochenspecialElements = classic1AndSpecialElements.filter(":not(:contains(Classic))");
    var wochenspecialFoods = createWochenspecialFoodMenusFromElements($, wochenspecialElements);

    for (let i = 0; i < 5; i++) {
        let menu = new Menu();
        result[i] = menu;

        let classic1 = classic1Foods[i];
        if (classic1) {
            menu.mains.push(classic1);
        }

        let classic2 = classic2Foods[i];
        if (classic2) {
            menu.mains.push(classic2);
        }

        let tagesteller = tagestellerFoods[i];
        if (tagesteller) {
            menu.mains.push(tagesteller);
        }

        let wochenspecial = wochenspecialFoods[i];
        if (wochenspecial) {
            menu.mains.push(wochenspecial);
        }

        scraperHelper.setErrorOnEmpty(menu);
    }

    return result;
}

function createMensaFoodMenusFromElements($, elements, name) {
    return elements.map((i, e) => createMensaFoodMenuFromElement($, e, name)).toArray();
}

function createMensaFoodMenuFromElement($, e, name) {
    e = $(e);

    let ps = e.find("> p");
    let contentElement = ps.eq(0);
    let foodNames = contentElement
        .html() // Get text with tags as separators
        .split(/<\s*br\s*\/?\s*>/) // Split by <br>
        .map(s => he.decode(s, { allowUnsafeSymbols: true })) // Needed for ', "", & (which may be used by restaurants). Sanitized in next step
        .map(scraperHelper.stripHtml) // Remove tags
        .filter(x => x.trim()); // Remove empty

    let priceStr = ps.eq(1).text();
    let price = scraperHelper.parsePrice(priceStr);

    let food = new Food(name, price);
    food.entries = foodNames.map(n => new Food(n));
    return food;
}

function createWochenspecialFoodMenusFromElements($, elements) {
    return elements.map((i, e) => createWochenspecialFoodMenuFromElement($, e)).toArray();
}

function createWochenspecialFoodMenuFromElement($, e) {
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
    result[5] = result[6] = closedMenu;

    var $ = cheerio.load(html);

    var mainContent = $("section > .content");
    var dateText = mainContent.find("h1:contains(Mittagsmenüs)").eq(0).text() || "";
    dateText = dateText.replace(".0", "."); // workaround, 22.07 != 22.7
    var weekIsOutdated = dateText.indexOf(timeHelper.getMondayDate()) == -1;

    var menuForWeek = new Menu();
    var menuForDay = new Menu();
    menuForWeek.outdated = weekIsOutdated;

    // SOUPS
    var contentTable = mainContent.find("> table > tbody");
    var soup = contentTable.find("tr:contains(SUPPEN)");
    var soupPriceFrom = scraperHelper.parsePrice(soup.text());
    soup = soup.next();
    var soupPriceTo = scraperHelper.parsePrice(soup.text());
    var soupPrices = soupPriceFrom && soupPriceTo ? `${soupPriceFrom} € - ${soupPriceTo} €` : null;

    var soupsForWeek = [];
    var soupsForDay = [];
    while ($.text(soup).replace(/\s/g, '').length) { // loop while name is not empty
        soup = soup.next();
        let titlefield = soup.find("strong").parent();   // find a strong element, take its parent (to also get allergens)     
        if (!titlefield.length) {
            // That's no soup
            continue;
        }

        let name = $(titlefield).text();
        name = name.replace(/Suppe des Tages([^:])/, "Suppe des Tages:$1").trim();
        let soupFood = new Food(name);

        if (!name.includes("Suppe des Tages")) {
            soupsForWeek.push(soupFood);
        }

        soupsForDay.push(soupFood);
    }

    const soupCourseName = "Suppen vom Buffet";
    if (soupsForDay.length > 0) {
        let soupsCourse = new Food(soupCourseName, soupPrices);
        soupsCourse.entries = soupsForDay;
        menuForDay.mains.push(soupsCourse);
    }

    if (soupsForWeek.length > 0) {
        let soupsCourse = new Food(soupCourseName, soupPrices);
        soupsCourse.entries = soupsForWeek;
        menuForWeek.mains.push(soupsCourse);
    }

    // MAINS
    // Wochenhit
    var main = contentTable.find("tr:contains(WOCHENHIT)").next();
    var description = $(main).text().trim();
    var titlefield = main.next().find("> td:contains(€)");
    var price = ($(titlefield).text()).trimLeft();
    price = price.replace("€ ", "");
    price = price.replace(",", ".");
    var mainCourse = new Food("Wochenhit", parseFloat(price));
    var note = main.next().text()
    note = note.substr(0, note.indexOf('€')).trim();
    mainCourse.entries = [new Food(description), new Food(note)];
    menuForDay.mains.push(mainCourse);
    menuForWeek.mains.push(mainCourse);

    // Hauptspeisen
    main = contentTable.find("tr:contains(HAUPT)").next(":not(:empty)").eq(0);
    while ($.text(main).replace(/\s/g, '').length) { // loop while name is not empty
        titlefield = main.find("> td > ul > li");
        description = $(titlefield).text();
        titlefield = main.find("> td > ul > li > strong");
        let title = $(titlefield).text().trim();
        description = description.replace(title, "").trim();
        let priceField = main.find("> td:contains(€)");
        price = scraperHelper.parsePrice(priceField.text());
        mainCourse = new Food(title, price);
        mainCourse.entries = [new Food(description)];
        menuForDay.mains.push(mainCourse);
        if (!(title.includes("des Tages") || /^Vegetarisches\s+Gericht$/.test(title))) {
            menuForWeek.mains.push(mainCourse);
        }
        main = main.next();
    }

    scraperHelper.setErrorOnEmpty(menuForWeek);
    scraperHelper.setErrorOnEmpty(menuForDay);
    for (let dayInWeek = 0; dayInWeek < 5; dayInWeek++) {
        if (new Date().getDay() - 1 == dayInWeek)
            result[dayInWeek] = menuForDay;
        else
            result[dayInWeek] = menuForWeek;
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
    var dateText = mainContent.find("h1:contains(Heiße Theke)").eq(0).text() || "";
    dateText = dateText.replace(".0", "."); // workaround, 22.07 != 22.7
    var weekIsOutdated = dateText.indexOf(timeHelper.getMondayDate()) == -1;

    var menuForWeek = new Menu();
    menuForWeek.outdated = weekIsOutdated;

    var contentTable = mainContent.find("> table > tbody");

    // Hauptspeisen
    var main = contentTable.find("> tr:contains(€)").eq(0);
    while ($.text(main).replace(/\s/g, '').length) { // loop while name is not empty
        let titlefield = main.find("> td").eq(0);
        let description = $(titlefield).text();
        titlefield = main.find("> td > strong");
        let title = $(titlefield).text().trim();
        description = description.replace(title, "").trim();

        if (title.toUpperCase() == title) {
            title = scraperHelper.decapitalize(title);
        }

        let priceField = main.find("> td:contains(€)");
        let price = scraperHelper.parsePrice(priceField.text());

        let mainCourse = new Food(title, parseFloat(price));
        mainCourse.entries = [new Food(description)];
        menuForWeek.mains.push(mainCourse);
        main = main.next();
    }
    scraperHelper.setErrorOnEmpty(menuForWeek);

    for (let dayInWeek = 0; dayInWeek < 5; dayInWeek++) {
        result[dayInWeek] = menuForWeek;
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
