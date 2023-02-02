const express = require('express');
const path = require('path');
const NodeCache = require("node-cache");
const bodyParser = require('body-parser');
const compression = require('compression');
const logger = require('morgan');

const moment = require('moment');
require('moment/locale/de');
moment.locale('de');

const menuCache = require('./caching/menuCache');
const config = require('./config');
const indexRoutes = require('./routes/index');
const foodRoutes = require('./routes/food');
const timeHelper = require('./helpers/timeHelper');
const footerPunHelper = require('./helpers/footerPunHelper');
const breakHelper = require('./helpers/breakHelper');
const placeKittenHelper = require('./helpers/placeKittenHelper');
const menuStateHelper = require('./helpers/menuStateHelper');

const cacheClient = new NodeCache({ checkperiod: 30 });
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(compression());
if (!process.env.NO_STATIC_FILES) {
    console.log("Serving static files from /public")
    app.use(express.static(__dirname + '/../public'));
}
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', indexRoutes);
app.use('/food', foodRoutes);

app.use(function (err, req, res, next) {
    res.status(500);
    res.json({ error: err.message });
});

//Locals for usage in views
app.locals.moment = moment;
app.locals.timeHelper = timeHelper;
app.locals.getFooterPun = footerPunHelper.getFooterPun;
app.locals.userFriendlyUrl = restaurant => config.userFriendlyUrls[restaurant];
app.locals.isOnBreak = breakHelper.isOnBreak;
app.locals.getBreakInfo = breakHelper.getBreakInfo;
app.locals.menuStateHelper = menuStateHelper;
app.locals.catFactHeaderUrl = placeKittenHelper.catFactHeaderUrl;
app.locals.isWinterThemeEnabled = () => {
    const [from, to] = config.settings.winterTheme.map(d => moment(d, "DD.MM"));
    return !moment().isBetween(to, from);
};

var server = app.listen(config.settings.nodePort, function () {
    console.log('AAU Food listening on port ' + config.settings.nodePort + '!');
});

menuCache.init(cacheClient);
setInterval(() => menuCache.update(), config.cache.intervall);

module.exports = app;