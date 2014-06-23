'use strict';
/* jshint node: true */

/**
 * @namespace ffwd-modeling
 */

var path = require('path');
var utils = require('ffwd-utils/server');
var Sequelize = require('sequelize');
var dbConnect = require('sequelize-connection');

var _ = utils._;



/**
 * _models cache
 */
var _models = {};


/**
 * _relations cache
 * @type {Object}
 */
var _relations = {};


/**
 * _relationKeys cache
 * @type {Object}
 */
var _relationKeys = {};


/**
 * _connections cache
 * @type {Object}
 */
var _connections = {};


// utils.prepareObjectId = function(sequelize, modelName, idName) {
//   var idKey = idName ? idName : modelName+'Id';
//   return function(instance, fn) {
//     if (_.isNull(instance[idKey]) || _.isUndefined(instance[idKey])) {
//       return fn(null, instance);
//     }
    
//     sequelize._Models[modelName]
//       .find(instance[idKey])
//       .success(function(result){
//         if (!result) {
//           instance[idKey] = null;
//         }
//         fn(null, instance);
//       })
//       .error(function(err) { fn(err, instance); });
//   };
// };



utils.addDataType = function(DT, def) {
  _.each(def, function(props, name) {
    _.each(props, function(prop, p) {
      if (_.isString(prop) && prop.slice(0, 3) === 'DT:') {
        def[name][p] = DT[prop.slice(3)];
      }
      else if (_.isObject(prop)) {
        def[name][p] = utils.addDataType(DT, def[name][p]);
      }
    });
  });
  return def;
};




/**
 * _setupRelations
 * 
 */
function _setupRelations(info, modelName) {
  if (_.isFunction(info)) {
    /* jshint validthis: true */
    info(_.extend({}, this, _models));
    /* jshint validthis: false */
    return;
  }

  _.each(['hasOne', 'hasMany', 'belongsTo'], function(type) {
    _.each(info[type] || {}, function(relationDetails, relationName) {
      var opts = _.clone(relationDetails);
      var key = [
        modelName,
        type,
        _models[relationDetails.model].name,
        relationName
      ].join('.');
      
      if (_relationKeys[key]) {
        console.warn('the relation already exists', key);
      }

      opts.as = relationName;
      delete opts.model;

      opts.through = opts.through && global.db[opts.through] ? global.db[opts.through] : opts.through;

      _models[modelName][type](_models[relationDetails.model], opts);

      _relationKeys[key] = true;
    });
  });
}



/**
 * importModel
 * 
 */
function importModel(importable, sequelize) {
  var sequelized;
  var imported = _.isString(importable) ? require(importable) : importable;
  imported = _.isArray(imported) ? imported : [imported];

  _.each(imported, function(model) {
    var name;

    if (model.modelName && _.isFunction(model)) {
      name = model.modelName;

      sequelized = sequelize.import(model.modelName, model);
    }
    else if(model.name) {
      name = model.name;

      // if (model.define) {
      //   model.definition = function(DataTypes) {
      //     console.info('definition from define', DataTypes);
      //     return sequelize.define(name, utils.addDataType(DataTypes, model.definition));
      //   };
      // }

      if (model.definition) {
        sequelized = sequelize.define(name, utils.addDataType(Sequelize, model.definition), {

          validation: _.extend({
          }, model.validation || {}),


          classMethods: _.extend({
          }, model.classMethods || {}),


          instanceMethods: _.extend({
            toHAL: function() {
              var hal = {_links: {
                self: {
                  href: '/users/'+ this.dataValues.id
                }
              }};

              _.extend(hal, this.dataValues);
              
              return hal;
            },

            toJSON: function() {
              var json = _.clone(this.dataValues);

              return json;
            }
          }, model.instanceMethods || {})
        });
      }

    }

    else {
      console.info('can not import', model);
      throw new Error('Can not import the model');
    }

    _models[name] = 
      sequelized;
    
    _relations[name] = 
      model.relations || function(){};
  });
}



/**
 * isInstance
 * 
 */
function isInstance(obj) {
  return !!obj &&
          typeof obj.hasPrimaryKeys !== 'undefined' &&
          typeof obj.dataValues !== 'undefined' &&
          typeof obj.isNewRecord !== 'undefined';
}



/**
 * isCollection
 * 
 */
function isCollection(obj) {
    var test = (
      obj &&
      obj.rows &&
      typeof obj.count !== 'undefined'
    ) ?
      obj.rows :
      obj;

    return _.isArray(test) &&
            test.length &&
            isInstance(test[0]);
}



/**
 * isCustomEventEmitter
 * 
 */
function isCustomEventEmitter(obj) {
  return obj instanceof Sequelize.Utils.CustomEventEmitter;
}




/**
 * deliverJSON
 * 
 */
function deliverJSON(res) {
  return function(smth) {
    if (arguments.length > 1) {
      res.status(arguments[0]);
      smth = arguments[1];
    }

    res.set('Content-Type', 'application/json');
    
    var json = isInstance(smth) ? smth.toJSON() : _.map(smth.rows ? smth.rows : smth, function(item) {
      return item.toJSON();
    });

    res.send(json);
  };
}



