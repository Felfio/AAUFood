const express = require('express');
const path = require('path');
const NodeCache = require("node-cache");
const moment = require('moment');
const bodyParser = require('body-parser');
const compression = require('compression');
const logger = require('morgan');
const menuCache = require('./caching/menuCache');
const visitorCache = require('./caching/visitorCache');
const config = require('./config');
const indexRoutes = require('./routes/index');
const foodRoutes = require('./routes/food');
//const winston = require('winston');
const timeHelper = require('./helpers/timeHelper');
const footerPunHelper = require('./helpers/footerPunHelper');
const breakHelper = require('./helpers/breakHelper');
const placeKittenHelper = require('./helpers/placeKittenHelper');
const menuStateHelper = require('./helpers/menuStateHelper');


const session = require('express-session');
const cacheClient = new NodeCache({ checkperiod: 30 });
const app = express();

//winston.add(winston.transports.File, { filename: 'logfile.log' });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: config.cookie
}));

app.use(compression());
app.use(express.static(__dirname + '/public'));
app.use("/modules", express.static(__dirname + "/node_modules"));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', indexRoutes);
app.use('/food', foodRoutes);

app.use('/app/test', function (req, res, next) {
    const randomId = `${Math.random()}`.slice(2);
    const path = `/api/item/${randomId}`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
    res.end(`Hello! Fetch one item: <a href="${path}">${path}</a>`);
});

app.use(function (err, req, res, next) {
    console.log("Im finalen Error Handler!");
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

const io = require('socket.io')(server);

menuCache.init(cacheClient);
visitorCache.init(cacheClient, io);

setInterval(() => menuCache.update(), config.cache.intervall);
setTimeout(() => {
    visitorCache.clearDaily();
    setInterval(() => visitorCache.clearDaily(), 24 * 60 * 60 * 1000);
}, timeHelper.getMsUntilMidnight());

module.exports = app;