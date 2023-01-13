"use strict";

const allergenRegex = /(\(?\s*(\s*.\s*,|.\s*,\s*.)+,?\s*\)?|\(.\))\s*$/i;
const fullCapsAllergenRegex = /([A-Z]+)$/;

class Food {
    name = "";
    price = null;
    isInfo = false;
    allergens = [];

    constructor(name, price, isInfo) {
        this.name = name;
        if (price != null) {
            if (typeof price === 'number' && !isNaN(price)) {
                this.price = price;
            } else if (typeof price === "string") {
                this.price = price.replace(/ +€?$/, ""); // trim leading spaces and € signs
            }
        }
        this.isInfo = isInfo === true;

        this.extractAllergens();
    }

    extractAllergens(extractFrom = null) {
        this.allergens = null;

        extractFrom = extractFrom || this.name;
        let extractedFromName = extractFrom === this.name;

        if (this.isInfo || !extractFrom)
            return;

        var allergenMatch = allergenRegex.exec(extractFrom);
        if (allergenMatch != null) {
            // Cleanup allergens: Remove all irrelevant chars, uppercase them, separate them by ','
            this.allergens = allergenMatch[0].replace(/[^A-Za-z]/ig, "").toUpperCase().replace(/(.)(?=.)/g, '$1,');

            if (extractedFromName) {
                this.name = this.name.substring(0, allergenMatch.index).trim();
            }
            return;
        }

        allergenMatch = fullCapsAllergenRegex.exec(extractFrom);
        if (allergenMatch != null) {
            // Separate allergens by ','
            this.allergens = allergenMatch[0].split("").join(",");
            if (extractedFromName) {
                this.name = this.name.substring(0, allergenMatch.index).trim();
            }
        }

    }
}

module.exports = Food;
