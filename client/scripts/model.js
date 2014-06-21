/* jshint node: true, browser: true */
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([
  'backbone',
  'ffwd-utils',
  'validator'
], function(Backbone, utils, validationHelpers) {
  'use strict';

  var _ = utils._;

  var _private = {};

  validationHelpers.max = function(value, max) {
    return value < max;
  };
  validationHelpers.min = function(value, min) {
    return value > min;
  };
  validationHelpers.notEmpty = function(value) {
    return !!value;
  };

  /**
   * The FFWD base Model.
   */
  var BaseModel = Backbone.Model.extend({
    /**
     * An object in which links to other resources are stored
     *
     * @type {Object}
     */
    _links: {},

    _embedded: {},

    sync: function(method, model, options) {
      options = options || {};

      if (!options.dataType) {
        options.dataType = 'json';
        options.headers = {
          Accept: 'application/hal+json, application/json, text/javascript'
        };
      }

      if (!options.crossDomain) {
        options.crossDomain = true;
      }

      if (!options.xhrFields) {
        options.xhrFields = {
          withCredentials:true
        };
      }

      Backbone.sync(method, model, options);
    },
    
    resourceName: function() {
      if (this.constructor.resourceName) {
        return _.result(this.constructor, 'resourceName');
      }

      if (this.model.resourceName) {
        return _.result(this.model, 'resourceName');
      }

      throw new Error('Can not determine the resource name');
    },

    url: function() {
      return _.result(this, 'resourceName') +'/'+ this.id || false;
    },

    set: function(obj) {
      if (obj._links || obj._embedded) {
        this._links = _.extend({}, obj._links || {}, this._links);
        delete obj._links;

        this._embedded = _.extend({}, obj._embedded || {}, this._embedded);
        delete obj._embedded;
        
        // console.info('setting from hal', obj, this._links, this._embedded);
      }
      return Backbone.Model.prototype.set.apply(this, arguments);
    },

    toHAL: function() {
      var obj = _.clone(this.attributes);
      obj._links = _.clone(this._links);
      obj._embedded = _.clone(this._embedded);
      return obj;
    },

    /**
     * Method to fetch linked resources
     *
     * @param  {string} linkName  [description]
     * @param  {object} options   [description]
     *
     * @return {*}                [description]
     */
    getLink: function(linkName, options) {
      options = options || {};
      console.info('want link', linkName, this._links);
      return this._links[linkName] ? this._links[linkName].href : null;
    },

    getEmbedded: function(resourceName, options) {
      options = options || {};
      console.info('want embedded', resourceName, this._embedded);
      var result = this._embedded[resourceName] ? this._embedded[resourceName] : null;
      if (!_.isUndefined(options.delta)) {
        return result[options.delta];
      }
      return result;
    },

    /**
     * Method to generate default values for the model
     *
     * @return {object} default attributes
     */
    defaults: function() {
      if (this.definition) {
        var defaults = {};
        _.each(this.definition, function(val, key) {
          if (!_.isUndefined(val.defaultValue)) {
            defaults[key] = val.defaultValue;
          }
        });
        return defaults;
      }

      return {};
    },
    
    validate: function(attributes, options) {
      options = options || {};
      var next = _.isFunction(options.next) ? options.next : false;
      var err, validator;


      var validators = _.values(options.validators || [])
                        .concat(_.values(this.constructor.validators || []));

      attributes = attributes || _.clone(this.attributes);

      validator = validators.pop();
      while (validator && !err) {
        try {
          err = validator(attributes);
          validator = !!err ? false : validators.shift();
        }
        catch(catched) {
          err = catched;
        }
      }

      var definition = this.definition;
      _.each(attributes, function(val, name) {
        if (err) { return; }

        var propValidators = definition[name] && definition[name].validate ?
                          definition[name].validate :
                          [];
        
        _.each(propValidators, function(args, propValidator) {
          if (err) { return; }
          try {
            var result = validationHelpers[propValidator](val, args);
            console.info('result', result);
          }
          catch (catched) {
            err = catched;
          }
        });
      });

      console.info('validation', attributes, !!next, err);

      if (next) {
        next(err, attributes);
      }

      return err;
    }
  }, {

    dataTypes: {
      now: function() {
        return Math.round((new Date()).getTime() / 1000);
      }
    },

    validationHelpers: validationHelpers,

    /**
     * Generates a validator callback
     *
     * @param  {string|array} keys      of the attributes to be tested
     * @param  {string|array} names     of the callbacks to use
     * @param  {array} [args]           description
     *
     * @return {function}               description
     */
    makeValidator: function (keys, names, args){
      keys =      _.isArray(keys) ? keys : [keys];
      names =     _.isArray(names) ? names : [names];
      args =      _.isArray(args) ? args : [];

      return function(attrs, next) {
        var instance = this;

        for (var k in keys) {
          var key = keys[k];

          for (var t in names) {
            var func = validationHelpers[names[t]];
            var val = attrs[key];
            var result = func.apply(instance, [val].concat(args));

            if (result) {
              var error = key +' with value "'+
                          attrs[key] +'" fails "'+
                          names[t] +'"';
              if (next) {
                return next(error);
              }
              return error;
            }
          }
        }
        if (next) {
          next();
        }
      };
    }
  });

  return BaseModel;
});