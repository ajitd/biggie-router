var Router = require('../lib/biggie-router'),
    Buffer = require('buffer').Buffer,
    sys    = require('sys');

var r = new Router();

r.bind(function (next, request, response) {
  sys.puts(sys.inspect(request));
  next();
});

r.get('/').bind(function (next, request, response) {
  response.sendBody('Hello World!');
});

r.addModule('123ify', {
  setup: function setup(arg1, arg2) {
    this.arg1 = arg1;
    this.arg2 = arg2;
  },
  handle: function handle(next, request, response) {
    response.setBody(this.arg1);
    response.appendBody(new Buffer(this.arg2));
    next();
  }
});

r.addModule('send', function (next, request, response) {
  response.sendBody(response.body);
});

r.addModule('file', __dirname + '/test-module');

r.get(/^\/(123)/)
 .bind(function (next, request, response, $1) {
    sys.puts($1);
    sys.puts(sys.inspect(request.parseUrl()));
    response.setBody('test');
    next();
  })
 .module('123ify', 123, 'ify')
 .module('file')
 .module('send');

r.get(/^\/files\/.*$/).module('gzip').module('static', __dirname, '/files').bind(function (next, request, response) {
  response.sendBody('Could not find ' + request.url);
});

r.listen(8080);
