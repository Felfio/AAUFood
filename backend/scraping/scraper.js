const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const Food = require("../models/food");
const Menu = require("../models/menu");

function downloadUniwirt() {
    return request.getAsync('http://www.uniwirt.at/')
        .then(res => res.body)
        .then(parseUniwirt);
}

function parseUniwirt(body) {
    var $ = cheerio.load(body);
    var first = $("#HomeWrapper .floatLeft.col190").first();
    console.log(first.text());
    var siblings = first.nextUntil('h3', '.floatLeft.col190');

    siblings.each((index, item) => console.log($(item).text()));

}

function downloadMittagstisch() {
    return request.getAsync('http://www.lakeside-scitec.com/services/gastronomie/mittagstisch/')
        .then(res => res.body)
        .then(parseMittagstisch);
}

function parseMittagstisch(body) {
    var foodMenu = new Menu();

    var $ = cheerio.load(body);
    var dayInWeek = (new Date().getDay() + 6) % 7;
    dayInWeek = dayInWeek > 4 ? 0 : dayInWeek;
    var plans = $(".resp-tabs-container .daydata");

    //Menü
    var menu = plans.eq(dayInWeek * 2);
    var menuRows = menu.find("tr");
    var first = menuRows.first();

    var soupRows;
    if (first.hasClass("free")) {
        soupRows = first.nextUntil('.free', 'tr');
    } else {
        soupRows = first.nextUntil('.free', 'tr');
        soupRows.unshift(first);
    }

    soupRows.each((index, item) => {
        if (index != 0) {
            var name = $(item).children().first().text();
            foodMenu.starters.push(new Food(name));
        }
    });

    //Hauptspeisen
    var mainsRows = soupRows.last().next().nextUntil('.free', 'tr');

    mainsRows.each((index, item) => {
        if (index != 0) {
            var name = $(item).children().first().text();
            foodMenu.mains.push(new Food(name, "7.40 / 7.90"));
        }
    });

    //á la carte
    //Yet todo :)

    return foodMenu;
}

module.exports = {
    downloadUniwirt: downloadUniwirt,
    downloadMittagstisch: downloadMittagstisch
};