/* jshint node: true */
'use strict';

module.exports = function (grunt) {
  var pkg = require('./package.json');

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  var deps = [
    'node_modules/grunt-contrib-requirejs/node_modules/requirejs/require',
    'jquery',
    'underscore',
    'backbone',
    'validator'
  ];


  grunt.initConfig({
    pkg: pkg,

    clean: [
      'dist',
      '.tmp',
      'doc/server',
      'doc/client'
    ],

    watch: {
      options: {
        livereload: false
      },
      scripts: {
        files: [
          'client/scripts/**/*.js'
        ],
        tasks: [
          'newer:jshint:client',
          'requirejs:dist'
        ]
      },
      served: {
        options: {
          livereload: true
        },
        files: [
          'dist'
        ],
        tasks: []
      }
    },

    jshint: {
      options: {
        jshintrc: true
      },
      client: {
        files: {
          src: [
            'client/scripts/**/*.js'
          ]
        }
      },
      server: {
        files: {
          src: [
            'server/**/*.js'
          ]
        }
      },
      test: {
        files: {
          src: [
            'test/**/*.js'
          ]
        }
      }
    },

    jsdoc: {
      options: {
        
        plugins: [
          'plugins/markdown'
        ],
        markdown: {
          parser: 'gfm'
        }
      },
      client: {
        options: {
          destination: 'doc/client'
        },
        src: [
          'client/README.md',
          'client/scripts/**/*.js',
          'test/client/**/*.js'
        ]
      },
      server: {
        options: {
          destination: 'doc/server'
        },
        src: [
          'client/README.md',
          'server/**/*.js',
          'test/server/**/*.js'
        ]
      }
    },

    requirejs: {
      options: {
        paths: {
          jquery: 'node_modules/jquery/dist/jquery',
          underscore: 'node_modules/underscore/underscore',
          backbone: 'node_modules/backbone/backbone',
          validator: 'node_modules/validator/validator'
        },

        //A function that is called for each JS module bundle that has been
        //completed. This function is called after all module bundles have
        //completed, but it is called for each bundle. A module bundle is a
        //"modules" entry or if just a single file JS optimization, the
        //optimized JS file.
        //Introduced in r.js version 2.1.6
        onModuleBundleComplete: function (data) {
          /*
          data.name: the bundle name.
          data.path: the bundle path relative to the output directory.
          data.included: an array of items included in the build bundle.
          If a file path, it is relative to the output directory. Loader
          plugin IDs are also included in this array, but depending
          on the plugin, may or may not have something inlined in the
          module bundle.
          */
          console.info('onModuleBundleComplete', data);
        },

        //A function that if defined will be called for every file read in the
        //build that is done to trace JS dependencies. This allows transforms of
        //the content.
        onBuildRead: function (moduleName, path, contents) {
          console.info('onBuildRead', moduleName);
          //Always return a value.
          //This is just a contrived example.
          return contents;//.replace(/foo/g, 'bar');
        },

        //A function that will be called for every write to an optimized bundle
        //of modules. This allows transforms of the content before serialization.
        onBuildWrite: function (moduleName, path, contents) {
          console.info('onBuildWrite', moduleName);
          //Always return a value.
          //This is just a contrived example.
          return contents;//.replace(/bar/g, 'foo');
        },
      },

      deps: {
        options: {
          optimize: 'uglify2',
          preserveLicenseComments: false,
          generateSourceMaps: true,
          create: true,
          name: '<%= pkg.name %>-deps',
          out: 'dist/deps.js',
          include: deps
        }
      },

      dist: {
        options: {
          optimize: 'uglify2',
          preserveLicenseComments: false,
          generateSourceMaps: true,
          name: 'client/scripts/index',
          out: 'dist/<%= pkg.name %>.js',
          exclude: deps,
          include: []
        }
      }
    }
  });

  grunt.registerTask('build', [
    'clean',
    'jshint',
    'requirejs',
    'jsdoc'
  ]);

  grunt.registerTask('develop', [
    'requirejs',
    'watch:scripts'
  ]);

  grunt.registerTask('default', [
    'clean',
    'requirejs'
  ]);

  grunt.registerTask('serve', [
    'build',
    'express:dist',
    'express-keepalive'
  ]);
};