/**
 * deliverHAL
 * 
 */
function deliverHAL(res) {
  return function(smth) {
    var req = res.req;

    if (arguments.length > 1) {
      res.status(arguments[0]);
      smth = arguments[1];
    }
    
    res.set('Content-Type', 'application/hal+json');
    var hal;
    
    if (isInstance(smth)) {
      if (smth.options.isNewRecord) {
        res.status(201);
      }
      hal = smth.toHAL();
      return res.send(hal);
    }

    hal = {
      _links: {
        self: {
          href: req.url
        }
      },
      _embedded: {}
    };

    var items = smth;
    if (typeof smth.count !== 'undefined') {
      items = smth.rows;
      hal.total = smth.count;
    }

    var resourceName = req.url.slice(1);
    hal._embedded[resourceName] = [];
    for (var i = 0; i < items.length; i++) {
      hal._embedded[resourceName].push(items[i].toHAL());
    }

    res.send(hal);
  };
}



/**
 * sendOverride
 * 
 */
function sendOverride(res) {
  var send = res.originalSend = res.send;
  var req = res.req;
  var next = req.next;


  return function(smth) {
    if (arguments.length > 1) {
      res.status(arguments[0]);
      smth = arguments[1];
    }
    
    if (isCustomEventEmitter(smth)) {
      return smth.then(res.send, next);
    }

    if (!isInstance(smth) && !isCollection(smth)) {
      return send.apply(this, arguments);
    }

    var accept = req.accepts([
      'html',
      'application/hal+json',
      'application/json',
      'json'
    ]);
    
    switch (accept) {
      case 'application/hal+json':
        return res.deliverHAL(smth);


      case 'application/json':
      case 'json':
        return res.deliverJSON(smth);


      // case 'html':
      //   body = smth.toHAL ? smth.toHAL() : _.map(smth.rows ? smth.rows : smth, function(item) {
      //     return item.toHAL();
      //   });
      //   // body = '<html><head></head><body></body></html>';
      //   body = '<pre>'+ JSON.stringify(body, null, 2) +'</pre>';
      //   res.locals.body = body;
      //   break;
      default:
        send.apply(this, arguments);
    }
  };
}



/**
 * allRequestsCallback
 * 
 */
function allRequestsCallback(req, res, next) {
  res.req = req;
  res.deliverJSON = deliverJSON(res);

  res.deliverHAL = deliverHAL(res);

  // console.info('res', Object.keys(res));
  res.send = sendOverride(res);
  
  next();
}





/**
 * @module ffwd-modeling
 * 
 * @param  {Object} settings to be used to configure
 * @return {Function} a function to be use to get a {Model} 
 */
module.exports = function(settings) {
  settings = settings || {};
  var sequelize;

  _.defaults(settings, {
    environement: 'dev'
  });

  var connectionURI = process.env.HEROKU_POSTGRESQL_BRONZE_URL;
  if (connectionURI) {
    var herokuOpts = dbConnect.parseURI(connectionURI);
    _.extend(herokuOpts, {
      logging: false,
      protocol: herokuOpts.dialect
    });
    _connections[connectionURI] = sequelize =
    (_connections[connectionURI] || new dbConnect(connectionURI, herokuOpts));
  }
  else {
    var connectionURI = settings.connectionURI;

    if (!connectionURI) {
      connectionURI = require(path.join(process.cwd(), '.db-setup.json'))[settings.environement];
      // console.info('connectionURI from .db-setup.json', settings.environement, connectionURI);
    }

    if (!connectionURI) {
      console.info('ffwd-modeling settings', settings);
      throw new Error('Sequelize connection is impossible');
    }

    sequelize =_connections[connectionURI] = 
      (_connections[connectionURI] || dbConnect(connectionURI, {
          Sequelize: Sequelize,
          logging: false
        }));
  }
  


  function modeling(name) {
    if (!_models[name]) {
      // console.trace('model name', [[name]]);
      throw new Error('the model "'+ name +'" does not exists');
    }
    return _models[name];
  }


  modeling.sequelize = sequelize;

  modeling.Sequelize = Sequelize;

  modeling.isCustomEventEmitter = isCustomEventEmitter;
  
  modeling.isInstance = isInstance;
  
  modeling.isCollection = isCollection;

  var _appDbSync = true;
  modeling.request = function(req, res, next) {
    if (_appDbSync) {
      _appDbSync = false;
      sequelize.sync()
        .then(function() {
          allRequestsCallback(req, res, next);
        }, next);
    }
    else {
      allRequestsCallback(req, res, next);
    }
  };
  
  modeling.import = function(importable) {
    importModel(importable, sequelize);

    _.each(_relations, _setupRelations, {
      sequelize: sequelize
    });

    return _models;
  };

  modeling.modelNames = function() {
    return Object.keys(_models);
  };
  
  return modeling;
};