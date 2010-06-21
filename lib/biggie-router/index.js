//
// biggie-router
// (c) Tim Smart 2010
//
// Released under the MIT license
// See {insert_link} for license
//

var http = require('http'),
    sys  = require('sys');

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
  this.modules = {};

  // The default config
  this.config = {};

  // Proxy the config over
  if (config) {
    Object.keys(config).forEach(function (key) {
      this.config[key] = config[key];
    });
  }

  // The underlying server
  this.server = http.createServer(function (request, response) {
    self._onRequest(request, response);
  });

  return this;
};

// All requests proxy through this method
Route.prototype._onRequest = function _onRequest(request, response) {
  if (this.routes.length <= 0) {
    response.writeHead(404);
    return response.end();
  }

  var i    = 0,
      self = this,
      next;

  // One route at a time, unless marked as parallel
  next = function next() {
    i++;
    if (self.routes[i]) {
      self.routes[i].handle(request, response, next);
    }
  };

  // Get the party started
  this.routes[i].handle(request, response, next);
};

// listen method calls the underlying http listen
Router.prototype.listen = function listen() {
  this.server.listen.apply(this.server, arguments);
  return this.server;
};

// Add a new module
Router.prototype.addModule = function addModule(name, module) {
  if (typeof module === 'string') {
    // Add a module via filesystem
    try {
      module = require(module);
      this.addModule(name, module);
    } catch (error) {
      log('Warning: ' + error.message);
    }
  } else if (typeof module === 'function') {
    // Simple module similar to Route#bind()
    this.modules[name] = {
      handle: module
    };
  } else if (module && typeof module.handle === 'function') {
    // Standard object module
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

// Proxy method to create a new route with 'all'
Router.prototype.all = function all() {
  var route = this.createRoute();
  this.routes.push(route);
  return route.all.apply(route, arguments);
};

// Proxy method to create a new route with 'get'
Router.prototype.get = function get() {
  var route = this.createRoute();
  this.routes.push(route);
  return route.get.apply(route, arguments);
};

// Proxy method to create a new route with 'post'
Router.prototype.post = function post() {
  var route = this.createRoute();
  this.routes.push(route);
  return route.post.apply(route, arguments);
};

// Proxy method to create a new route with 'put'
Router.prototype.put = function put() {
  var route = this.createRoute();
  this.routes.push(route);
  return route.put.apply(route, arguments);
};

// Proxy method to create a new route with 'delete'
Router.prototype.delete = function delete() {
  var route = this.createRoute();
  this.routes.push(route);
  return route.delete.apply(route, arguments);
};

// Proxy method to create a new route with 'options'
Router.prototype.options = function options() {
  var route = this.createRoute();
  this.routes.push(route);
  return route.options.apply(route, arguments);
};

// The Route prototype
var Route = function Route(router, config) {
  this.router = router;
  // The default config
  this.config = {
    parallel: false
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
    Object.keys(config).forEach(function (key) {
      this.config[key] = config[key];
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

  var method,
      match      = false,
      re_match   = [],
      lower_path = request.path.toLowerCase(),
      next,
      i          = 0;

  if (request.method === 'HEAD') {
    // HEAD requests aren't allowed a body, but are
    // treated like a GET request
    method = 'GET';
  } else {
    method = request.method;
  }

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

  if (match) {
    // We have a match! Time to go through the processing layers
    next = function next() {
      var args,
          layer = this.layers[i];
      if (layer instanceof Array) {
        // We are a 'module' layer
        args = layer[1];

        // Does the module have a init method?
        if (layer[0].init) {
          layer[0].init.apply(layer[0], args);
        }

        // Trigger the layer
        layer[0].handle.call(layer[0], next, request, response);
      } else if (layer) {
        // We are a 'bind' layer.
        args = [next, request, response];

        // Suffix any regexp results we had
        // then call the layer
        args.push.apply(args, re_match);
        layer.apply(null, args);
      } else {
        return callback();
      }
      i++;
    };
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
    this.layers.push([this.router.modules[name], args]);
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

// get: Matches against get requests
Route.prototype.get = function get(route) {
  if (this._checkRoute(route)) {
    this.table.GET.push(route);
  }
  return this;
};

// post: Matches against post requests
Route.prototype.post = function post(route) {
  if (this._checkRoute(route)) {
    this.table.POST.push(route);
  }
  return this;
};

// put: Matches against put requests
Route.prototype.put = function put(route) {
  if (this._checkRoute(route)) {
    this.table.PUT.push(route);
  }
  return this;
};

// delete: Matches against delete requests
Route.prototype.delete = function delete(route) {
  if (this._checkRoute(route)) {
    this.table.DELETE.push(route);
  }
  return this;
};

// options: Matches against options requests
Route.prototype.options = function options(route) {
  if (this._checkRoute(route)) {
    this.table.OPTIONS.push(route);
  }
  return this;
};
