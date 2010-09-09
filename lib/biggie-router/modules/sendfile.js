var path     = require('path'),
    fs       = require('fs'),
    utils    = require('../utils'),
    FreeList = require('freelist').FreeList,
    noop     = function () {};

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
          response.sendHeaders(206, headers);
        } else {
          response.sendHeaders(200, headers);
        }
        if (request.method === 'HEAD') return response.end();

        // TODO: pester ryah to let him how much of a hack this is
        response._send('');

        // sendfile takes length, not end
        read_opts.end = read_opts.end - read_opts.start;

        // sendfile()
        // Note this will skip all other layers (like gzip), so make sure this is
        // what you want
        var sender = new FileSender(fd, response.connection);
        sender.send(read_opts.start, read_opts.end, function (error) {
          if (error) return next(error);
          response.end();
        });
      });
    });
  };
};

var ioWatchers = new FreeList('iowatcher', 100, function () {
  return new process.IOWatcher();
});

var FileSender = function FileSender (fd, socket) {
  this.socket  = socket;
  this.fd      = fd;
  this.watcher = ioWatchers.alloc();
  this.start   = 0;
  this.length  = 0;

  var $ = this;
  this.watcher.callback = function (r, w) {
    $.onDrain(r, w);
  };
  this.watcher.set(this.socket.fd, false, true);
};

FileSender.prototype.send = function send (start, length, cb) {
  this.callback = cb || noop;

  this.start  = start;
  this.length = length || 0;

  return this.sendfile();
};

FileSender.prototype.sendfile = function sendfile () {
  //console.log(this.socket.fd, this.fd, this.start, this.length);

  var $ = this;
  if (this.socket.fd && this.fd) {
    return fs.sendfile(this.socket.fd, this.fd, this.start, this.length, function (e, b) {
      $.onWrite(e, b);
    });
  }

  this.onEnd();
};

FileSender.prototype.onWrite = function onWrite (error, bytes) {
  if (error) {
    switch (error.errno) {
      case process.EAGAIN:
        return this.watcher.start();
      case process.EPIPE:
        return this.onEnd();
      default:
        return this.onEnd(error);
    }
  }

  this.start  += bytes;
  this.length -= bytes;

  if (this.length > 0) {
    return this.sendfile();
  }

  this.onEnd();
};

FileSender.prototype.onDrain = function onDrain (readable, writable) {
  this.watcher.stop();
  return this.sendfile();
};

FileSender.prototype.onEnd = function onEnd (error) {
  this.callback(error);
  this.watcher.stop();
  this.watcher.callback = noop;
  ioWatchers.free(this.watcher);
  fs.close(this.fd, noop);
};
