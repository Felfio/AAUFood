const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const food = require('./routes/food');
const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/food', food);

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});