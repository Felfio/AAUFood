const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const compression = require('compression');
const logger = require('morgan');
const menuCache = require('./caching/menuCache');
const visitorCache = require('./caching/visitorCache');
const config = require('./config');
const indexRoutes = require('./routes/index');
const foodRoutes = require('./routes/food');
const winston = require('winston');
const app = express();

winston.add(winston.transports.File, {filename: 'logfile.log'});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(compression());
app.use(express.static(__dirname + '/public'));
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

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

menuCache.init();
visitorCache.init();

setInterval(() => menuCache.update(), config.cache.intervall);
