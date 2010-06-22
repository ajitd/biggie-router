
var response       = require('http').ServerResponse.prototype,
    Buffer         = require('buffer').Buffer,
    defaultHeaders = {};

module.exports.setDefaultHeaders = function setDefaultHeaders(headers) {
  defaultHeaders = headers;
};

// Body property used by modules
response.body = null;

// Just in case
response.getBody = function getBody(encoding) {
  if (this.body && encoding) {
    return this.body.toString(encoding);
  }
  return this.body;
};

// Method used to set the body
response.setBody = function setBody(to) {
  if (to instanceof Buffer) {
    this.body = to;
  } else {
    if (typeof to !== 'string') {
      to = to.toString();
    }
    this.body = new Buffer(to);
  }
  return this.body;
};

// Method used to append to the body
response.appendBody = function appendBody(data) {
  if (data instanceof Buffer === false) {
    if (typeof data !== 'string') {
      data = data.toString();
    }
    data = new Buffer(data);
  }

  // Do a little memcopy magic
  if (this.body) {
    var temp_buffer = new Buffer(this.body.length + data.length);
    this.body.copy(temp_buffer, 0, 0);
    data.copy(temp_buffer, this.body.length, 0);
    this.body = temp_buffer;
  } else {
    this.body = data;
  }

  return this.body;
};

// Easy response methods
var mergeDefaultHeaders;

mergeDefaultHeaders = function getDefaultHeaders(headers) {
  headers = headers || {};
  Object.keys(defaultHeaders).forEach(function (key) {
    headers[key] = headers[key] || defaultHeaders[key];
  });
  return headers;
};

response.send = function send(code, content, headers) {
  headers = mergeDefaultHeaders(headers);
  headers['Date'] = headers['Date'] || new Date().toUTCString();
  if (content) {
    headers['Content-Length'] = headers['Content-Length'] || content.length;
  }
  this.writeHead(code, headers);
  this.end(content);
};

response.sendRedirect = function sendRedirect(location, content, headers) {
  var default_headers = {
    'Location': location
  };
  headers = headers || {};

  Object.keys(headers).forEach(function (key) {
    default_headers[key] = headers[key];
  });

  return this.send(302, content, default_headers);
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

  return this.send(code, content, default_headers);
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

  return this.send(code, data, default_headers);
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

  return this.send(code, data, default_headers);
};
