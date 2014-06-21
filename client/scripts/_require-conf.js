if (typeof define !== 'function') { var define = require('amdefine')(module); }
/**
 * @module require-confh
 */
define('require-conf', [
], function(
) {

  var requireConf = {};

  requireConf.baseUrl = '<%= clientBaseUrl %>';

  requireConf.paths = {
  };
  
  requireConf.packages = [
  ];
  
  return requireConf;
});