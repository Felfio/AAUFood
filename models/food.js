"use strict";

class Food {
    constructor(name, price) {
        this.name = name;
        if(price != null && !isNaN(price))
            this.price = price;
    }
}

module.exports = Food;
