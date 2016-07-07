const FooterPun = require("./models/footerPun");

module.exports = {
    settings: {
        useRandomFooterPuns: false,
        defaultFooterPun: "heart"
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