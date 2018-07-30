"use strict";
const breakHelper = require('./breakHelper');

const MenuState = {
    Normal: 0,
    OnBreak: 1,
    Closed: 2,
    NoMenu: 3,
    Outdated: 4,
    Error: 5,
}

function getMenuState(restaurant, menu) {
    let isOnBreak = breakHelper.isOnBreak(restaurant);
    if(isOnBreak)
        return MenuState.OnBreak;

    if(menu == null || menu.error)
        return MenuState.Error;

    if(menu.closed)
        return MenuState.Closed;

    if(menu.outdated)
        return MenuState.Outdated;

    if(menu.noMenu)
        return MenuState.NoMenu;

    return MenuState.Normal;
}

module.exports = {
    getMenuState: getMenuState,
    MenuState: MenuState,
};
