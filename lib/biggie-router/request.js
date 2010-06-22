
var request = require('http').IncomingMessage.prototype;

var url = require('url');

// Convenience parsing
request.parseUrl = function parseUrl() {
  return url.parse(this.url, true);
};

request.parseCookies = function parseCookies() {
  // TODO: Implement parseCookies
};

