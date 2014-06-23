var _ = require('ffwd-utils')._;
var expect = require('expect.js');
var request = require('supertest');
var path = require('path');


var cwd = process.cwd();
function stackPutz(err) {
  console.warn((''+err.stack).split(cwd).join('.'));
}


function testFeature() {
  return {
    request: function(req, res, next) {
      expect(res.send).to.be.a('function');
      expect(res.originalSend).to.be.a('function');

      expect(res.app).to.be.ok();
      expect(res.app.features).to.be.an('object');

      next();
    },
    routes: {
      '/': {
        get: function(req, res, next) {
          res.locals.body = 'home sweet home';
          res.render('default');
        }
      }
    }
  };
}


describe('The web server', function() {
  var app, server;
  describe('module', function() {
    it('loads', function() {
      expect(function() {
        server = require('ffwd-net/server');
      }).not.to.throwError(stackPutz);

      expect(server).to.be.a('function');
    });
  });


  describe('initialization', function() {
    it('takes an object', function() {
      expect(function() {
        app = server({
          views: path.dirname(require.resolve('ffwd-net/client/templates/default.tpl')) +'',

          features: {
            'ffwd-modeling': {
              environment: 'test'
            },
            test: testFeature
          }
        });
      }).not.to.throwError(stackPutz);
    });


    it('adds the "features" property to the "app"', function() {
      expect(app.features).to.be.an('object');
      expect(app.features).to.have.keys([
        'modeling',
        'test'
      ]);
    });
  });

  describe('runtime', function() {
    it('overrides the default send method of responses', function(done) {
      request(app)
        .get('/')
        .expect(/home sweet home/)
        .expect(200, done);
    });
  });
});