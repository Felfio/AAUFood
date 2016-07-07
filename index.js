const express = require('express');
const bluebird = require('bluebird');
const path = require('path');
const redis = require('redis');
const bodyParser = require('body-parser');
const compression = require('compression');
const logger = require('morgan');
const menuCache = require('./caching/menuCache');
const visitorCache = require('./caching/visitorCache');
const config = require('./config');
const indexRoutes = require('./routes/index');
const foodRoutes = require('./routes/food');
const winston = require('winston');
const timeHelper = require('./helpers/timeHelper');
const mensaMenuNameHelper = require('./helpers/mensaMenuNameHelper');
const footerPunHelper = require('./helpers/footerPunHelper');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redisClient = redis.createClient(config.cache.redisUrl);
const app = express();

winston.add(winston.transports.File, {filename: 'logfile.log'});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    store: new RedisStore({client: redisClient}),
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
app.use(bodyParser.urlencoded({extended: false}));

app.use('/', indexRoutes);
app.use('/food', foodRoutes);

app.use(function (err, req, res, next) {
    console.log("Im finalen Error Handler!");
    res.status(500);
    res.json({error: err.message});
});

//Locals for usage in views
app.locals.weekDayName = timeHelper.weekDayName;
app.locals.getMensaMenuName = mensaMenuNameHelper.getMenuName;
app.locals.getFooterPun = footerPunHelper.getFooterPun;

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

menuCache.init(redisClient);
visitorCache.init(redisClient);

setInterval(() => menuCache.update(), config.cache.intervall);
