//
// biggie-router
// (c) Tim Smart 2010
//
// Released under the MIT license
// See {insert_link} for license
//

var http   = require('http'),
    sys    = require('sys'),
    url    = require('url'),
    Buffer = require('buffer').Buffer;

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
      "Server": "node.js"
    }
  };

  // Proxy the config over
  if (config) {
    Object.keys(config).forEach(function (key) {
      this.config[key] = config[key];
    });
  }

  // The underlying server
  http.Server.call(this, function (request, response) {
    self._onRequest(request, response);
  });

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
      next,
      end   = response.end,
      write = response.write;

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
  this._modifyRequest(request, response);
  this.routes[i].handle(request, response, next);
};

// Add all the extra core methods to the request and response objects
Router.prototype._modifyRequest = function _modifyRequest(request, response) {
  // Convenience parsing
  request.parseUrl = function parseUrl() {
    return url.parse(request.url, true);
  };

  request.parseCookies = function parseCookies() {
    // TODO: Implement parseCookies
  };

  // Body property used by modules
  response.body = null;

  // Just in case
  response.getBody = function getBody(encoding) {
    if (encoding) {
      return response.body.toString(encoding);
    }
    return response.body;
  };

  // Method used to set the body
  response.setBody = function setBody(to) {
    if (to instanceof Buffer) {
      response.body = to;
    } else {
      if (typeof to === 'number') {
        to = to.toString();
      }
      response.body = new Buffer(to);
    }
    return response.body;
  };

  // Method used to append to the body
  response.appendBody = function appendBody(data) {
    if (data instanceof Buffer === false) {
      if (typeof data === 'number') {
        data = data.toString();
      }
      data = new Buffer(data);
    }

    // Do a little memcopy magic
    if (response.body) {
      var temp_buffer = new Buffer(response.body.length + data.length);
      response.body.copy(temp_buffer, 0, 0);
      data.copy(temp_buffer, response.body.length, 0);
      response.body = temp_buffer;
    } else {
      response.body = data;
    }

    return response.body;
  };

  // Easy response methods
  var mergeDefaultHeaders,
      self = this;

  mergeDefaultHeaders = function getDefaultHeaders(headers) {
    headers = headers || {};
    Object.keys(self.config.headers).forEach(function (key) {
      headers[key] = headers[key] || self.config.headers[key];
    });
    return headers;
  };

  response.send = function send(code, content, headers) {
    headers = mergeDefaultHeaders(headers);
    headers['Date'] = headers['Date'] || new Date().toUTCString();
    if (content) {
      headers['Content-Length'] = headers['Content-Length'] || content.length;
    }
    response.writeHead(code, headers);
    response.end(content);
  };

  response.sendBody = function sendBody(code, content, headers) {
    if (typeof code !== 'number') {
      headers = content;
      content = code;
      code = 200;
    }

    var default_headers = {};
    headers = headers || {};

    if (typeof content === 'string' || content instanceof Buffer) {
      default_headers['Content-Type'] = 'text/html';
    } else {
      content = JSON.stringify(content);
      default_headers['Content-Type'] = 'application/json';
    }

    Object.keys(headers).forEach(function (key) {
      default_headers[key] = headers[key];
    });

    return response.send(code, content, default_headers);
  };

  response.sendJson = function sendJson(code, data, headers) {
    if (typeof code !== 'number') {
      headers = data;
      data = code;
      code = 200;
    }

    var default_headers = {
      'Content-Type': 'application/json'
    };
    headers = headers || {};

    if (typeof data !== 'string' && data instanceof Buffer === false) {
      data = JSON.stringify(data);
    }

    Object.keys(headers).forEach(function (key) {
      default_headers[key] = headers[key];
    });

    return response.send(code, data, default_headers);
  };

  response.sendText = function sendText(code, data, headers) {
    if (typeof code !== 'number') {
      headers = data;
      data = code;
      code = 200;
    }

    var default_headers = {
      'Content-Type': 'text/plain'
    };
    headers = headers || {};

    Object.keys(headers).forEach(function (key) {
      default_headers[key] = headers[key];
    });

    return response.send(code, data, default_headers);
  };

  return this;
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

  var method,
      self       = this,
      match      = false,
      re_match   = [],
      lower_path = request.url.toLowerCase(),
      next,
      i          = 0;

  if (request.method === 'HEAD') {
    // HEAD requests aren't allowed a body, but are
    // treated like a GET request
    method = 'GET';
  } else {
    method = request.method;
  }

  if (this.config.catch_all === true) {
    match = true;
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
          layer = self.layers[i];

      i++;
      if (layer instanceof Array) {
        // We are a 'module' layer
        args = layer[1];

        // Does the module have a setup method?
        if (typeof layer[0].setup === 'function') {
          args.push.apply(args, arguments);
          layer[0].setup.apply(layer[0], args);
        }

        // Trigger the layer
        layer[0].handle.call(layer[0], next, request, response);
      } else if (layer) {
        // We are a 'bind' layer.
        args = [next, request, response];

        // Suffix any regexp results we had
        // then call the layer
        args.push.apply(args, re_match);
        args.push.apply(args, arguments);
        layer.apply(null, args);
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
