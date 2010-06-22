var Router = require('../lib/biggie-router'),
    Buffer = require('buffer').Buffer,
    sys    = require('sys');

var r = new Router();

r.bind(function (request, response, next) {
  sys.puts(sys.inspect(request));
  next();
});

r.get('/').bind(function (request, response, next) {
  response.sendBody('Hello World!');
});

r.addModule('123ify', function (arg1, arg2) {
  return function (request, response, next) {
    response.setBody(arg1);
    response.appendBody(new Buffer(arg2));
    next();
  };
});

r.addModule('send', function () {
  return function (request, response, next) {
    response.sendBody(response.body);
  };
});

r.addModule('file', __dirname + '/test-module');

r.get(/^\/(123)/)
 .bind(function (request, response, next, $1) {
    sys.puts($1);
    sys.puts(sys.inspect(request.parseUrl()));
    response.setBody('test');
    next();
  })
 .module('123ify', 123, 'ify')
 .module('file')
 .module('send');

r.get(/^\/files\/.*$/).module('gzip').module('static', __dirname, '/files').bind(function (request, response, next) {
  response.sendBody('Could not find ' + request.url);
});

r.listen(8080);
