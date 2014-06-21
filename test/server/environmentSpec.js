var expect = require('expect.js');

describe('The environment', function() {
  var utils;

  it('loads without blowing', function() {
    expect(function() {
      utils = require('ffwd/test/server/utils');
    }).not.to.throwError();
  });


  describe('the test utilities', function() {
    
  });
});