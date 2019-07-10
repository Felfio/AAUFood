"use strict";

function getMenuName(index, isInfo) {
    if (isInfo)
        return "Information";
    if (index == 0)
        return "Tagesteller";
    if (index == 3)
        return "AAU Teller";

    return "Menü Classic " + index;
}

module.exports = {
    getMenuName: getMenuName
};
