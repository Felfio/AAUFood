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

    var $weekDates = $('#days').find(".date");
    if ($weekDates.text().indexOf(timeHelper.getMondayDate()) == -1) {
        result.outdated = true;
	return result;
    }


    $('.day-content br').replaceWith(' ');

    var $classic1 = $('.day-content #category133');
    var $classic2 = $('.day-content #category134');
    var $dailySpecial = $('.day-content #category247');

    var currentDay1 = $classic1.find('.category-content').eq(dayInWeek).find('p');
    var currentDay2 = $classic2.find('.category-content').eq(dayInWeek).find('p');
    var currentDaySpecial = $dailySpecial.find('.category-content').eq(dayInWeek).find('p');

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
    return setErrorOnEmpty(result);
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

function createFoodFromMenuSection(section, menu, dayInWeek) {
    var price = null;
    var priceArray = section.eq(dayInWeek).find('.category-price').text().match(/€ (\S*)/);
    if (priceArray && priceArray.length) {
        price = priceArray[1];
        price = +price.replace(',', '.');
    }
    var line = ''
    for (line of menu) {
      var match = line.match(/€\s[0-9](,|.)[0-9]+/);
      if (match != null && match.length > 0) {
        price = match[0].match(/[0-9]+(,|.)[0-9]+/)[0].replace(',', '.');
      }
    }

    //isInfo <=> price could not get parsed (or is empty --> 0) and there is only one line of text
    var isInfo = (price == null || isNaN(price) || price === 0) && menu.length === 1;

    let name = sanitizeName(menu);
    return new Food(name, price, isInfo);
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

    if ($('.companyinfo').text().indexOf(timeHelper.getMondayDate()) == -1) {
        foodMenu.outdated = true;
	return foodMenu;
    }

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
        name = sanitizeName(name);
        foodMenu.starters.push(new Food(name));
    });

    //Hauptspeisen
    var mainsRows = soupRows.last().next().nextUntil('.free', 'tr');
    mainsRows.splice(0, 1);

    mainsRows.each((index, item) => {
        var name = $(item).children().first().text();
        name = sanitizeName(name);
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
        name = sanitizeName(name);
        var price = +entries.eq(1).text().replace(",", ".");
        foodMenu.alacarte.push(new Food(name, price));
    });


    return setErrorOnEmpty(foodMenu);
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
        return val;
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
    getMittagstischPlan: getMittagstischPlan,
    getMittagstischWeekPlan: getMittagstischWeekPlan,
    getMensaPlan: getMensaPlan,
    getMensaWeekPlan: getMensaWeekPlan,
    getUniPizzeriaPlan: getUniPizzeriaPlan,
    getUniPizzeriaWeekPlan: getUniPizzeriaWeekPlan
};
