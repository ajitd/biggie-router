

modules.exports = function () {
  return function (request, response, next) {
    response.addListener('data', function (buffer) {
      response.appendBody(buffer);
    });

    response.addListener('end', function () {
      next();
    });
  };
};
