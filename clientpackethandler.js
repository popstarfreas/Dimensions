define(['lib/class', 'PacketTypes', 'Utils'], function(Class, PacketTypes, Utils) {
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
      var reader = Utils.ReadPacketFactory(packet.data);
      self.currentClient.clientUUID = reader.readString();

      return false;
    },
  };
  return Class.extend(ClientPacketHandler);
});
