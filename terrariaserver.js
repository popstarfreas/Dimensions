define(['utils', 'config', 'packettypes', 'underscore'], function(Utils, Config, PacketTypes, _) {
  var TerrariaServer = Class.extend({
    init: function(socket, client) {
      this.socket = socket;
      this.client = client;
      this.ip = null;
      this.port = null;
      this.spawn = {
        x: 0,
        y: 0
      };
      this.playerID = "00";
      this.bufferPacket = "";
    },

    handleData: function(encodedData) {
      var self = this;
      var handled = false;
      var incompleteData = Utils.hex2str(encodedData);
      //console.log(entireData);

      if (this.bufferPacket.length > 0) {
        console.log("Used bufferPacket");
      }
      var skip = false;

      // This is the incomplete packet carried over from last time
      var bufferPacket = this.bufferPacket;
      var entireData = bufferPacket + incompleteData;
      var entireDataInfo = Utils.getPacketsFromHexString(entireData);
      this.bufferPacket = entireDataInfo.bufferPacket;
      var packets = entireDataInfo.packets;
      _.each(packets, function(packet) {
        var data = packet.data;
        var packetType = packet.packetType;
        console.log(self.ip + ":" + self.port + " Server Packet [" + packetType + "]: " + (PacketTypes[packetType]));
        if (!skip) {
          if (typeof PacketTypes[packetType] === 'undefined') {
            self.client.sendChatMessage("We received an unknown packet. To prevent client issues we have closed the routing service.", "ff0000");
            console.log(entireData);
            console.log(self.ip + ":" + self.port + " Server Packet [" + packetType + "]: " + (PacketTypes[packetType]));
            process.exit();
          }

          if (packetType === 10) {
            skip = true;
          } else {
            if (PacketTypes[packetType]) {
              //console.log(hex);
              if (packetType == 2) {
                handled = true;
                var dcReason = Utils.hex2a(data.substr(6));
                var message = "The server disconnected you. Reason Given: " + dcReason;
                if (dcReason.length < 50) {
                  //self.socket.destroy();
                  //console.log(this);
                  var color = "ff0000"; // Red
                  var message = "The server disconnected you. Reason Given: " + dcReason;
                  console.log("The server disconnected you. Reason Given: " + dcReason);
                  //console.log(entireData)
                  self.client.sendChatMessage(message, color);


                  color = "00ff00"; // Red
                  message = "Returning you to the Portal Server.";
                  self.client.sendChatMessage(message, color);
                }
                //changeServer('localhost', '7777');
                //console.log(hex2a(hex.substr(6)));
                // console.log(hex);
              }
            }

            if (packetType === 3) {
              self.client.player.id = parseInt(data.substr(6, 2), 16);
              console.log("Set playerID to " + self.client.player.id);
            }

            var pT;
            var clientData;
            if (self.client.state === 2) {
              if (packetType === 7) {
                self.spawn.x = data.substr(26, 4);
                self.spawn.y = data.substr(28, 4);
                clientData = new Buffer("0b0008ffffffffffffffff", 'hex');
                self.socket.write(clientData);
                //console.log("Client Packet [8]: Get Section/Request Sync [By Relay]");
                //LogClientPacket(clientData);


                //setTimeout(function() {
                //  clientData = new Buffer("0e 00 41 04 " + self.playerID + " 00 98 83 47 00 40 7c 46", 'hex');
                //  self.client.socket.write(clientData);
                //}.bind(this), 5000);

                //clientData = new Buffer("00002cFF0000000100", 'hex');
                //self.socket.write(clientData);
                self.client.state = 3;
              }
            }

            if (packetType === 101 && self.client.state === 3) {
              self.client.state = 0;
              clientData = new Buffer("08000c" + self.playerID + self.spawn.x + self.spawn.y, 'hex');
              self.socket.write(clientData);
              //console.log("Client Packet [12]: Spawn Player [By Relay]");
              self.client.socket.write(clientData);
              console.log(self.ip + ":" + self.port + " Server Packet [12]: Spawn Player [By Relay]");

              self.client.tellSelfToClearPlayers();
              //self.client.tellSelfToClearNPCs();
            }
          }
        }
      });

      if (!handled) {
        this.client.socket.write(encodedData);
      }
    },

    handleError: function(error) {
      //this.client.changeServer(Config.IP, Config.PORT);
      console.log("Err: " + error);
      this.socket.destroy();
      this.client.connected = false;
      this.client.sendChatMessage("The Dimension you were in has encountered a paradox and is being destroyed.", "F00000");
      this.client.sendChatMessage("Specify a Dimension to travel to: /main, /mirror, /zombies, /pvp", "F00000")
    }
  });

  return TerrariaServer;
});
