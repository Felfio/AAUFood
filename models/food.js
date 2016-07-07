"use strict";

class Food {
    constructor(name, price, isInfo) {
        this.name = name;
        if (price != null && !isNaN(price))
            this.price = price;
        this.isInfo = isInfo === true;
    }
}

module.exports = Food;
