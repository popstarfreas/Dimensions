require('./lib/class');
var requirejs = require('requirejs');
String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
};
requirejs.config({
  baseUrl: __dirname,
  //Pass the top-level main.js/index.js require
  //function to requirejs so that node modules
  //are loaded relative to the top-level JS file.
  nodeRequire: require
});

requirejs(['dimensions'], function(Dimensions) {
  var dimensions = new Dimensions();
});
