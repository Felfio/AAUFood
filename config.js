module.exports = {
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
    }
};