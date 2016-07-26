define(['lib/class', 'packettypes', 'utils', 'npc'], function(Class, PacketTypes, Utils, NPC) {
  var ClientPacketHandler = {
    init: function() {},

    handlePacket: function(client, packet) {
      var self = this;
      var packetType = packet.packetType;
      var handled = false;

      // Set current client while we handle this packet
      self.currentClient = client;
      switch (packetType) {
        case PacketTypes.PlayerInfo:
          handled = self.handlePlayerInfo(packet);
          break;

        case PacketTypes.UpdatePlayerBuff:
          handled = self.handleUpdatePlayerBuff(packet);
          break;

        case PacketTypes.AddPlayerBuff:
          handled = self.handleAddPlayerBuff(packet);
          break;
          //case PacketTypes. 
          // Either will be sent, but not both
        case PacketTypes.ContinueConnecting2:
        case PacketTypes.Status:
          if (self.currentClient.state === 0) {
            // Finished sending inventory
            self.currentClient.state = 1;
          }
          break;

        case PacketTypes.UpdateItemOwner:
          // Prevent this being sent unless state is 1
          // this prevents issues with joining while items
          // are next to the player on the past server
          if (self.currentClient.state !== 1) {
            handled = true;
          }
          break;

        case PacketTypes.ChatMessage:
          handled = self.handleChatMessage(packet);
          break;

        case PacketTypes.DimensionsUpdate:
          // Client cannot send 67 (It's used by Dimensions to communicate special info)
          handled = true;
          break;

        case PacketTypes.ClientUUID:
          handled = self.handleClientUUID(packet);
          break;

        case PacketTypes.NPCStrike:
          handled = self.handleNPCStrike(packet);
          break;
      }

      return !handled ? packet.data : "";
    },

    handlePlayerInfo: function(packet) {
      var self = this;
      var nameLength = parseInt(packet.data.substr(12, 2), 16);
      if (self.currentClient.name === null) {
        // Take the appropriate hex chars out of the packet
        // then convert them to ascii
        var name = Utils.hex2a(packet.data.substr(14, nameLength * 2));
        self.currentClient.setName(name);
      }

      return false;
    },

    handleUpdatePlayerBuff: function(packet) {
      var self = this;
      var reader = new Utils.ReadPacketFactory(packet.data);
      var playerID = reader.readByte();
      var updatePlayerBuff = (new Utils.PacketFactory())
        .setType(PacketTypes.UpdatePlayerBuff)
        .packByte(playerID);

      for (var i = 0; i < 22; i++) {
        if (reader.packetData.length !== 0) {
          var buffType = reader.readByte();
          if (!self.currentClient.options.blockInvis || buffType !== 10) {
            updatePlayerBuff.packByte(buffType);
          } else {
            updatePlayerBuff.packByte(0);
          }
        }
      }

      self.currentClient.server.socket.write(new Buffer(updatePlayerBuff.data(), 'hex'));
      return true;
    },

    handleAddPlayerBuff: function(packet) {
      var self = this;
      var reader = new Utils.ReadPacketFactory(packet.data);
      var playerID = reader.readByte();
      var buffID = reader.readByte();

      if (self.currentClient.options.blockInvis) {
        return buffID === 10;
      } else {
        return false;
      }
    },

    handleChatMessage: function(packet) {
      var self = this;
      var handled = false;
      var chatMessage = Utils.hex2a(packet.data.substr(16));

      // If chat message is a command
      if (chatMessage.length > 1 && chatMessage.substr(0, 1) === "/") {
        var command = self.currentClient.globalHandlers.command.parseCommand(chatMessage);
        handled = self.currentClient.globalHandlers.command.handle(command.name.toLowerCase(), command.args, self.currentClient);
      }

      return handled;
    },

    handleClientUUID: function(packet) {
      var self = this;
      var reader = new Utils.ReadPacketFactory(packet.data);
      self.currentClient.clientUUID = reader.readString();

      return false;
    },

    handleNPCStrike: function(packet) {
      var self = this;
      var reader = new Utils.ReadPacketFactory(packet.data);
      var NPCID = reader.readInt16();
      var damage = reader.readInt16();

      if (self.currentClient.server.entityTracking.NPCs[NPCID]) {
        if (damage > 0) {
          self.currentClient.server.entityTracking.NPCs[NPCID].life -= damage;
          if (self.currentClient.server.entityTracking.NPCs[NPCID].life <= 0) {
            self.currentClient.server.entityTracking.NPCs[NPCID] = false;
          }
        } else {
          self.currentClient.server.entityTracking.NPCs[NPCID] = false;
        }
      }

      return false;
    }
  };
  return Class.extend(ClientPacketHandler);
});
