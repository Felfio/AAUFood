require('./styles/app.scss');
require('jquery');
require('bootstrap');

window.cookieconsent_options = {
    container: "#cookieConsentHolder",
    message: "Wir verwenden Cookies, um die Anzahl der Besucher zu ermitteln. Es werden natürlich keine Daten an Dritte weitergegeben.",
    dismiss: "OK",
    learnMore: "",
    link: null,
    theme: "dark-bottom"
};

require('cookieconsent');

var io = require('socket.io-client');
var Swipe = require('swipejs');

var dayStr = location.href.substring(location.href.lastIndexOf("/") + 1)
var day = dayStr.length ? +dayStr : null;
var overallVisitors = $('#overallVisitors');
var dailyVisitors = $('#dailyVisitors');

var socket = io();
socket.on('newVisitor', function (data) {
    console.log(data);
    dailyVisitors.text(data.dailyVisitors);
    overallVisitors.text(data.overallVisitors);
});

initSlider();
initNameShuffling();

var mailPre = "knechtcraft", mailDomain = "gmail.com";
$("#mail").text(mailPre + "@" + mailDomain);

function initSlider() {
    var swipe = new Swipe(document.getElementById('slider'), {
        startSlide: sanitizeDay(day),
        speed: 400,
        continuous: false,
        disableScroll: false,
        transitionEnd: toggleSlideButtons //"callback" gives better results, but lags on both desktop and mobile devices
    });

    var leftSlideButtons = $('.nav-icon.left');
    var rightSlideButtons = $('.nav-icon.right');
    toggleSlideButtons(sanitizeDay(day));

    /**
     * Slide buttons should look disabled when no button-press is possible
     */
    function toggleSlideButtons(day) {
        if (day == 0) {
            leftSlideButtons.addClass('disabled');
        } else {
            leftSlideButtons.removeClass('disabled');
        }
        if (day == 6) {
            rightSlideButtons.addClass('disabled');
        } else {
            rightSlideButtons.removeClass('disabled');
        }
    }

    leftSlideButtons.click(swipe.prev);
    rightSlideButtons.click(swipe.next);

    window.onkeyup = function (e) {
        var key = e.keyCode ? e.keyCode : e.which;

        if (key == 37) {
            swipe.prev();
        } else if (key == 39) {
            swipe.next();
        }
    };

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
}

function initNameShuffling() {
    var names = ["<span class='about-name' id='kristina'>Kristina</span>",
        "<span class='about-name' id='markus'><a href='https://github.com/mrukas'>Markus</a></span>",
        "<span class='about-name' id='fabian'><a href='https://github.com/Kruemelkatze'>Fabian</a></span>"];
    swapNames();
    if (window.location.pathname.indexOf("/about") === 0) {
        setInterval(swapNames, 5000);
    }

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
}
