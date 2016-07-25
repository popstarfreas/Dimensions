define(['lib/class', 'packettypes', 'utils'], function(Class, PacketTypes, Utils) {
  var TerrariaServerPacketHandler = function(PacketTypes, Utils) {
    return {
      init: function() {},

      handlePacket: function(server, packet) {
        var self = this;
        var handled = false;
        var packetType = packet.packetType;
        self.currentServer = server;
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

          case PacketTypes.CompleteConnectionAndSpawn:
            handled = self.handleCompleteConnectionAndSpawn(packet);
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
        if (!self.currentServer.client.ingame) {
          self.currentServer.client.socket.write(new Buffer(packet.data, 'hex'));
          self.currentServer.client.socket.destroy();
        } else {
          var reader = Utils.ReadPacketFactory(packet.data);
          var dcReason = reader.readString();
          if (dcReason.length < 50) {
            var color = "C8FF00"; // shitty green
            var message = "[Dimensional Alert]";
            self.currentServer.client.sendChatMessage(message, color);
            self.currentServer.client.sendChatMessage(dcReason, color);
            self.currentServer.client.wasKicked = true;
            self.currentServer.client.connected = false;
            self.socket.destroy();
          }
        }

        return true;
      },

      handleContinueConnecting: function(packet) {
        var self = this;
        var reader = Utils.ReadPacketFactory(packet.data);
        self.currentServer.client.player.id = reader.readByte();

        // Send IP Address
        var ip = Utils.getProperIP(self.currentServer.client.socket.remoteAddress);
        var packetData = Utils.PacketFactory()
          .setType(PacketTypes.DimensionsUpdate)
          .packInt16(0) // Type
          .packString(ip)
          .data();
        var data = new Buffer(packetData, 'hex');
        self.currentServer.socket.write(data);

        return false;
      },

      handleWorldInfo: function(packet) {
        var self = this;
        if (self.currentServer.client.state === 2) {
          var reader = Utils.ReadPacketFactory(packet.data);
          reader.readInt32(); // Time
          reader.readByte(); // Day&MoonInfo
          reader.readByte(); // Moon Phase
          reader.readInt16(); // MaxTilesX
          reader.readInt16(); // MaxTilesY
          self.currentServer.spawn.x = reader.readInt16();
          self.currentServer.spawn.y = reader.readInt16();

          // In future it would be better to check if they used a warpplate
          // so the tile section is where they came through instead of spawn
          var getSection = Utils.PacketFactory()
            .setType(PacketTypes.GetSectionOrRequestSync)
            .packSingle(-1)
            .packSingle(-1)
            .data();
          self.currentServer.socket.write(new Buffer(getSection, 'hex'));

          self.currentServer.client.state = 3;
          self.clearPlayers(self.currentServer.client);

          // Routing Information for Warpplate entry
          if (self.currentServer.client.routingInformation !== null) {
            var dimensionsUpdate = Utils.PacketFactory()
              .setType(PacketTypes.DimensionsUpdate)
              .packInt16(self.currentServer.client.routingInformation.type)
              .packString(self.currentServer.client.routingInformation.info)
              .data();
            self.currentServer.socket.write(new Buffer(dimensionsUpdate, 'hex'));
            self.currentServer.client.routingInformation = null;
          }
        }

        return false;
      },

      handleCompleteConnectionAndSpawn: function(packet) {
        var self = this;
        if (self.currentServer.client.state === 3) {
          self.currentServer.client.state = 1;
          var spawnPlayer = Utils.PacketFactory()
            .setType(PacketTypes.SpawnPlayer)
            .packByte(self.currentServer.client.player.id)
            .packInt16(self.currentServer.spawn.x)
            .packInt16(self.currentServer.spawn.y)
            .data();

          setTimeout(function sendSpawnPlayer() {
            if (self.currentServer.client && self.currentServer.client.socket) {
              self.currentServer.socket.write(new Buffer(spawnPlayer, 'hex'));

              if (!self.currentServer.client.preventSpawnOnJoin) {
                self.currentServer.client.socket.write(new Buffer(spawnPlayer, 'hex'));
              }
            }
          }, 2000);
        }

        self.currentServer.client.ingame = true;

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

      clearPlayers: function(client) {
        var playerActive;
        for (var playerID = 0; playerID < 255; playerID++) {
          if (playerID === client.player.id)
            continue;

          playerActive = Utils.PacketFactory()
            .setType(PacketTypes.PlayerActive)
            .packByte(playerID)
            .packByte(0) // Active
            .data();
          client.socket.write(new Buffer(playerActive, 'hex'));
        }
      },

      clearNPCs: function(client) {
        var updateNPC;
        for (var npcID = 0; npcID < 200; npcID++) {
          updateNPC = Utils.PacketFactory()
            .setType(PacketTypes.NPCUpdate)
            .packInt16(npcID)
            .packSingle(0) // PositionX
            .packSingle(0) // PositionY
            .packSingle(0) // VelocityX
            .packSingle(0) // VelocityY
            .packByte(0) // Target
            .packByte(0) // Flags
            .packInt16(0) // NPC NetID
            .packInt32(0) // Life
            .packByte(0)
            .data();
          client.socket.write(new Buffer(updateNPC, 'hex'));
        }
      },

      clearItems: function(client) {
        var updateItemDrop;
        for (var itemID = 0; itemID < 400; itemID++) {
          updateItemDrop = Utils.PacketFactory()
            .setType(PacketTypes.UpdateItemDrop)
            .packInt16(itemID)
            .packSingle(0) // PositionX
            .packSingle(0) // PositionY
            .packSingle(0) // VelocityX
            .packSingle(0) // VelocityY
            .packInt16(0) // Stacks
            .packByte(0) // Prefix
            .packByte(0) // NoDelay
            .packInt16(0)
            .data();
          client.socket.write(new Buffer(updateItemDrop, 'hex'));
        }
      },
    };
  };
  return Class.extend((TerrariaServerPacketHandler(PacketTypes, Utils)));
});
