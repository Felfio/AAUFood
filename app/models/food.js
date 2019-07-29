"use strict";

const allergenRegex = /(\(?\s*(\s*.\s*,|.\s*,\s*.)+,?\s*\)?)\s*$/i;

class Food {
    constructor(name, price, isInfo) {
        this.name = name;
        if (price != null && !isNaN(price))
            this.price = price;
        this.isInfo = isInfo === true;

        this.extractAllergens();
    }

    extractAllergens() {
        this.allergens = null;

        if (this.isInfo || !this.name)
            return;
        
        var allergenMatch = allergenRegex.exec(this.name);
        if (allergenMatch == null)
            return;

        // Cleanup allergens: Remove all irrelevant chars, uppercase them, separate them by ','
        this.allergens = allergenMatch[0].replace(/[^A-Za-z]/ig, "").toUpperCase().replace(/(.)(?=.)/g, '$1,');
        this.name = this.name.substring(0, allergenMatch.index).trim();
    }
}

module.exports = Food;
