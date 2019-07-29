'use strict';

const chai = require('chai');
const expect = chai.expect;
const timeHelper = require('../helpers/timeHelper');

describe('timeHelpers', function () {
    describe('#sanitizeDay()', function () {
        it('should return values between 0 or 6.', function () {
            for (var i = -10; i <= 10; i++) {
                let result = timeHelper.sanitizeDay(i);
                expect(result).to.be.at.least(0);
                expect(result).to.be.at.most(6);
            }
        });
    });

    describe('#weekDayName()', function () {
        var weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

        it('should return the correct weekday name for values between 0 and 6.', function () {
            for (var i = 0; i < weekdays.length; i++) {
                expect(timeHelper.weekDayName(i)).to.be.equal(weekdays[i]);
            }
        });

        it('should return undefined for values smaller than 0 and larger than 6.', function () {
            expect(timeHelper.weekDayName(-1)).to.be.undefined;
            expect(timeHelper.weekDayName(7)).to.be.undefined;
        });
    });
});