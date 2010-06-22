
    var Router = require('biggie-router');

    // Grab a router object
    var r = new Router();

    // Root requests
    r.get('/').bind(function (request, response, next) {
      response.sendBody('Hello World!');
    });

    // Chaining
    r.get('/test').post('/test').all('/something')
     .bind(function (request, response, next) {
        require('sys').puts('Incoming!');
        next();
      })
     .bind(function (request, response, next) {
        response.sendJson({
          hello: 'world',
          headers: request.headers,
          url: request.parseUrl()
        });
     });

    // Modules. Add your own, and use some of the defaults.
    r.addModule('laser', {
      handle: function (request, response, next) {
        response.appendBody('\nGoes pow!');
        next();
      }
    });
    // or
    r.addModule('cannon', function (request, response, next) {
      response.appendBody('\nGoes boom!');
      next();
    });
    // or as a module
    r.addModule('file', './common-js');

    // Use them!
    r.get('/modules')
     .bind(function (request, response, next) {
        response.setBody('My weapon');
        next();
     })
     .module('laser')
     .module('cannon')
     .bind(function (request, response, next) {
        // response.body can be used by modules for
        // modification.
        response.sendBody(response.body);
        // Outputs:
        // My weapon
        // Goes pow!
        // Goes boom!
     });

    r.listen(8080);
