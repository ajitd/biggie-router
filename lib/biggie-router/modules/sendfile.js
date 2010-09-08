var path  = require('path'),
    fs    = require('fs'),
    utils = require('../utils'),
    noop  = function () {};

module.exports = function (dir, prefix) {
  return function (request, response, next) {
    var filename,
        pathname = request.parseUrl().pathname;

    pathname = pathname.replace(/\.\.+/g, '.');

    if (prefix) {
      var index = pathname.indexOf(prefix);
      if (index > -1) {
        filename = pathname.slice(prefix.length);
      } else {
        return next();
      }
    } else {
      filename = pathname;
    }

    // Serve the file :)
    filename = path.join(dir, filename);
    fs.open(filename, 'r', null, function (error, fd) {
      if (error) return next();

      fs.fstat(fd, function (error, stat) {
        if (error) {
          return next();
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

        var headers, read_opts;
        headers = {
          'Content-Type': utils.mime.type(filename),
          'Content-Length': stat.size,
          'Last-Modified': stat.mtime.toUTCString(),
          'Expires': new Date(Date.now() + 31536000000).toUTCString(),
          'Cache-Control': 'public max-age=' + 31536000
        };
        read_opts = {
          start: 0,
          end:   stat.size
        };

        if (request.headers['range']) {
          read_opts = utils.setRangeHeaders(request, stat, headers);
        }
        response.sendHeaders(200, headers);
        // TODO: pester ryah to let him how much of a hack this is
        response._send('');

        // sendfile()
        // Note this will skip all other layers (like gzip), so make sure this is
        // what you want
        fs.sendfile(response.connection.fd, fd, read_opts.start, read_opts.end, function (error) {
          if (error) {
            console.error(error);
            return next(error);
          }
          response.end();
          fs.close(fd, noop);
        });
      });
    });
  };
};
