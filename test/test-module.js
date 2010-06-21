module.exports = {
  setup: function setup(arg) {
    this.arg = arg;
  },
  handle: function handle(next, request, response) {
    require('sys').puts('file');
    response.appendBody(' haha');
    next();
  }
};
