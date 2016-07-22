var TerrariaServerPacketHandler = {
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

      case PacketTypes.UpdateShieldStrengths:
        handled = self.handleUpdateShieldStrengths(packet);
        break;

      case PacketTypes.DimensionsUpdate:
        handled = self.handleDimensionsUpdate(packet);
        break;

      case PacketTypes.AddPlayerBuff:
        var reader = Utils.ReadPacketFactory(packet.data);
        var playerID = reader.readByte();
        var buff = reader.readByte();
        var time = reader.readInt16();

        var replacement = Utils.PacketFactory()
          .setType(55)
          .packByte(playerID)
          .packByte(buff)
          .packInt32(time)
          .data();

        return replacement;
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
      self.currentServer.client.tellSelfToClearPlayers();

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

  handleUpdateShieldStrengths: function(packet) {
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
      }, 1000);
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
};

if (typeof define !== 'undefined') {
  define(['lib/class'], function(Class) {
    return Class.extend(TerrariaServerPacketHandler);
  });
} else {
  var Class = require('./lib/class.js');
  module.exports = (Class.extend(TerrariaServerPacketHandler));
}
