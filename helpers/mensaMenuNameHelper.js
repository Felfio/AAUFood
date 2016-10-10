"use strict";

function getMenuName(index, menu) {
    if (index < 2)
        return "Menü Classic " + (index + 1);
    if (menu.isInfo)
        return "Information";

    return "AAU Teller";
}

module.exports = {
    getMenuName: getMenuName
};