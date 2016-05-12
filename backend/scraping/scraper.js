const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const cheerio = require('cheerio');

function downloadUniwirt() {
    return request.getAsync('http://www.uniwirt.at/')
        .then(res => res.body)
        .then(parseUniwirt);
}

function parseUniwirt(body) {
    var $ = cheerio.load(body);
    var first = $("#HomeWrapper .floatLeft.col190").first();
    console.log(first.text());
    var siblings = first.nextUntil('h3', '.floatLeft.col190');

    siblings.each((index, item) => console.log($(item).text()));

}

module.exports = {
    downloadUniwirt: downloadUniwirt
};