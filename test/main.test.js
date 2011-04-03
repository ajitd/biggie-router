var assert = require('assert'),
    Router = require('../');

var r = new Router;

r.bind(function (request, response, next) {
  next.send('Testing');
});

r.listen(8080);
