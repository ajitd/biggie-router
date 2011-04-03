// The MIT License
// 
// Copyright (c) 2011 Tim Smart
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var defaultHeaders = {};

exports.setDefaultHeaders = function setDefaultHeaders(headers) {
  defaultHeaders = headers;
};

// Just in case
exports.getBody = function getBody(encoding) {
  if (this.body && encoding) {
    return this.body.toString(encoding);
  }
  return this.body;
};

// Method used to set the body
exports.setBody = function setBody(to) {
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
exports.appendBody = function appendBody(data) {
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
  var keys = Object.keys(defaultHeaders),
      key;
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    headers[key] || (headers[key] = defaultHeaders[key]);
  }
  return headers;
};

exports.sendHeaders = function sendHeaders(code, headers, content) {
  if (typeof code !== 'number') {
    content = headers;
    headers = code;
    code = 200;
  }

  headers = mergeDefaultHeaders(headers);
  headers['Date'] = headers['Date'] || new Date().toUTCString();
  if (content) {
    headers['Content-Length'] = headers['Content-Length'] || content.length;
  }
  this.response.writeHead(code, headers);
};

exports.send = function send(code, content, headers) {
  if (typeof code !== 'number') {
    headers = content;
    content = code;
    code = 200;
  }
  this.sendHeaders(code, headers, content);
  this.response.end(content);
};

exports.sendRedirect = function sendRedirect(location, content, headers) {
  var default_headers = {
    'Location': location
  };
  headers = headers || {};

  Object.keys(headers).forEach(function (key) {
    default_headers[key] = headers[key];
  });

  return this.send(302, content, default_headers);
};

exports.sendBody = function sendBody(code, content, headers) {
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

exports.sendJson = function sendJson(code, data, headers) {
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

exports.sendText = function sendText(code, data, headers) {
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
