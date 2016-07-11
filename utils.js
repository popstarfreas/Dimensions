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

      var builtString = arr.join('');

      // Must have even number of hex digits
      if (builtString.length % 2 !== 0) {
        builtString = "0"+builtString;
      }
      return builtString;
    },

    str2Hex: function(str) {
      return new Buffer(str, 'hex');
    },

    hex2str: function(hex) {
      return hex.toString("hex");
    },

    getProperIP: function(ip) {
      var IPFromRequest = ip;
      var indexOfColon = IPFromRequest.lastIndexOf(':');
      var IP = IPFromRequest.substring(indexOfColon+1,IPFromRequest.length);
      return IP;
    },

    getPacketLengthFromData: function(hexStr) {
      prePacketLength = (hexStr.length / 2).toString(16);
      if (prePacketLength.length !== 4) {
        for (var j = prePacketLength.length; j < 4; j++) {
          prePacketLength = "0" + prePacketLength;
        }
      }

      // Assign hex packet length
      packetLength = (prePacketLength.length / 2 + parseInt(prePacketLength, 16)).toString(16);

      // Ensure it takes up 4 hex digits
      if (packetLength.length !== 4) {
        for (var j = packetLength.length; j < 4; j++) {
          packetLength = "0" + packetLength;
        }
      }

      // Reverse byte order
      firstByte = packetLength.substr(0, 2);
      secondByte = packetLength.substr(2, 2);
      packetLength = secondByte + firstByte + packetLength.substr(4);

      return packetLength;
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
              //console.log("Index [" + index + "] exceeds data length [" + str.length + "]");
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
