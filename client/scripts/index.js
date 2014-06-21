(function (root, factory) {
  /* global define: false, exports: false, require: false */
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define('ffwd-modeling', ['./model', './collection'], factory);
  }
  else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('./model'), require('./collection'));
  }
  else {
    // Browser globals (root is window)
    root.FFWD = root.FFWD || {};
    root.FFWD.modeling = factory();
  }
}(this, function (BaseModel, BaseCollection) {
// if (typeof define !== 'function') { var define = require('amdefine')(module); }
// define('ffwd-modeling', [
//   './model',
//   './collection'
// ], function(BaseModel, BaseCollection) {
  'use strict';
  var ffwdModeling = {};


  ffwdModeling.Model = BaseModel;
  ffwdModeling.Collection = BaseCollection;
  // console.info('ffwdModeling', ffwdModeling);

  return ffwdModeling;
}));
// });