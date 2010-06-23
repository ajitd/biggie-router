
var assert = require('assert'),
    vows   = require('vows'),
    utils  = require('./../utils'),
    fs     = require('fs');

var test = vows.describe('static'),
    router,
    body = fs.readFileSync(__filename).toString('utf8');

utils  = utils.getContext();
router = utils.router;

router.get('/static/static.js').
       module('static', __dirname, '/static').
       bind(function (request, response) {
  response.sendBody(404, "failed");
});

test.addBatch({
  'GET /static/static.js': utils.respondsWith(200, body, {
    'content-length': body.length,
    'content-type': 'application/javascript; charset=utf-8'
  }),
});

test.export(module);
