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
    disableScroll: false,
    transitionEnd: toggleSlideButtons,
});

toggleSlideButtons(sanitizeDay(day));

/**
 * Slide buttons should look disabled when no button-press is possible
 */
function toggleSlideButtons(day) {
  if (day == 0) {
    $('.nav-icon.left').addClass('disabled');
  } else {
    $('.nav-icon.left').removeClass('disabled');
  }
  if (day == 6) {
    $('.nav-icon.right').addClass('disabled');
  } else {
    $('.nav-icon.right').removeClass('disabled');
  }
}

$(".nav-icon.left").click(swipe.prev);
$(".nav-icon.right").click(swipe.next);

var names = ["<span id='kristina'>Kristina</span>", "<span id='markus'>Markus</span>", "<span id='fabian'>Fabian</span>"];
swapNames();
if(window.location.pathname.indexOf("/about") === 0) {
    setInterval(swapNames, 5000);
}

var mailPre = "knechtcraft", mailDomain = "gmail.com";
$("#mail").text(mailPre + "@" + mailDomain);

var socket = io();
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

window.onkeyup = function (e) {
    var key = e.keyCode ? e.keyCode : e.which;

    if (key == 37) {
        swipe.prev();
    } else if (key == 39) {
        swipe.next();
    }
};

function swapNames() {
    shuffle(names);
    $("#name0").html(names[0]);
    $("#name1").html(names[1]);
    $("#name2").html(names[2]);
}

/**
 * Shuffles array in place.
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}
