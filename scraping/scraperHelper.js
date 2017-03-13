"use strict";

function _setErrorOnEmpty(menu) {
    if (!menu.closed && !menu.noMenu && (menu.starters.length + menu.mains.length + menu.alacarte.length === 0)) {
        menu.error = true;
    }
    return menu;
}

function _invalidateMenus (weekPlan) {
  for (let i = 0; i < 6; i++) {
      let outdatedMenu = new Menu();
      outdatedMenu.outdated = true;
      weekPlan[i] = outdatedMenu;
  }
  return weekPlan;
}

function _sanitizeName(val) {
    if (typeof val === "string") {
        val = val.replace(/€?\s[0-9](,|.)[0-9]+/, ""); // Replace '€ 00.00'
        val = val.replace(/^[1-9].\s/, ""); // Replace '1. ', '2. '
        val = val.replace(/^[,\.\-\\\? ]+/, "");
        val = val.replace(/[,\.\-\\\? ]+$/, "");
        return val.trim();
    } else if (typeof val === "object" && val.length > 0) {
        for (let i = 0; i < val.length; i++) {
            val[i] = sanitizeName(val[i]);
        }
        return val;
    } else {
        return val;
    }
}

module.exports = {
    setErrorOnEmpty: _setErrorOnEmpty,
    invalidateMenus: _invalidateMenus,
    sanitizeName: _sanitizeName
};
