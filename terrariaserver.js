define(['utils', 'config', 'packettypes'], function(Utils, Config, PacketTypes) {
  var TerrariaServer = Class.extend({
    init: function(socket, client) {
      this.socket = socket;
      this.client = client;
      this.ip = null;
      this.port = null;
    },

    handleData: function(encodedData) {
      var handled = false;
      var data = Utils.hex2str(encodedData);
      var packetType = Utils.getPacketTypeFromHexString(data);
      if (PacketTypes[packetType]) {
        if (packetType == 1 || packetType == 2)
          console.log(this.ip+":"+this.port+" Server Packet [" + packetType + "]: " + (PacketTypes[packetType]));
        //console.log(hex);

        if (packetType == 2) {
          handled = true;
          var dcReason = Utils.hex2a(data.substr(6));
          if (dcReason.length < 50) {
            this.socket.destroy();
            //console.log(this);
            var color = "ff0000"; // Red
            var message = "The server disconnected you. Reason Given: " + dcReason;
            this.client.sendChatMessage(message, color);


            color = "00ff00"; // Red
            message = "Returning you to the Portal Server.";
            this.client.sendChatMessage(message, color);
          }
          //changeServer('localhost', '7777');
          //console.log(hex2a(hex.substr(6)));
          // console.log(hex);
        }
      }

      var pT;
      if (this.client.state === 2) {
      	var clientData;
        if (packetType === 7) {
          clientData = new Buffer("0b0008ffffffffffffffff", 'hex');
          this.socket.write(clientData);
          //LogClientPacket(clientData);


          clientData = new Buffer("08000c00ffffffff", 'hex');
          this.socket.write(clientData);
          //LogClientPacket(clientData);
          state = 0;
        }
      }

      if (!handled) {
        this.client.socket.write(encodedData);
      }
    },

    handleError: function(error) {
    	//this.client.changeServer(Config.IP, Config.PORT);
      console.log("Err: "+error);
      this.socket.destroy();
    }
  });

  return TerrariaServer;
});
