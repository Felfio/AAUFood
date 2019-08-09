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
const mensaMenuNameHelper = require('../helpers/mensaMenuNameHelper');

const laPastaScraper = require('./lapasta-scraper');

var MensaUrl = config.scraper.mensaUrl;
var UniwirtUrl = config.scraper.uniwirtUrl;
var HotspotUrl = config.scraper.hotspotUrl;
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
        date.add(1,'days');
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

        if (contains(pText, true, ["feiertag", "ruhetag", "wir machen pause", "wir haben geschlossen", "closed"])) {
            dayMenu.closed = true;
        } else if (contains(pText, true, ["Empfehlung"])) {
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
            let name = sanitizeName(text);

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
            let dailySpecialFood = createFoodFromMensaCategory(dailySpecialCategory, menu.mains.length);
            menu.mains.push(dailySpecialFood);

            let classic1Food = createFoodFromMensaCategory(classic1Category, menu.mains.length);
            menu.mains.push(classic1Food);

            let classic2Food = createFoodFromMensaCategory(classic2Category, menu.mains.length);
            menu.mains.push(classic2Food);

            let AAUSpecialFood = createFoodFromMensaAAUSpecialCategory(AAUSpecialCategory, dayInWeek, menu.mains.length);
            if (AAUSpecialFood != null) {
                menu.mains.push(AAUSpecialFood);
            }
        } catch (ex) {
            //Do not log error, as it is most likely to be a parsing error, which we do not want to fill the log file
            menu.error = true;
        }

        // COMMENT TEST CODE AFTER TESTING
        // menu.mains[0].entries.push(new Food("Linsenrisotto mit Spinat (A,C,G,L)"));
        // menu.mains[1].entries.push(new Food("Erbsensuppe"));
        // menu.mains[1].entries.push(new Food("Kartoffelauflauf mit sehr viel Speck (B,,A,C,O,N"));
        // menu.mains[2].entries.push(new Food("Erbsensuppe mit Nudeleinlage"));
        // menu.mains[2].entries.push(new Food("Wiener Schnitzel (A,F,G)"));

        //Just to be sure
        setErrorOnEmpty(menu);
    }
    return result;
}

function createFoodFromMensaCategory(category, index) {
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

    foodNames = foodNames.filter(x => x);

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

    let foodName = mensaMenuNameHelper.getMenuName(index);
    let food = new Food(foodName, price, isInfo);
    food.entries = foodNames.map(n => new Food(n));
    return food;
}

