"use strict";

const weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function sanitizeDay(incDay) {
    if (!incDay || isNaN(incDay)) {
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

module.exports = {
    sanitizeDay: sanitizeDay,
    weekDayName: weekDayName
};