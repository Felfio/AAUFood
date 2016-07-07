"use strict";

function getMenuName(index, menu) {
    if (index < 2)
        return "Menü Classic " + (index + 1);
    if (menu.isInfo)
        return "Information";

    return "Tagesteller";
}

module.exports = {
    getMenuName: getMenuName
};