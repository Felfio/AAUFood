"use strict";

const weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function sanitizeDay(incDay) {
    if (incDay == null || isNaN(incDay)) {
        return ((new Date()).getDay() + 6) % 7;
    } else {
        if (incDay < 0) {
            incDay = 7 + (incDay % 7);
        }
        return incDay % 7;
    }
}

function weekDayName(sanitizedDay) {
    return weekdays[sanitizedDay];
}

function determineLastMonday() {
    var d = new Date();
    var day = d.getDay();
    var diffToMonday = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diffToMonday));
}

function dateStringShort(date) {
    return date.getDate() + "." + (date.getMonth() + 1);
}

function getMondayDate() {
    return dateStringShort(determineLastMonday());
}

function getMondayRegex() {
    var mon = determineLastMonday();
    var day = mon.getDate().toString();
    var month = (mon.getMonth() + 1).toString();
    // Get regex for a given date with optional leading zero
    return new RegExp(`${day.padStart(2, 'X')}\\.${month.padStart(2, 'X')}`.replace(/X/g, '0?'));
}

function checkInputForCurrentWeek(str) {
    var mon = determineLastMonday();
    for (var i = 0; i <= 6; i++) {
        if (str.indexOf(dateStringShort(mon)) != -1) // if date in string return True
            return true;
        mon.setDate(mon.getDate() + 1);
    }
    return false;
}

function checkInputForWeekday(str, weekDay) {
    var date = determineLastMonday();
    date.setDate(date.getDate() + weekDay);
    str = str.replace(".0", "."); //handle leading zero
    if (str.indexOf(dateStringShort(date)) !== -1) {
        return true;
    }
    else
        return false;
}

function getMidnight() {
    var newDate = new Date();
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(0);
    newDate.setMinutes(0);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);

    return newDate;
}

function getMsUntilMidnight() {
    var midnightTime = getMidnight();
    return midnightTime - new Date();
}

module.exports = {
    sanitizeDay,
    weekDayName,
    getMondayDate,
    getMondayRegex,
    checkInputForCurrentWeek,
    checkInputForWeekday,
    getMidnight,
    getMsUntilMidnight
};