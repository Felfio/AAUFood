const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const Food = require("../models/food");
const Menu = require("../models/menu");

function getUniwirtPlan(day) {
    return request.getAsync('http://www.uniwirt.at/Default.aspx?SIid=4&LAid=1')
        .then(res => res.body)
        .then(body => parseUniwirt(body, day));
}

function parseUniwirt(html, day) {
    var result = new Menu();

    var $ = cheerio.load(html);
    var dayInWeek = day || ((new Date()).getDay() + 6) % 7;
    var $currentDayRows = $("#StandardWrapper").find(".col600 > .col360.noMargin").eq(dayInWeek).find('tr');

    $currentDayRows.each((index, item) => {
        var $tds = $(item).children();
        var name = $tds.eq(0).text();
        var price = $tds.eq(2).text();

        if (price === '') {
            result.starters.push(new Food(name));
        }
        else {
            price = +price.substring(2).replace(',', '.');
            result.mains.push(new Food(name, price));
        }
    });

    return result;
}

function getMensaPlan(day) {
    return request.getAsync('http://menu.mensen.at/index/index/locid/45')
        .then(res => res.body)
        .then(body => parseMensa(body, day));
}

function parseMensa(html, day) {
    var result = new Menu();
    var $ = cheerio.load(html);
    var dayInWeek = day || ((new Date()).getDay() + 6) % 7;

    var $classic1 = $('.menu-item').eq(2);
    var $classic2 = $('.menu-item').eq(3);
    var $dailySpecial = $('.menu-item').eq(4);

    var currentDay1 = $classic1.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');
    var currentDay2 = $classic2.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');
    var currentDaySpecial = $dailySpecial.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');

    currentDay1 = currentDay1.map((index, item) => $(item).text()).filter(isNotBlank).toArray();
    currentDay2 = currentDay2.map((index, item) => $(item).text()).filter(isNotBlank).toArray();
    currentDaySpecial = currentDaySpecial.map((index, item) => $(item).text()).filter(isNotBlank).toArray();

    result.mains = [];
    if (currentDay1.length) {
        var currentDay1Price = $classic1.find('.menu-item-content').eq(dayInWeek).find('.menu-item-price').text().match(/€ (\S*)/)[1];
        currentDay1Price = +currentDay1Price.replace(',', '.');
        result.mains.push(new Food(currentDay1, currentDay1Price));
    }
    if (currentDay2.length) {
        var currentDay2Price = $classic2.find('.menu-item-content').eq(dayInWeek).find('.menu-item-price').text().match(/€ (\S*)/)[1];
        currentDay2Price = +currentDay2Price.replace(',', '.');
        result.mains.push(new Food(currentDay2, currentDay2Price));
    }
    if (currentDaySpecial.length) {
        var currentDaySpecialPrice = currentDaySpecial.find('.menu-item-content').eq(dayInWeek).find('.menu-item-price').text().match(/€ (\S*)/)[1];
        currentDaySpecialPrice = +currentDaySpecialPrice.replace(',', '.');
        result.mains.push(new Food(currentDaySpecial, currentDaySpecialPrice));
    }
    return result;
}

function isNotBlank(index, element) {
    return element.length !== 0 && element.trim();
}

function getUniPizzeriaPlan(day) {
    return request.getAsync('hhttp://www.uni-pizzeria.at/speisen/mittagsteller.html')
        .then(res => res.body)
        .then(body => parseUniPizzeria(body, day));
}

function parseUniPizzeria(html, day) {
    var result = new Menu();
    var $ = cheerio.load(html);
}

function getMittagstischPlan(day) {
    return request.getAsync('http://www.lakeside-scitec.com/services/gastronomie/mittagstisch/')
        .then(res => res.body)
        .then(body => parseMittagstisch(body, day));
}

function parseMittagstisch(body, day) {
    var foodMenu = new Menu();

    var dayInWeek = day || (new Date().getDay() + 6) % 7;

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

module.exports = {
    getUniwirtPlan: getUniwirtPlan,
    getMittagstischPlan: getMittagstischPlan,
    getMensaPlan: getMensaPlan
};