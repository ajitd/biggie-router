module.exports = {
  setup: function setup(arg) {
    this.arg = arg;
  },
  handle: function handle(request, response, next) {
    require('sys').puts('file');
    response.appendBody(' haha');
    next();
  }
};
