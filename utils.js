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

    getPacketsFromHexString: function(str) {
      var packets = [];
      var end = false;
      var length;
      var data;
      var index = 0;
      var packetType;
      var bufferPacket = "";
      while (!end) {
        if (str.substr(index).length > 0) {
          //console.log(str.substr(index)+" - "+str.substr(index).length);
          // Length is *2 because we are parsing individual characters,
          // instead of individual bytes
          length = parseInt(str.substr(index + 2, 2) + str.substr(index, 2), 16) * 2;

          if (length === 0) {
            end = true;
          } else {
            data = str.substr(index, length);
            index += length;
            if (index > str.length) {
              console.log("Index [" + index + "] exceeds data length [" + str.length + "]");
              bufferPacket = data;
            } else {
              packetType = Utils.getPacketTypeFromHexString(data);
              packets.push({
                packetType: packetType,
                data: data
              });
            }
          }
        } else {
          end = true;
        }
      }

      return { bufferPacket: bufferPacket, packets: packets };
    },
  };

  return Utils;
});
