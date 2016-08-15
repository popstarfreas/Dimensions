define(['utils', 'config', 'packettypes', 'underscore', 'terrariaserverpackethandler'], function(Utils, Config, PacketTypes, _, TerrariaServerPacketHandler) {
  var TerrariaServer = Class.extend({
    init: function(socket, client) {
      this.socket = socket;
      this.client = client;
      this.reset();
    },

    reset: function() {
      this.ip = null;
      this.port = null;
      this.name = "";
      this.spawn = {
        x: 0,
        y: 0
      };
      this.bufferPacket = "";
      this.afterClosed = null;
      this.entityTracking = {
        items: [],
        NPCs: [],
        players: []
      };
      this.isSSC = false;
    },

    getPacketHandler: function() {
      return this.client.globalHandlers.terrariaServerPacketHandler;
    },

    handleData: function(encodedData) {
      try {
        var self = this;
        var incompleteData = Utils.hex2str(encodedData);

        // This is the incomplete packet carried over from last time
        var bufferPacket = this.bufferPacket;

        // The combined packet info using buffer
        var entireData = bufferPacket + incompleteData;

        // Get an array of packets from the entireData
        var entireDataInfo = Utils.getPacketsFromHexString(entireData);

        // Update buffer packet to the new incomplete packet (if any)
        this.bufferPacket = entireDataInfo.bufferPacket;

        // The hex string of the allowed packets to send to the client
        var allowedPackets = "";

        // Inspect and handle each packet
        var packets = entireDataInfo.packets;
        _.each(packets, function(packet) {
          allowedPackets += self.getPacketHandler().handlePacket(self, packet);
        });

        if (allowedPackets.length > 0) {
          this.client.socket.write(new Buffer(allowedPackets, "hex"));
        }
      } catch (e) {
        console.log("TS Handle Data Error: " + e.stack);
      }
    },

    handleClose: function() {
      var self = this;
      //console.log("TerrariaServer socket closed. [" + self.name + "]");
      try {
        if (self.client.countIncremented) {
          self.client.serverDetails[self.name].counts--;
          self.client.countIncremented = false;
        }
      } catch (e) {
        console.log("handleClose Err: " + e);
      }

      if (self.afterClosed !== null) {
        self.afterClosed(self.client);
      } else {
        var dimensionsList = "";
        var dimensionNames = _.keys(self.client.servers);
        for (var i = 0; i < dimensionNames.length; i++) {
          dimensionsList += (i > 0 ? ", " : " ") + "/" + dimensionNames[i];
        }

        if (!self.client.wasKicked) {
          self.client.sendChatMessage("The timeline you were in has collapsed.", "00BFFF");
          self.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
        } else {
          self.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
          self.client.wasKicked = false;
        }
      }
    },

    handleError: function(error) {
      //console.log(this.ip + ":" + this.port + " " + this.name);
      //this.client.changeServer(Config.IP, Config.PORT);
      console.log("TerrariaServer Socket Error: " + error);
      this.socket.destroy();
      this.client.connected = false;
    }
  });

  return TerrariaServer;
});
