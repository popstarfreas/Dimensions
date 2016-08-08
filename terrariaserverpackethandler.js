define(['lib/class', 'packettypes', 'utils', 'underscore', 'npc'], function(Class, PacketTypes, Utils, _, NPC) {
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

          case PacketTypes.NPCUpdate:
            handled = self.handleNPCUpdate(packet);
            break;

          case PacketTypes.NPCStrike:
            handled = self.handleNPCStrike(packet);
            break;

          case PacketTypes.UpdateItemDrop_Instanced:
          case PacketTypes.UpdateItemDrop:
            handled = self.handleUpdateItemDrop(packet);
            break;

          case PacketTypes.PlayerActive:
            handled = self.handlePlayerActive(packet);
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
          var reader = new Utils.ReadPacketFactory(packet.data);
          var dcReason = reader.readString();
          if (dcReason.length < 50) {
            var color = "C8FF00"; // shitty green
            var message = "[Dimensional Alert]";
            self.currentServer.client.sendChatMessage(message, color);
            self.currentServer.client.sendChatMessage(dcReason, color);
            self.currentServer.client.wasKicked = true;
            self.currentServer.client.connected = false;

            if (self.socket) {
              self.socket.destroy();
            }
          }
        }

        return true;
      },

      handleContinueConnecting: function(packet) {
        var self = this;
        var reader = new Utils.ReadPacketFactory(packet.data);
        self.currentServer.client.player.id = reader.readByte();

        // Send IP Address
        var ip = Utils.getProperIP(self.currentServer.client.socket.remoteAddress);
        var packetData = (new Utils.PacketFactory())
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

        if (self.currentServer.client.waitingInventoryReset) {
          self.resetInventory(self.currentServer.client);
          self.currentServer.client.waitingInventoryReset = false;
        }

        var reader = new Utils.ReadPacketFactory(packet.data);
        reader.readInt32(); // Time
        reader.readByte(); // Day&MoonInfo
        reader.readByte(); // Moon Phase
        reader.readInt16(); // MaxTilesX
        reader.readInt16(); // MaxTilesY
        var spawn = {
          x: reader.readInt16(),
          y: reader.readInt16()
        };
        reader.readInt16(); // WorldSurface
        reader.readInt16(); // RockLayer
        reader.readInt32(); // WorldID
        reader.readString(); // World Name
        reader.readByte(); // Moon Type
        reader.readByte(); // Tree Background
        reader.readByte(); // Corruption Background
        reader.readByte(); // Jungle Background
        reader.readByte(); // Snow Background
        reader.readByte(); // Hallow Background
        reader.readByte(); // Crimson Background
        reader.readByte(); // Desert Background
        reader.readByte(); // Ocean Background
        reader.readByte(); // Ice Back Style
        reader.readByte(); // Jungle Back Style
        reader.readByte(); // Hell Back Style
        reader.readSingle(); // Wind Speed Set
        reader.readByte(); // Cloud Number
        reader.readInt32(); // Tree 1
        reader.readInt32(); // Tree 2
        reader.readInt32(); // Tree 3
        reader.readByte(); // Tree Style 1
        reader.readByte(); // Tree Style 2
        reader.readByte(); // Tree Style 3
        reader.readByte(); // Tree Style 4
        reader.readInt32(); // Cave Back 1
        reader.readInt32(); // Cave Back 2
        reader.readInt32(); // Cave Back 3
        reader.readByte(); // Cave Back Style 1
        reader.readByte(); // Cave Back Style 2
        reader.readByte(); // Cave Back Style 3
        reader.readByte(); // Cave Back Style 4
        reader.readSingle(); // Rain
        var eventInfo = reader.readByte();
        if ((eventInfo & 64) === 64) {
          self.currentServer.isSSC = true;
        } else {
          self.currentServer.isSSC = false;
        }
        if (self.currentServer.client.state === 2) {
          self.currentServer.spawn.x = spawn.x;
          self.currentServer.spawn.y = spawn.y;
          // In future it would be better to check if they used a warpplate
          // so the tile section is where they came through instead of spawn
          var getSection = (new Utils.PacketFactory())
            .setType(PacketTypes.GetSectionOrRequestSync)
            .packSingle(-1)
            .packSingle(-1)
            .data();
          self.currentServer.socket.write(new Buffer(getSection, 'hex'));

          self.currentServer.client.state = 3;

          // Routing Information for Warpplate entry
          if (self.currentServer.client.routingInformation !== null) {
            var dimensionsUpdate = (new Utils.PacketFactory())
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
          var spawnPlayer = (new Utils.PacketFactory())
            .setType(PacketTypes.SpawnPlayer)
            .packByte(self.currentServer.client.player.id)
            .packInt16(self.currentServer.spawn.x)
            .packInt16(self.currentServer.spawn.y)
            .data();

          var server = self.currentServer;
          setTimeout(function sendSpawnPlayer() {
            if (typeof server.client !== 'undefined' && typeof server.client.socket !== 'undefined') {
              server.socket.write(new Buffer(spawnPlayer, 'hex'));

              if (!server.client.preventSpawnOnJoin) {
                server.client.socket.write(new Buffer(spawnPlayer, 'hex'));
              }
            }
          }, 1000);
        }

        self.currentServer.client.ingame = true;

        self.clearPlayers(self.currentServer.client);
        self.clearNPCs(self.currentServer.client);
        self.clearItems(self.currentServer.client);
        return false;
      },

      handleDimensionsUpdate: function(packet) {
        var self = this;
        var reader = new Utils.ReadPacketFactory(packet.data);
        var messageType = reader.readInt16();
        var messageContent = reader.readString();

        // Switch server
        if (messageType == 2) {
          if (self.currentServer.client.servers[messageContent.toLowerCase()]) {
            self.currentServer.client.sendChatMessage("Shifting to the " + messageContent + " Dimension", "FF0000");
            self.currentServer.client.changeServer(self.currentServer.client.servers[messageContent.toLowerCase()], {
              preventSpawnOnJoin: true
            });
          }
        }

        return true;
      },

      handleNPCUpdate: function(packet) {
        var self = this;
        var reader = new Utils.ReadPacketFactory(packet.data);
        var NPCID = reader.readInt16();
        var position = {
          x: reader.readSingle(),
          y: reader.readSingle()
        };
        var velocity = {
          x: reader.readSingle(),
          y: reader.readSingle()
        };
        var target = reader.readByte();

        // FLags
        var bits = reader.readByte();
        var direction = (bits & 1) === 1;
        var directionY = (bits & 2) === 2;
        var AIBits = [];
        AIBits[0] = (bits & 4) === 4;
        AIBits[1] = (bits & 8) === 8;
        AIBits[2] = (bits & 16) === 16;
        AIBits[3] = (bits & 32) === 32;
        var spriteDirection = (bits & 64) === 64;
        var lifeMax = (bits & 128) === 128;

        var AI = [];
        if (AIBits[0]) {
          AI[0] = reader.readSingle();
        }
        if (AIBits[1]) {
          AI[1] = reader.readSingle();
        }
        if (AIBits[2]) {
          AI[2] = reader.readSingle();
        }
        if (AIBits[3]) {
          AI[3] = reader.readSingle();
        }

        var netID = reader.readInt16();
        var life = 0;
        var lifeBytes = 2;
        if (!lifeMax) {
          lifeBytes = reader.readByte();
          if (lifeBytes == 2) {
            life = reader.readInt16();
          } else if (lifeBytes == 4) {
            life = reader.readInt32();
          } else {
            life = reader.readSByte();
          }
        } else {
          // Placeholder max
          life = 1;
        }

        if (netID === 0 || life === 0) {
          self.currentServer.entityTracking.NPCs[NPCID] = false;
        } else {
          if (self.currentServer.entityTracking.NPCs[NPCID] === false || typeof self.currentServer.entityTracking.NPCs[NPCID] === 'undefined') {
            self.currentServer.entityTracking.NPCs[NPCID] = new NPC(NPCID, netID, life);
          } else {
            self.currentServer.entityTracking.NPCs[NPCID].life = life;
            self.currentServer.entityTracking.NPCs[NPCID].type = netID;
          }
        }

        //self.currentServer.client.socket.write(new Buffer(npcUpdate.data(), 'hex'));
        return false;
      },

      handleNPCStrike: function(packet) {
        var self = this;
        var reader = new Utils.ReadPacketFactory(packet.data);
        var NPCID = reader.readInt16();
        var damage = reader.readInt16();

        if (self.currentServer.entityTracking.NPCs[NPCID]) {
          if (damage > 0) {
            self.currentServer.entityTracking.NPCs[NPCID].life -= damage;
            if (self.currentServer.entityTracking.NPCs[NPCID].life <= 0) {
              self.currentServer.entityTracking.NPCs[NPCID] = false;
            }
          } else {
            self.currentServer.entityTracking.NPCs[NPCID] = false;
          }
        }
        return false;
      },

      handleUpdateItemDrop: function(packet) {
        var self = this;
        var reader = new Utils.ReadPacketFactory(packet.data);
        var itemID = reader.readInt16();
        var position = {
          x: reader.readSingle(),
          y: reader.readSingle()
        };
        var velocity = {
          x: reader.readSingle(),
          y: reader.readSingle()
        };
        var stacks = reader.readInt16();
        var prefix = reader.readByte();
        var noDelay = reader.readByte();
        var netID = reader.readInt16();

        if (netID > 0) {
          self.currentServer.entityTracking.items[itemID] = true;
        } else {
          self.currentServer.entityTracking.items[itemID] = false;
        }
        return false;
      },

      handlePlayerActive: function(packet) {
        var self = this;
        var reader = new Utils.ReadPacketFactory(packet.data);
        var playerID = reader.readByte();
        var active = reader.readByte() === 1;
        self.currentServer.entityTracking.players[playerID] = active;

        return false;
      },

      clearPlayers: function(client) {
        var self = this;
        var playerIDs = _.keys(self.currentServer.entityTracking.players);
        for (var i = 0, len = playerIDs.length; i < len; i++) {
          if (playerIDs[i] === client.player.id)
            continue;

          self.clearPlayer(client, playerIDs[i]);
        }
      },

      clearPlayer: function(client, playerIndex) {
        var playerActive = (new Utils.PacketFactory())
          .setType(PacketTypes.PlayerActive)
          .packByte(playerIndex)
          .packByte(0) // Active
          .data();
        client.socket.write(new Buffer(playerActive, 'hex'));
      },

      clearNPCs: function(client) {
        var self = this;
        var updateNPC;
        var npcIDs = _.keys(self.currentServer.entityTracking.NPCs);
        for (var i = 0, len = npcIDs.length; i < len; i++) {
          if (self.currentServer.entityTracking.NPCs[npcIDs[i]]) {
            self.clearNPC(client, npcIDs[i]);
          }
        }
      },

      clearNPC: function(client, npcIndex) {
        var updateNPC = (new Utils.PacketFactory())
          .setType(PacketTypes.NPCUpdate)
          .packInt16(parseInt(npcIndex))
          .packSingle(0) // PositionX
          .packSingle(0) // PositionY
          .packSingle(0) // VelocityX
          .packSingle(0) // VelocityY
          .packByte(0) // Target
          .packByte(0) // Flags
          .packInt16(0) // NPC NetID
          .packByte(4) // Life ByteSize
          .packInt32(0) // Life
          .packByte(0)
          .data();
        client.socket.write(new Buffer(updateNPC, 'hex'));
        client.server.entityTracking.NPCs[npcIndex] = false;
      },

      clearItems: function(client) {
        var self = this;
        var updateItemDrop;
        var itemIDs = _.keys(self.currentServer.entityTracking.items);
        for (var i = 0, len = itemIDs.length; i < len; i++) {
          if (self.currentServer.entityTracking.items[itemIDs[i]]) {
            self.clearItem(client, itemIDs[i]);
          }
        }
      },

      clearItem: function(client, itemIndex) {
        var updateItemDrop = (new Utils.PacketFactory())
          .setType(PacketTypes.UpdateItemDrop)
          .packInt16(itemIndex)
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
      },

      resetInventory: function(client) {
        var self = this;
        var updateItemDrop;
        var slotIDs = _.keys(self.currentServer.client.inventory);
        for (var i = 0, len = slotIDs.length; i < len; i++) {
          if (self.currentServer.client.inventory[slotIDs[i]]) {
            self.setItem(client, self.currentServer.client.inventory[slotIDs[i]]);
          }
        }
      },

      setItem: function(client, item) {
        var self = this;
        var playerInventorySlot = (new Utils.PacketFactory())
          .setType(PacketTypes.PlayerInventorySlot)
          .packByte(client.player.id)
          .packByte(item.slot)
          .packInt16(item.stack)
          .packByte(item.prefix)
          .packInt16(item.netID)
          .data();
        client.socket.write(new Buffer(playerInventorySlot, 'hex'));
      }
    };
  };
  return Class.extend((TerrariaServerPacketHandler(PacketTypes, Utils)));
});
