"use strict";

function setErrorOnEmpty(menu) {
    if (!menu.closed && !menu.noMenu && (menu.starters.length + menu.mains.length + menu.alacarte.length === 0)) {
        menu.error = true;
    }
    return menu;
}

function invalidateMenus (weekPlan) {
  for (let i = 0; i < 6; i++) {
      let outdatedMenu = new Menu();
      outdatedMenu.outdated = true;
      weekPlan[i] = outdatedMenu;
  }
  return weekPlan;
}

function sanitizeName(val) {
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

function decapitalize(string)
{
    const exceptionList = ["in", "an", "mit", "und"]; //words that should not be capitalized
    const seperators = [" ", "\"", "-"]; //seperators, make sure to keep "-" at end (different semantics)
    var regex = new RegExp("["+seperators.join("")+"]","g")
    // split string and captialize words
    let words = string.split(regex);
    words.forEach(function callback(element,index,array) {
        if (!exceptionList.includes(element))
            array[index] = capitalizeFirstLetter(element);
    })
    let returnstring = words.join(" ");
    
    // interweave with old string to insert correct special characters
    let i = string.length;
    while (i--){
        if(string.charAt(i).match(regex))
            returnstring = returnstring.substr(0,i)+string.charAt(i)+returnstring.substr(i+1);
    }
    return returnstring;
}

function capitalizeFirstLetter(string, delim, exceptionList)
{
    if (string !== "" && string !== null)
    {
        let retstring = string.toLowerCase();
        retstring = retstring[0].toUpperCase()+retstring.substr(1);
        return retstring;
    } else {
        return "";
    }
}

const priceRegex = /(\d+[,\.]?\d*)/
function parsePrice(str) {
    if (!str){
        return null;
    }

    let match = priceRegex.exec(str);
    if (match) {
        return +match[0].replace(',', '.');
    } else {
        return null;
    }
}

function stripHtml(str){
    if(!str){
        return str;
    }

    return str.replace(/<\/?[^>]+(>|$)/g, "");
}

module.exports = {
    setErrorOnEmpty,
    invalidateMenus,
    sanitizeName,
    capitalizeFirstLetter,
    decapitalize,
    parsePrice,
    stripHtml,
};
