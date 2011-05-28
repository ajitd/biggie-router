var assert = require('assert'),
    Router = require('../');

var r = new Router;

r.next.bend = function () {
  this.send('Bending')
}

r.bind(function (request, response, next) {
  next.bend();
});

r.listen(8080);
