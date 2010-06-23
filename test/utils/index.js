var http   = require('http'),
    url    = require('url'),
    router = new (require('./../../lib/biggie-router'))(),
    assert = require('assert'),
    events = require('events'),
    Buffer = require('buffer').Buffer;

var HOST = 'http://localhost:8080',
    PORT = 8080;

router.listen(PORT);

module.exports.getContext = function getContext(options) {
  return {
    router: router,
    httpFetch: function (url, callback) {
      new HttpClient({
        url: url,
        success: function (response) {
          callback(response.body.toString('utf8'));
        }
      }).end();
    },
    respondsWith: function (code, body, headers) {
      var context = {
        topic: function () {
          var req    = this.context.name.split(/ +/), // ["POST", "/"]
              method = req[0].toLowerCase(),          // "post"
              path   = req[1],                        // "/"
              promise = new events.EventEmitter();

          new HttpClient({
            method: method,
            url: HOST + path,
            success: function (response) {
              promise.emit('success', response)
            }
          }).end();

          return promise;
        }
      };

      var label = body ? body : 'null';
      if (label.length > 50) {
        label = label.replace(/\s+/g, ' ').slice(0, 100) + '...';
      }

      context['should respond with ' + code + ', ' + label] = function (err, response) {
        assert.equal(response.statusCode, code);

        if (response.body instanceof Buffer) {
          response.body = response.body.toString('utf8');
        }

        assert.equal(response.body, body);
      };

      if (headers) {
        Object.keys(headers).forEach(function (header) {
          header = header.toLowerCase();
          context['should have header ' + header + ': ' + headers[header]] = function (err, response) {
            assert.equal(response.headers[header], headers[header]);
          }
        });
      }

      return context;
    }
  };
};


var HttpClient = function(options) {
  var urlDetails = url.parse(options.url);
  options.port = urlDetails.port ? parseInt(urlDetails.port, 10) : 80;

  this._client = http.createClient(options.port,
                   urlDetails.hostname);

  this._path = urlDetails.pathname;
  this.method = options.method ? options.method.toUpperCase() : 'GET';
  this.data = options.data || '';

  this.headers = {
    'Host': urlDetails.hostname
  };

  if ('object' === typeof options.headers) {
    Object.keys(options.headers).forEach(function (key) {
      this.headers[key] = options.headers[key];
    }, this);
  }

  this._callback = options.success || function() {};
  this._errback = options.error || function() {};

  return this._request();
};

HttpClient.prototype._request = function() {
  var self = this;

  var request = this._client.request(this.method, this._path, this.headers);

  request.addListener('response', function (response) {
    self.response = response;
    response.body = null;
    response.addListener('data', function (buffer) {
      if (response.body) {
        var temp_buffer = new Buffer(response.body.length + buffer.length);
        response.body.copy(temp_buffer, 0, 0);
        buffer.copy(temp_buffer, response.body.length, 0);
        response.body = temp_buffer;
      } else {
        response.body = buffer;
      }
    });

    response.addListener('end', function() {
      self._callback(response);
    });
  });

  if ('POST' === this.method || 'PUT' === this.method ||
      'DELETE' === this.method)
    request.write(this.data);

  return request;
};
