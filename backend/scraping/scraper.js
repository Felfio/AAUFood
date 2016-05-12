const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const Food = require('../models/food');
const Menu = require('../models/menu');

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

function getUniPizzeriaPlan(){
    return request.getAsync('hhttp://www.uni-pizzeria.at/speisen/mittagsteller.html')
        .then(res => res.body)
        .then(parseUniPizzeria);
}

function parseUniPizzeria(html){
    var result = new Menu();
    var $ = cheerio.load(html);

    
}

module.exports = {
    getUniwirtPlan: getUniwirtPlan
};