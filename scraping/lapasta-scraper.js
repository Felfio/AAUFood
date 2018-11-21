"use strict";

const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');
const moment = require('moment');
const Food = require("../models/food");
const Menu = require("../models/menu");
const config = require('../config');
const timeHelper = require('../helpers/timeHelper');
const scraperHelper = require('./scraperHelper')

var LapastaUrl = config.scraper.lapastaUrl;

function _getWeekPlan() {
  return request.getAsync(LapastaUrl)
          .then(res => res.body)
          .then(body => _parseHTML(body));
}

function _parseHTML(html) {
  var weekPlan = new Array(7);

  // Lapasta is closed on Saturday and Sunday
  let closedMenu = new Menu();
  closedMenu.closed = true;
  weekPlan[5] = closedMenu;
  weekPlan[6] = closedMenu;

  // Init parser
  var $ = cheerio.load(html);

  // Load day-divs
  var dayDivs = $('#menue-container').find('.ce_text.block');

  // Get monday div and compare date to current date
  let mondayDate = moment(dayDivs.first().find("h2").text().split(", ")[1], "DD.MM.");
  if (mondayDate.isValid() && mondayDate.format("D.M") !== timeHelper.getMondayDate()) {
      return scraperHelper.invalidateMenus(weekPlan);
  }

  // weekdays
  for (let dayInWeek = 0; dayInWeek < 5; dayInWeek++) {
    var dayEntry = dayDivs.eq(dayInWeek);
    try {
        weekPlan[dayInWeek] = _parseDayMenu(dayEntry);
    } catch (ex) {
        let errorMenu = new Menu();
        errorMenu.error = true;
        weekPlan[dayInWeek] = errorMenu;
    }
  }
  return weekPlan;
}

function _parseDayMenu(dayEntry) {
  var dayMenu = new Menu();
  var paragraphs = dayEntry.find("div");

  // todo: Handle special cases like "Feiertag", "Ruhetag",...
  if (paragraphs.length === 1) {
    //Special cases
    /*let pText = paragraphs.text();
    if (contains(pText, true, ["feiertag", "ruhetag", "wir machen pause", "wir haben geschlossen"])) {
      dayMenu.closed = true;
    } else if (contains(pText, true, ["Empfehlung"])) {
      dayMenu.noMenu = true;
    } else {
      let info = new Food(pText, null, true);
      dayMenu.mains.push(info);
    }*/
  } else {
    for (let i = 0; i < paragraphs.length; i++) {
      let pEntry = paragraphs.eq(i);

      let text = pEntry.text().trim();
      let name = scraperHelper.sanitizeName(text);

      let price = 7.8;

      let food = new Food(name, price);

      dayMenu.mains.push(food);
    }
  }

  return scraperHelper.setErrorOnEmpty(dayMenu);
}

module.exports = {
  getWeekPlan: _getWeekPlan
}
