
Biggie-router is a high performance, extendable router for use in frameworks and applications. It draws inspiration from several popular open source frameworks and libraries, such as [jQuery](http://www.jquery.com/) and [Sinatra](http://www.sinatrarb.com/).

## License

Biggie-router is released under MIT, in hope you find this software useful.

## Installing it

The fastest way to get started with biggie-router is to install it via **npm**.

    $ npm install biggie-router

Otherwise `git clone`, or download the repository and place the contents of the `lib` directory where needed.
## Usage

Here are a few basic examples.

Hello world, that listens on port 8080:

    var Router = require('biggie-router');
    var router = new Router();

    router.bind(function (request, response, next) {
      response.sendBody(200, "Hello World!");
    });

    router.listen(8080);

---

Basic routing + chaining. Responds with hello world on root and `/index.html` get requests.

Requests that fall through (don't match any conditions) get passed to the next route and are sent a 404.

    var Router = require('biggie-router');
    var router = new Router();

    router.get('/').get('/index.html')
          .bind(function (request, response, next) {
      response.sendBody(200, "Hello World!");
    });

    router.bind(function (request, response, next) {
      response.sendBody(404, 'Resource "' + request.url + '" not found.');
    });

    router.listen(8080);

---

Modules are functions that return a function, enabling you to do per-route setup. No modules are supplied with biggie-router, however middleware use the same pattern as connect (or express); so generic connect middleware should also be compatible with biggie. The npm `middleware` module is also compatible.

Usage is as follows:

    var middleware = require('middleware');

    router.get('/').bind(middleware.sendfile('public/'));

    router.post('/users').bind(api('users', 'create'));
