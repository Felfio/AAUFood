import './styles/app.scss';
import 'bootstrap'
import $ from 'jquery';
import Swipe from 'swipejs';

import { initSnowFall } from "./snowFall";

window.$ = $;

var dayStr = location.href.substring(location.href.lastIndexOf("/") + 1)
var day = dayStr.length ? +dayStr : null;

var version = '__VERSION__'.startsWith('__') ? '?' : '__VERSION__'; // __VERSION__ is replaced by rollup
var versionElement = document.getElementById('version');
if (versionElement) {
    versionElement.innerHTML = version;
}

$(function () {
    // Both slider and snowfall depend on window size
    // This messy setup was the only way to get both working correctly
    requestAnimationFrame(function () {
        initSlider();
        initSnowFall();
    });
    initNameShuffling();
});

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
    var names = [
        '<span id="kristina">Kristina</span>',
        '<a id="markus" href="https://github.com/mrukas">Markus</a>',
        '<a id="fabian" href="https://github.com/Kruemelkatze">Fabian</a>'];

    var additionalNames = [
        '<a id="benjamin" href="https://github.com/behackl">Benjamin</a>',
        '<a id="philipp" href="https://github.com/phylib">Philipp</a>'];

    swapNames();
    if (window.location.pathname.indexOf("/about") === 0) {
        setInterval(swapNames, 5000);
    }

    function swapNames() {
        shuffle(names);
        $("#name0").html(names[0]);
        $("#name1").html(names[1]);
        $("#name2").html(names[2]);

        shuffle(additionalNames);
        $("#additionalName0").html(additionalNames[0]);
        $("#additionalName1").html(additionalNames[1]);
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