function createFoodFromMensaAAUSpecialCategory(category, currentDay) {
    let dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    let currentDayName = dayNames[currentDay];
    let categoryContent = category.find(".category-content");

    let meal = categoryContent.find(`p:contains(${currentDayName})`).text();
    if (meal.length === 0) {
        return null;
    } else {
        meal = meal.split(":")[1].trim();
    }
    let foodNames = [meal].filter(x => x);

    //Price
    let match = categoryContent.text().match(/(€|e|E)[\s]+[0-9](,|\.)[0-9]+/);

    let priceStr = null;
    if (match != null && match.length > 0) {
        priceStr = match[0].match(/[0-9]+(,|\.)[0-9]+/)[0].replace(',', '.');
    }

    let price = +priceStr;
    //isInfo <=> price could not get parsed (or is empty --> 0) and there is only one line of text in .category-content
    var isInfo = (price === 0 || isNaN(price)) && categoryContent.children().length === 1;

    let foodName = mensaMenuNameHelper.getMenuName(index, isInfo);
    let food = new Food(foodName, price, isInfo);
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
    var dateText = mainContent.find("h1:contains(Mittagsmenüs vom)").eq(0).text() || "";
    dateText = dateText.replace(".0","."); // workaround, 22.07 != 22.7
    var weekIsOutdated = dateText.indexOf(timeHelper.getMondayDate()) == -1;

    var menuForWeek = new Menu();
    var menuForDay = new Menu();
    menuForWeek.outdated = weekIsOutdated;

    // SOUPS
    var contentTable =  mainContent.find("> table > tbody");
    var soup = contentTable.find("tr:contains(SUPPEN)");
    while ($.text(soup).replace(/\s/g, '').length) { // loop while name is not empty
        soup = soup.next();
        let titlefield = soup.find("> td > ul > li");
        let name = $(titlefield).text();
        name = name.trimRight(); // remove space at end of text
        let soupFood = new Food(name);
        menuForWeek.starters.push(soupFood);
        menuForDay.starters.push(soupFood);
    }

    // MAINS
    // Wochenhit
    var main = contentTable.find("tr:contains(WOCHENHIT)").next();
    var description = $(main).text();
    var titlefield = main.next().find("> td:contains(€)");
    var price = ($(titlefield).text()).trimLeft();
    price = price.replace("€ ", "");
    price = price.replace(",",".");
    var mainCourse = new Food("Wochenhit",parseFloat(price));
    mainCourse.entries = [new Food(description), new Food("inkl. Vöslauer oder Pepsi PET 0.5l")];
    menuForDay.mains.push(mainCourse);
    menuForWeek.mains.push(mainCourse);

    // Hauptspeisen
    main = contentTable.find("tr:contains(HAUPT)").next().next();
    while ($.text(main).replace(/\s/g, '').length) { // loop while name is not empty
        titlefield = main.find("> td > ul > li");
        description = $(titlefield).text();
        titlefield = main.find("> td > ul > li > strong");
        let title = $(titlefield).text();
        title.trimRight();
        description = description.trimRight();
        description = description.replace(title,"");
        description = description.trimLeft();
        titlefield = main.find("> td:contains(€)");
        price = ($(titlefield).text()).trimLeft();
        price = price.replace("€ ", "");
        price = price.replace(",",".");
        mainCourse = new Food(title,parseFloat(price));
        mainCourse.entries = [new Food(description)];
        menuForDay.mains.push(mainCourse);
        if (!title.includes("des Tages")){
            menuForWeek.mains.push(mainCourse);
        }
        main = main.next();
    }

    setErrorOnEmpty(menuForWeek);
    setErrorOnEmpty(menuForDay);
    for (let dayInWeek = 0; dayInWeek < 5; dayInWeek++) {
        if (new Date().getDay()-1 == dayInWeek)
            result[dayInWeek] = menuForDay;
        else
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
    for (var i = 0; i < 5; i++){
        result[i] = await request.getAsync("https://www.villa-lido.at/menu-item/"+weekdays[i]+"/")
            .then(res => res.body)
            .then(body => parseVillaLidoDay(body, i))
    }
    return Promise.resolve(result);
}

function parseVillaLidoDay(html, weekDay) {
    var dayMenu = new Menu();
    
    var $ = cheerio.load(html);
    var mainContent = $(".mkdf-smi-content-holder");

    if ($("h2").eq(0).text().toLowerCase().includes("nicht gefunden")){
        dayMenu.noMenu = true;
        return dayMenu;
    }

    var currentField = $(mainContent).children().eq(0); // Date, check for validity
    dayMenu.outdated = !timeHelper.checkInputForWeekday(currentField.text(),weekDay)

    while ((currentField = $(currentField).next()) !== null && !currentField.text().includes("Lebensmittelinformationsverordnung")){
        let titleRaw = currentField.text()
        let isMainCourse = titleRaw.includes("€");
        if (isMainCourse) {
            let courseName = titleRaw.substring(0,titleRaw.indexOf("€"));
            currentField = $(currentField).next();
            let description = currentField.text();
            let price = titleRaw.substring(titleRaw.indexOf("€")).replace("€ ", "");
            price = parseFloat(price.replace(",",".").trim());
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

    setErrorOnEmpty(dayMenu);
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
        val = val.replace(/  +/g, " "); // multiple spaces to one
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
    getHotspotWeekPlan: getHotspotWeekPlan,
    getMensaWeekPlan: getMensaWeekPlan,
    getUniPizzeriaPlan: getUniPizzeriaPlan,
    getUniPizzeriaWeekPlan: getUniPizzeriaWeekPlan,
    getLapastaWeekPlan: laPastaScraper.getWeekPlan,
    getPrincsWeekPlan: getPrincsWeekPlan,
    getVillaLidoWeekPlan: getVillaLidoWeekPlan
};
