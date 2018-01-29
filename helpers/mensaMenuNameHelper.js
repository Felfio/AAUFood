"use strict";

function getMenuName(index, menu) {
    if (index == 0)
        return "Tagesteller";
    if (index == 3)
        return "AAU Teller";
    if (menu.isInfo)
        return "Information";
    return "Menü Classic " + index;


}

module.exports = {
    getMenuName: getMenuName
};
