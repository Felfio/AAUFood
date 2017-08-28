const Promise = require('bluebird');
const request = Promise.promisifyAll(require("request"));
const config = require('../config');

function getGenericResponse(url, lambda) {
    return request.getAsync(url)
        .then(res => res.body)
        .then(lambda);
}

function getNumberFact(num) {
    var url = config.externalApis.numbersApi.replace(config.externalApis.paramKey, num);
    return getGenericResponse(url, body => body);
}

function getCatFact() {
    var url = config.externalApis.catFactsApi;
    return getGenericResponse(url, body => {
        var json = JSON.parse(body);
        return json.fact && json.length ? json.fact : null;
    });
}

module.exports = {
    getCatFact: getCatFact,
    getNumberFact: getNumberFact,
    getGenericResponse: getGenericResponse
};
