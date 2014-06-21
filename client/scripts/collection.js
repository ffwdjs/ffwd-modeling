/* jshint node: true, browser: true */
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([
  'backbone',
  'ffwd-utils',
  './model'
], function(Backbone, utils, BaseModel) {
  'use strict';
  var _ = utils._;
  
  var Collection = Backbone.Collection.extend({
    model: BaseModel,

    meta: {},

    _links: {},

    _embedded: {},

    resourceName: BaseModel.prototype.resourceName,

    sync: BaseModel.prototype.sync,

    url: function() {
      return '/'+ _.result(this, 'resourceName');
    },

    parse: function(data, options) {
      this._links = _.extend({}, data._links || {}, this._links);
      return data._embedded[_.result(this, 'resourceName')];
    }
  }, {
  });

  return Collection;
});