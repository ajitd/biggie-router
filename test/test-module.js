module.exports = function (arg) {
  return function (request, response, next) {
    require('sys').puts('file');
    response.appendBody(' haha ' + arg);
    next();
  };
};
