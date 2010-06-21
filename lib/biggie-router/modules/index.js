//
// biggie-router: Default modules loader
// (c) Tim Smart 2010
//
// Released under the MIT license
// See {insert_link} for license
//

var fs = require('fs');

var modules = module.exports = {},
    list;

list = fs.readdirSync(__dirname);

list.forEach(function (file) {
  if (file === 'index.js') return;

  if (file = /^(.*)\..*$/.exec(file)) {
    try {
      var name   = file[1],
          module = require('./' + name);

      if (typeof module === 'function') {
        // Simple module similar to Route#bind()
        modules[name] = {
          handle: module
        };
      } else if (module && typeof module.handle === 'function') {
        // Standard object module
        modules[name] = module;
      }
    } catch (error) {}
  }
});
