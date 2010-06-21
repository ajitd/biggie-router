module.exports = {
  init: function init(arg) {
    this.arg = arg;
  },
  handle: function handle(next, request, response) {
    require('sys').puts('file');
    response.appendBody(' haha');
    next();
  }
};
