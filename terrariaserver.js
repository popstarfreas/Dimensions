define(['utils', 'config', 'packettypes', 'underscore'], function(Utils, Config, PacketTypes, _) {
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
          allowedPackets += self.handlePacket(packet);
        });

        if (allowedPackets.length > 0) {
          this.client.socket.write(new Buffer(allowedPackets, "hex"));
        }
      }
      catch (e) {
        console.log("TS Handle Data Error: " + e);
      }
    },

    handlePacket: function(packet) {
      var self = this;
      var handled = false;
      var packetType = packet.packetType;

      switch (packetType) {
        case PacketTypes.Disconnect:
          handled = self.handleDisconnect(packet);
          break;

        case PacketTypes.ContinueConnecting:
          handled = self.handleContinueConnecting(packet);
          break;

        case PacketTypes.WorldInfo:
          handled = self.handleWorldInfo(packet);
          break;

        case PacketTypes.UpdateShieldStrengths:
          handled = self.handleUpdateShieldStrengths(packet);
          break;

        case PacketTypes.DimensionsUpdate:
          handled = self.handleDimensionsUpdate(packet);
          break;

        default:
          break;
      }
      
      return !handled ? packet.data : "";
    },

    /* Start Packet Handlers */
    handleDisconnect: function(packet) {
      var self = this;
      if (!self.client.ingame) {
        self.client.socket.write(new Buffer(packet.data, 'hex'));
        self.client.socket.destroy();
      }
      else {
        var reader = Utils.ReadPacketFactory(packet.data);
        var dcReason = reader.readString();
        if (dcReason.length < 50) {
          var color = "C8FF00"; // shitty green
          var message = "[Dimensional Alert]";
          self.client.sendChatMessage(message, color);
          self.client.sendChatMessage(dcReason, color);
          self.client.wasKicked = true;
          self.client.connected = false;
          self.socket.destroy();
        }
      }

      return true;
    },

    handleContinueConnecting: function(packet) {
      var self = this;
      var reader = Utils.ReadPacketFactory(packet.data);
      self.client.player.id = reader.readByte();

      // Send IP Address
      var ip = Utils.getProperIP(self.client.socket.remoteAddress);
      var packetData = Utils.PacketFactory()
        .setType(PacketTypes.DimensionsUpdate)
        .packInt16(0)
        .packString(ip)
        .data();
      var data = new Buffer(packetData, 'hex');
      self.socket.write(data);

      return false;
    },

    handleWorldInfo: function(packet) {
      var self = this;
      if (self.client.state === 2) {
        var reader = Utils.ReadPacketFactory(packet.data);
        reader.readInt32(); // Time
        reader.readByte(); // Day&MoonInfo
        reader.readByte(); // Moon Phase
        reader.readInt16(); // MaxTilesX
        reader.readInt16(); // MaxTilesY
        self.spawn.x = reader.readInt16();
        self.spawn.y = reader.readInt16();

        // In future it would be better to check if they used a warpplate
        // so the tile section is where they came through instead of spawn
        var getSection = Utils.PacketFactory()
          .setType(PacketTypes.GetSectionOrRequestSync)
          .packSingle(-1)
          .packSingle(-1)
          .data();
        self.socket.write(new Buffer(getSection, 'hex'));

        self.client.state = 3;
        self.client.tellSelfToClearPlayers();

        // Routing Information for Warpplate entry
        if (self.client.routingInformation !== null) {
          var dimensionsUpdate = Utils.PacketFactory()
            .setType(PacketTypes.DimensionsUpdate)
            .packInt16(self.client.routingInformation.type)
            .packString(self.client.routingInformation.info)
            .data();
          self.socket.write(new Buffer(dimensionsUpdate, 'hex'));
          self.client.routingInformation = null;
        }
      }

      return false;
    },

    handleUpdateShieldStrengths: function(packet) {
      var self = this;
      if (self.client.state === 3) {
        self.client.state = 1;
        var spawnPlayer = Utils.PacketFactory()
          .setType(PacketTypes.SpawnPlayer)
          .packByte(self.client.player.id)
          .packInt16(self.spawn.x)
          .packInt16(self.spawn.y)
          .data();

        setTimeout(function sendSpawnPlayer() {
          if (self.client && self.client.socket) {
            self.socket.write(new Buffer(spawnPlayer, 'hex'));

            if (!self.client.preventSpawnOnJoin) {
              self.client.socket.write(new Buffer(spawnPlayer, 'hex'));
            }
          }
        }, 1000);
      }

      self.client.ingame = true;

      return false;
    },

    handleDimensionsUpdate: function(packet) {
      var reader = Utils.ReadPacketFactory(packet.data);
      var messageType = reader.readInt16();
      var messageContent = reader.readString();

      // Switch server
      if (messageType == 2) {
        if (this.client.servers[messageContent.toLowerCase()]) {
          this.client.sendChatMessage("Shifting to the " + messageContent + " Dimension", "FF0000");
          this.client.changeServer(this.client.servers[messageContent.toLowerCase()], {
            preventSpawnOnJoin: true
          });
        }
      }

      return true;
    },

    /* End Packet Handlers */

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
