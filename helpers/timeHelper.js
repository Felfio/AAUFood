"use strict";

function sanitizeDay(incDay) {
    if (!incDay || isNaN(incDay)) {
        return ((new Date()).getDay() + 6) % 7;
    } else {
        return Number(incDay) % 7;
    }
}


module.exports = {
    sanitizeDay: sanitizeDay
};