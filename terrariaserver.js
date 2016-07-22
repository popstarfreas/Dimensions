define(['utils', 'config', 'packettypes', 'underscore', 'terrariaserverpackethandler'], function(Utils, Config, PacketTypes, _, TerrariaServerPacketHandler) {
  var TerrariaServer = Class.extend({
    init: function(socket, client) {
      this.socket = socket;
      this.client = client;
      this.ip = null;
      this.port = null;
      this.name = "";
      this.spawn = {
        x: 0,
        y: 0
      };
      this.bufferPacket = "";
      this.afterClosed = null;
      this.packetHandler = client.globalHandlers.terrariaServerPacketHandler;
      this.entityTracking = {
        items: [],
        NPCs: [],
        players: []
      };
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
          allowedPackets += self.packetHandler.handlePacket(self, packet);
        });

        if (allowedPackets.length > 0) {
          this.client.socket.write(new Buffer(allowedPackets, "hex"));
        }
      }
      catch (e) {
        console.log("TS Handle Data Error: " + e);
      }
    },

    handleClose: function() {
      //console.log("TerrariaServer socket closed. [" + this.name + "]");
      try {
        if (this.client.countIncremented) {
          this.client.serverCounts[this.name]--;
          this.client.countIncremented = false;
        }
      }
      catch (e) {
        console.log("handleClose Err: " + e);
      }

      if (this.afterClosed !== null) {
        this.afterClosed(this.client);
      }
      else {
        var dimensionsList = "";
        var dimensionNames = _.keys(this.client.servers);
        for (var i = 0; i < dimensionNames.length; i++) {
          dimensionsList += (i > 0 ? ", " : " ") + "/" + dimensionNames[i];
        }

        if (!this.client.wasKicked) {
          this.client.sendChatMessage("The timeline you were in has collapsed.", "00BFFF");
          this.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
        }
        else {
          this.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
          this.client.wasKicked = false;
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
