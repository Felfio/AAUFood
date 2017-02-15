"use strict";

function getMenuName(index, menu) {
    if (index > 0)
        return "Menü Classic " + index;
    if (menu.isInfo)
        return "Information";

    return "AAU Special";
}

module.exports = {
    getMenuName: getMenuName
};
