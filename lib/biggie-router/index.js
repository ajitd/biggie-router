//
// biggie-router
// (c) Tim Smart 2010
//
// Released under the MIT license
// See {insert_link} for license
//

var http         = require('http'),
    sys          = require('sys'),
    url          = require('url'),
    Buffer       = require('buffer').Buffer,
    response_ext = require('./response');

require('./request');

var log = function log(message) {
  // TODO: Insert date/time
  sys.puts('[router][' + '] ' + message);
};

// The Router prototype
var Router = function Router(config) {
  var self = this;

  // Routes container
  this.routes = [];

  // Module container
  this.modules = require('./modules');

  // The default config
  this.config = {
    headers: {
      'Server': 'node.js'
    },
    mode: 'production'
  };

  // Proxy the config over
  if (config) {
    Object.keys(config).forEach(function (key) {
      this.config[key] = config[key];
    });
  }

  response_ext.setDefaultHeaders(this.config.headers);

  // The underlying server
  http.Server.call(this, this._onRequest);

  return this;
};

// Extend http.Server
Router.prototype = (function () {
  var Server = function () {};
  Server.prototype = http.Server.prototype;
  return new Server();
})();
Router.prototype.constructor = Router;

// All requests proxy through this method
Router.prototype._onRequest = function _onRequest(request, response) {
  if (this.routes.length <= 0) {
    // We got nothing to work with :(
    response.writeHead(404);
    return response.end();
  }

  // Prevent crashes on HEAD requests
  if (request.method === 'HEAD') {
    var old_end = response.end;

    response.write = function write(data) {
      return data.length;
    };
    response.end = function end() {
      return old_end.call(response);
    };
  }

  var i     = 0,
      self  = this,
      next;

  // One route at a time, unless marked as parallel
  next = function next() {
    i++;
    if (self.routes[i]) {
      self.routes[i].handle(request, response, next);
    } else {
      // We have a 404 houston
      // TODO: Re-route this to some listeners
      response.sendText(404, 'Resource "' + request.url + '" not found.');
    }
  };

  // Get the party started
  this.routes[i].handle(request, response, next);
};

// Add a new module
Router.prototype.addModule = function addModule(name, module) {
  if (typeof module === 'string') {
    // Add a module via filesystem
    try {
      module = require(module);
      this.addModule(name, module);
    } catch (error) {
      log('Error: ' + error.message);
    }
  } else if (typeof module === 'function') {
    // Function that return a function module
    this.modules[name] = module;
  } else {
    log('Warning: Module "' + name + '" was not of recognised type.');
  }
};

// Low level api to manually create Route
Router.prototype.createRoute = function createRoute(config) {
  return new Route(this, config);
};

// Set a route as a parallel one
Router.prototype.parallel = function parallel() {
  var route = new Route(this, {
    parallel: true
  });
  this.routes.push(route);
  return route;
};

// Proxy method to create a new route with 'module'
Router.prototype.module = function module() {
  var route = new Route(this, {
    catch_all: true
  });
  this.routes.push(route);
  return route.module.apply(route, arguments);
};

// Proxy method to create a new route with 'bind'
Router.prototype.bind = function bind() {
  var route = new Route(this, {
    catch_all: true
  });
  this.routes.push(route);
  return route.bind.apply(route, arguments);
};

// Creates and proxies a method to the Route prototype
Router.prototype._proxyMethod = function _proxyMethod(verb, args) {
  var route = new Route(this);
  this.routes.push(route);
  return route[verb].apply(route, args);
};

// Proxy method to create a new route with 'all'
Router.prototype.all = function all() {
  return this._proxyMethod('all', arguments)
};

// Proxy method to create a new route with 'get'
Router.prototype.get = function get() {
  return this._proxyMethod('get', arguments)
};

// Proxy method to create a new route with 'post'
Router.prototype.post = function post() {
  return this._proxyMethod('post', arguments)
};

// Proxy method to create a new route with 'put'
Router.prototype.put = function put() {
  return this._proxyMethod('put', arguments)
};

// Proxy method to create a new route with 'del'
Router.prototype.del = function del() {
  return this._proxyMethod('del', arguments)
};

