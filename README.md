     _     _             _                            _             
    | |__ (_) __ _  __ _(_) ___       _ __ ___  _   _| |_  ___ _ __ 
    | '_ \| |/ _` |/ _` | |/ _ \_____| '__/ _ \| | | | __|/ _ \ '__|
    | |_) | | (_| | (_| | |  __/_____| | | (_) | |_| | |_|  __/ |   
    |_.__/|_|\__, |\__, |_|\___|     |_|  \___/ \__,_|\__|\___|_|   
             |___/ |___/                                           _

Biggie-router is a high performance, extendable router for use in frameworks and applications. It draws inspiration from several popular open source frameworks and libraries, such as [jQuery](http://www.jquery.com/) and [Sinitra](http://www.sinatrarb.com/).

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

Modules are functions that return a function, enabling you to do per-route setup. Biggie-router comes with the following default modules (not an exhaustive list):

* `static` - Serve static files
* `gzip` - Compress data with gzip

There are also a few extra methods added to the response object, which make it easier to form responses:

* `setBody` - Set the `body` property to any value. Arguments: `data`
* `appendBody` - Append a value to the `body` property. Arguments: `data`
* `getBody` - Retrieve the value of `body`, specify encoding as first argument to grab the string value.
* `send` - Quick way to send a response. Arguments are: `statusCode`, `body`, `headers`
* `sendBody` - Quickest way to send a response. Determines the best way to send the content. Objects are formed into JSON, strings are send as HTML. Arguments are: `statusCode`, `body`, `headers`
* `sendJson` - Send a Object or String as JSON. Arguments: `statusCode`, `json`, `headers`
* `sendText` - Send a String as `text/plain`. Arguments: `statusCode`, `text`, `headers`
* `sendHeaders` - Similar to the Node.js `writeHead`, except it will add extra headers to make them more compliant with browsers. Arguments: `statusCode`, `headers`, `body`. Specifying the `body` argument will ensure the `Content-Lenth` header is set to the correct value.
* `sendRedirect` - Send the browser a redirect. Arguments: `location`, `body`, `headers`

*Note: `statusCode` is an optional argument for all `send` methods.*

Here we create a 'post' module, which pre-buffers the POST data for later use. We then call `next` to drop to the next processing layer, which in this case is a binded function that sends off the response.

    var Router = require('biggie-router');
    var router = new Router();

    router.addModule('post', function () {
      return function (request, response, next) {
        response.addListener('data', function (buffer) {
          response.appendBody(buffer);
        });
        response.addListener('end', function () {
          next();
        });
      };
    });

    router.post('/').module('post').bind(function (request, response, next) {
      // response.body now contains the POST data
      // Send it back to the browser
      response.sendBody(200, response.body);
    });

    router.listen(8080);

Modules can also be Common-JS modules. The following will send 'Modularized!' to the browser:

`module.js`

    module.exports = function (text) {
      return function (request, response, next) {
        response.setBody(text);
        next();
      };
    };

`router.js`


    var Router = require('biggie-router');
    var router = new Router();

    router.addModule('modularize', './module');

    router.module('modularize', 'Modularized!').bind(function (request, response, next) {
      response.sendBody(200, response.body);
    });
