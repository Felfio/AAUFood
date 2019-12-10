"use strict";

const allergenRegex = /(\(?\s*(\s*.\s*,|.\s*,\s*.)+,?\s*\)?|\(.\))\s*$/i;
const fullCapsAllergenRegex = /([A-Z]+)$/;

class Food {
    constructor(name, price, isInfo) {
        this.name = name;
        if (price != null) {
            if (typeof price === 'number' && !isNaN(price)){
                this.price = price;
            } else if(typeof price === "string") {
                this.price = price.replace(/ +€?$/, ""); // trim leading spaces and € signs
            }
        } 
        this.isInfo = isInfo === true;

        this.extractAllergens();
    }

    extractAllergens() {
        this.allergens = null;

        if (this.isInfo || !this.name)
            return;

        var allergenMatch = allergenRegex.exec(this.name);
        if (allergenMatch != null) {
            // Cleanup allergens: Remove all irrelevant chars, uppercase them, separate them by ','
            this.allergens = allergenMatch[0].replace(/[^A-Za-z]/ig, "").toUpperCase().replace(/(.)(?=.)/g, '$1,');
            this.name = this.name.substring(0, allergenMatch.index).trim();
            return;
        }

        allergenMatch = fullCapsAllergenRegex.exec(this.name);
        if (allergenMatch != null) {
            // Separate allergens by ','
            this.allergens = allergenMatch[0].split("").join(",");
            this.name = this.name.substring(0, allergenMatch.index).trim();
        }

    }
}

module.exports = Food;