// Proxy method to create a new route with 'options'
Router.prototype.options = function options() {
  return this._proxyMethod('options', arguments)
};

// The Route prototype
var Route = function Route(router, config) {
  this.router = router;
  // The default config
  this.config = {
    parallel: false,
    catch_all: false
  };

  // The route table
  this.table = {
    GET: [],
    POST: [],
    PUT: [],
    DELETE: [],
    OPTIONS: []
  };

  // The processing layers
  this.layers = [];

  // Proxy the config over
  if (config) {
    var self = this;
    Object.keys(config).forEach(function (key) {
      self.config[key] = config[key];
    });
  }

  return this;
};

// The proxy for routes. Check for a match, then pass through
// the other stuff in order.
Route.prototype.handle = function handle(request, response, callback) {
  if (this.config.parallel && callback) {
    callback();
    callback = function () {};
  }

  var method = request.method,
      self   = this,
      match  = false,
      re_match,
      next,
      i      = 0;

  if (method === 'HEAD') {
    // HEAD requests aren't allowed a body, but are
    // treated like a GET request
    method = 'GET';
  }

  if (this.config.catch_all === true) {
    match = true;
  } else {
    var lower_path = request.url.toLowerCase();
    this.table[method].forEach(function (route) {
      if (route instanceof RegExp) {
        var temp_match;
        if (temp_match = lower_path.match(route)) {
          temp_match.shift();
          // Keep a reference to the last regexp match
          re_match = temp_match;
          match = true;
        }
      } else if (route === lower_path) {
        match = true;
      }
    });
  }

  if (match) {
    // We have a match! Time to go through the processing layers
    next = function next(err) {
      if (err) {
        if (self.router.config.mode &&
            self.router.config.mode === 'development') {
          throw error;
        } else {
          log('Error: ' + err.message);
        }
      }

      var args,
          layer = self.layers[i++];

      if (layer) {
        args = [request, response, next];

        // Suffix any regexp results we had
        // then call the layer
        args.push.apply(args, re_match);
        args.push.apply(args, arguments);

        // Catch layer errors
        try {
          layer.apply(null, args);
        } catch (error) {
          next(error);
        }
      } else {
        return callback();
      }
    };

    // Start the processing madness
    next();
  } else if (callback) {
    callback();
  }

  return this;
};

// Private: Checks to see whether we can use the route
Route.prototype._checkRoute = function _checkRoute(route) {
  if (route instanceof RegExp) {
    return true;
  } else if (typeof route === 'string') {
    return true;
  }
  log('Warning: The route "' + route + '" was of unrecognised type.');
  return false;
};

// module: A module processing layer
Route.prototype.module = function module() {
  var args = Array.prototype.slice.call(arguments),
      name = args.shift();

  if (typeof name === 'string' && this.router.modules[name]) {
    var module = this.router.modules[name];
    module = module.apply(null, args);
    this.layers.push(module);
  }

  return this;
};

// bind: A simple processing layer
Route.prototype.bind = function bind(fn) {
  if (typeof fn === 'function') {
    this.layers.push(fn);
  } else {
    log('Warning: bind only accepts functions.');
  }
  return this;
};

// all: Serves all types of request
Route.prototype.all = function all(route) {
  if (this._checkRoute(route)) {
    this.table.GET.push(route);
    this.table.POST.push(route);
    this.table.PUT.push(route);
    this.table.DELETE.push(route);
    this.table.OPTIONS.push(route);
  }
  return this;
};

// Shortcut to add route
Route.prototype._addRoute = function _addRoute(verb, route) {
  if (this._checkRoute(route)) {
    this.table[verb].push(route);
  }
  return this;
};

// get: Matches against get requests
Route.prototype.get = function get(route) {
  return this._addRoute('GET', route);
};

// post: Matches against post requests
Route.prototype.post = function post(route) {
  return this._addRoute('POST', route);
};

// put: Matches against put requests
Route.prototype.put = function put(route) {
  return this._addRoute('PUT', route);
};

// del: Matches against delete requests
Route.prototype.del = function del(route) {
  return this._addRoute('DELETE', route);
};

// options: Matches against options requests
Route.prototype.options = function options(route) {
  return this._addRoute('OPTIONS', route);
};

if (module.exports) {
  module.exports = Router;
}
