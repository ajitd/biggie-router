
    var Router = require('biggie-router');

    // Grab a router object
    var r = new Router();

    // Root requests
    r.get('/').bind(function (next, request, response) {
      response.sendBody('Hello World!');
    });

    // Chaining
    r.get('/test').post('/test').all('/something')
     .bind(function (next, request, response) {
        require('sys').puts('Incoming!');
        next();
      })
     .bind(function (next, request, response) {
        response.sendJson({
          hello: 'world',
          headers: request.headers,
          url: request.parseUrl()
        });
     });

    // Modules. Add your own, and use some of the defaults.
    r.addModule('laser', {
      handle: function (next, request, response) {
        response.appendBody('\nGoes pow!');
        next();
      }
    });
    // or
    r.addModule('cannon', function (next, request, response) {
      response.appendBody('\nGoes boom!');
      next();
    });
    // or as a module
    r.addModule('file', './common-js');

    // Use them!
    r.get('/modules')
     .bind(function (next, request, response) {
        response.setBody('My weapon');
        next();
     })
     .module('laser')
     .module('cannon')
     .bind(function (next, request, response) {
        // response.body can be used by modules for
        // modification.
        response.sendBody(response.body);
        // Outputs:
        // My weapon
        // Goes pow!
        // Goes boom!
     });

    r.listen(8080);
