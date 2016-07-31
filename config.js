const FooterPun = require("./models/footerPun");
const BreakInfo = require("./models/breakInfo");

module.exports = {
    settings: {
        useRandomFooterPuns: false,
        defaultFooterPun: "heart"
    },
    onBreak: {
        //The dates are only rendered, never used for checking if closed!
        mensa: new BreakInfo("Sommerpause", "Das Mensa-Team macht Pause.", "1.8 ", "31.8", "fa-sun-o")
    },
    cache: {
        redisUrl: "//localhost:6379",
        // Time in miliseconds -> 20 min.
        intervall: 1200000,
        overallVisitorKey: "overallVisitors",
        dailyVisitorKey: "dailyVisitors"
    },
    scraper: {
        mensaUrl: "http://menu.mensen.at/index/index/locid/45",
        uniwirtUrl: "http://www.uniwirt.at/Default.aspx?SIid=4&LAid=1",
        mittagstischUrl: "http://www.lakeside-scitec.com/services/gastronomie/mittagstisch/"
    },
    userFriendlyUrls: {
        //Usually the same as the scraper ones
        mensa: "http://menu.mensen.at/index/index/locid/45",
        uniwirt: "http://www.uniwirt.at/Default.aspx?SIid=4&LAid=1",
        mittagstisch: "http://www.lakeside-scitec.com/services/gastronomie/mittagstisch/"
    },
    cookie: {
        // 30 days in milliseconds
        maxAge: 2592000000
    },
    externalApis: {
        paramKey: "${param}",
        numbersApi: "http://numbersapi.com/${param}",
        catFactsApi: `http://catfacts-api.appspot.com/api/facts?number=1` //We want to work with single facts, so number is not a param here
    },
    footerPuns: [
        new FooterPun("heart", "Crafted with", "fa-heart"),
        new FooterPun("empire", "Constructed for the", "fa-empire", "http://starwars.wikia.com/wiki/Galactic_Empire"),
        new FooterPun("rebellion", "Join the", "fa-rebel", "http://starwars.wikia.com/wiki/Alliance_to_Restore_the_Republic"),
        new FooterPun("star", "Hey look!", "fa-star fa-spin", null, " It's spinning!")
    ]
};