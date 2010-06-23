
var assert = require('assert'),
    vows   = require('vows'),
    utils  = require('./../utils');

var test = vows.describe('core'),
    router;

utils  = utils.getContext();
router = utils.router;

router.get('/').
       post('/').
       put('/').
       del('/').
       options('/').
       bind(function (request, response, next) {
  response.sendBody("passed");
});

router.all('/all').
       bind(function (request, response, next) {
  response.sendBody('passed');
});

router.get('/notfound').bind(function (request, response) {
  response.sendBody(404, 'passed');
});

test.addBatch({
  "GET /":         utils.respondsWith(200, "passed"),
  "POST /":        utils.respondsWith(200, "passed"),
  "PUT /":         utils.respondsWith(200, "passed"),
  "DELETE /":      utils.respondsWith(200, "passed"),
  "OPTIONS /":     utils.respondsWith(200, "passed"),
  "HEAD /":        utils.respondsWith(200, null),

  "GET /all":      utils.respondsWith(200, "passed"),
  "POST /all":     utils.respondsWith(200, "passed"),
  "PUT /all":      utils.respondsWith(200, "passed"),
  "DELETE /all":   utils.respondsWith(200, "passed"),
  "OPTIONS /all":  utils.respondsWith(200, "passed"),
  "HEAD /all":     utils.respondsWith(200, null),

  "GET /notfound": utils.respondsWith(404, "passed"),
});

test.export(module);
