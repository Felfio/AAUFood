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

function getMondayDate() {
    var d = new Date();
    var day = d.getDay();
    var diffToMonday = d.getDate() - day + (day == 0 ? -6 : 1);
    d = new Date(d.setDate(diffToMonday));
    return d.getDate() + "." + (d.getMonth() + 1);
}

module.exports = {
    sanitizeDay: sanitizeDay,
    weekDayName: weekDayName,
    getMondayDate: getMondayDate
};
