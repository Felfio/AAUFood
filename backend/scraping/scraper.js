const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const Food = require("../models/food");
const Menu = require("../models/menu");

function getUniwirtPlan() {
    return request.getAsync('http://www.uniwirt.at/Default.aspx?SIid=4&LAid=1')
        .then(res => res.body)
        .then(parseUniwirt);
}

function parseUniwirt(html) {
    var result = new Menu();

    var $ = cheerio.load(html);
    var dayInWeek = ((new Date()).getDay() + 6) % 7;
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

function getMensaPlan() {
    return request.getAsync('http://menu.mensen.at/index/index/locid/45')
        .then(res => res.body)
        .then(parseMensa);
}

function parseMensa(html) {
    var result = new Menu();
    var $ = cheerio.load(html);
    var dayInWeek = ((new Date()).getDay() + 6) % 7;

    var $classic1 = $('.menu-item').eq(2);
    var $classic2 = $('.menu-item').eq(3);
    var $dailySpecial = $('.menu-item').eq(4);

    var currentDay1 = $classic1.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');
    var currentDay2 = $classic2.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');
    var currentDaySpecial = $dailySpecial.find('.menu-item-content').eq(dayInWeek).find('.menu-item-text p');

    currentDay1 = currentDay1.map((index, item) => $(item).text()).toArray();
    currentDay2 = currentDay2.map((index, item) => $(item).text()).toArray();
    currentDaySpecial = currentDaySpecial.map((index, item) => $(item).text()).toArray();

    result.mains = [new Food(currentDay1), new Food(currentDay2), new Food(currentDaySpecial)];
    return result;
}

function getUniPizzeriaPlan() {
    return request.getAsync('hhttp://www.uni-pizzeria.at/speisen/mittagsteller.html')
        .then(res => res.body)
        .then(parseUniPizzeria);
}

function parseUniPizzeria(html) {
    var result = new Menu();
    var $ = cheerio.load(html);
}

function getMittagstischPlan() {
    return request.getAsync('http://www.lakeside-scitec.com/services/gastronomie/mittagstisch/')
        .then(res => res.body)
        .then(parseMittagstisch);
}

function parseMittagstisch(body) {
    var foodMenu = new Menu();

    var $ = cheerio.load(body);
    var dayInWeek = (new Date().getDay() + 6) % 7;
    var plans = $(".resp-tabs-container .daydata");

    //Wochentag nicht verfügbar
    if (plans.length <= dayInWeek * 2) {
        return foodMenu;
    }

    //Menü
    var menu = plans.eq(dayInWeek * 2);
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
        foodMenu.mains.push(new Food(name, "7.40 / 7.90"));
    });

    //á la carte
    var aLaCarte = plans.eq(dayInWeek * 2 + 1);
    var aLaCarteRows = aLaCarte.find("tr");
    first = aLaCarteRows.first();

    var aLaCartes = first.nextUntil('.free', 'tr');
    if (!first.hasClass("free")) {
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