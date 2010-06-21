var Router = require('../lib/biggie-router'),
    Buffer = require('buffer').Buffer,
    sys    = require('sys');

var r = new Router();

r.get('/').bind(function (next, request, response) {
  response.writeHead(200);
  response.end('Hello World!');
});

r.addModule('123ify', {
  init: function init(arg1, arg2) {
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

r.get('/123')
 .bind(function (next, request, response) {
    sys.puts(sys.inspect(request.parseUrl()));
    response.setBody('test');
    next();
  })
 .module('123ify', 123, 'ify')
 .module('send');

sys.puts(sys.inspect(r.routes));

r.listen(8080);