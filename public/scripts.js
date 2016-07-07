require('./styles/app.scss');
require('jquery');
require('bootstrap');

var io = require('socket.io-client');
var Swipe = require('swipejs');

var dayStr = location.href.substring(location.href.lastIndexOf("/") + 1)
var day = dayStr.length ? +dayStr : null;
var overallVisitors = $('#overallVisitors');
var dailyVisitors = $('#dailyVisitors');
var swipe = new Swipe(document.getElementById('slider'), {
    startSlide: sanitizeDay(day),
    speed: 400,
    continuous: false,
    disableScroll: false
});

$(".nav-icon.left").click(swipe.prev);
$(".nav-icon.right").click(swipe.next);

var socket = io('/');
socket.on('newVisitor', function (data) {
    console.log(data);
    dailyVisitors.text(data.dailyVisitors);
    overallVisitors.text(data.overallVisitors);
});

function sanitizeDay(incDay) {
    if (incDay == null || isNaN(incDay)) {
        return ((new Date()).getDay() + 6) % 7;
    } else {
        if (incDay < 0) {
            incDay = 7 + (incDay % 7);
        }
        return incDay % 7;
    }
}