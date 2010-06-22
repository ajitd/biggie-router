
var path = require('path'),
    fs   = require('fs'),
    mime = require('./../utils').mime;

module.exports = {
  setup: function setup(dir, prefix) {
    this.dir = dir;
    this.prefix = prefix;
  },
  handle: function handle(next, request, response) {
    var filename,
        pathname = request.parseUrl().pathname;

    if (this.prefix) {
      var index = pathname.indexOf(this.prefix);
      if (index > -1) {
        filename = pathname.slice(this.prefix.length);
      } else {
        return next();
      }
    } else {
      filename = pathname;
    }

    // Serve the file :)
    filename = path.join(this.dir, filename);
    fs.stat(filename, function (error, stat) {
      // Go to the next layer if we can't serve anything.
      if (error) {
        return next(error);
      } else if (!stat.isFile()) {
        return next();
      }

      if (request.headers['if-modified-since']) {
        var if_modified_since = new Date(request.headers['if-modified-since']);
        if (stat.mtime.getTime() <= if_modified_since.getTime()) {
          return response.send(304, null, {
            'Expires': new Date(Date.now() + 31536000000).toUTCString(),
            'Cache-Control': 'public max-age=' + 31536000
          });
        }
      }

      // FIXME: Stream files, rather than send one big buffer
      fs.readFile(filename, function (error, buffer) {
        if (error) {
          return next(error);
        }

        // Tag it and bag it
        response.send(200, buffer, {
          'Content-Type': mime.type(filename),
          'Last-Modified': stat.mtime.toUTCString(),
          'Expires': new Date(Date.now() + 31536000000).toUTCString(),
          'Cache-Control': 'public max-age=' + 31536000
        });
      });
    });
  }
};
