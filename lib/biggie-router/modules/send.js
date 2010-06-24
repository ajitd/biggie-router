

module.exports = function (statusCode) {
  statusCode = statusCode || 200;
  return function (request, response) {
    response.sendBody(statusCode, response.body);
  };
};
