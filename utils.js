define(function() {
  var Utils = {
    hex2a: function(hexx) {
      var hex = hexx.toString(); //force conversion
      var str = '';
      for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      return str;
    },

    a2hex: function(str) {
      var arr = [];
      for (var i = 0, l = str.length; i < l; i++) {
        var hex = Number(str.charCodeAt(i)).toString(16);
        arr.push(hex);
      }
      return arr.join('');
    },

    str2Hex: function(str) {
    	return new Buffer(str, 'hex');
    },

    hex2str: function(hex) {
    	return hex.toString("hex");
    },

    getPacketTypeFromHexString: function(str) {
    	// Index 4, Length 2, Base 16
    	return parseInt(str.substr(4, 2), 16);
    },
  }; 

  return Utils;
});
