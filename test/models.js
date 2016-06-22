'use strict';

const chai = require('chai');
const expect = chai.expect;
const Food = require('../models/food');
const Menu = require('../models/menu');

describe('Food', function () {
    describe('#constructor()', function () {
        it('should set properties "name" and "price" if passed.', function () {
            var food = new Food('Testmenu', 7.5);
            expect(food.name).to.equal('Testmenu');
            expect(food.price).to.equal(7.5);
        });

        it('should set properties "name" and "price" to undefined, if nothing passed.', function () {
            var food = new Food();
            expect(food).to.have.property('name', undefined);
            expect(food).to.have.property('price', undefined);
        });
    });
});

describe('Menu', function () {
    describe('#constructor()', function () {
        it('should have array properties "starters", "mains" and "alacarte" with length 0.', function () {
            var menu = new Menu();
            expect(menu.starters).to.be.instanceof(Array);
            expect(menu.starters).to.be.empty;

            expect(menu.mains).to.be.instanceof(Array);
            expect(menu.mains).to.be.empty;

            expect(menu.alacarte).to.be.instanceof(Array);
            expect(menu.alacarte).to.be.empty;
        });
    });
});
