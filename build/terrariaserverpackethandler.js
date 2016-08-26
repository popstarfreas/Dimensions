"use strict";
/// <reference path="typings/index.d.ts" />
var packettypes_1 = require('./packettypes');
var utils_1 = require('./utils');
var _ = require('lodash');
var npc_1 = require('./npc');
var TerrariaServerPacketHandler = (function () {
    function TerrariaServerPacketHandler() {
    }
    TerrariaServerPacketHandler.prototype.handlePacket = function (server, packet) {
        var handled = false;
        var packetType = packet.packetType;
        this.currentServer = server;
        switch (packetType) {
            case packettypes_1["default"].Disconnect:
                handled = this.handleDisconnect(packet);
                break;
            case packettypes_1["default"].ContinueConnecting:
                handled = this.handleContinueConnecting(packet);
                break;
            case packettypes_1["default"].WorldInfo:
                handled = this.handleWorldInfo(packet);
                break;
            case packettypes_1["default"].CompleteConnectionAndSpawn:
                handled = this.handleCompleteConnectionAndSpawn(packet);
                break;
            case packettypes_1["default"].DimensionsUpdate:
                handled = this.handleDimensionsUpdate(packet);
                break;
            case packettypes_1["default"].NPCUpdate:
                handled = this.handleNPCUpdate(packet);
                break;
            case packettypes_1["default"].NPCStrike:
                handled = this.handleNPCStrike(packet);
                break;
            case packettypes_1["default"].UpdateItemDrop_Instanced:
            case packettypes_1["default"].UpdateItemDrop:
                handled = this.handleUpdateItemDrop(packet);
                break;
            case packettypes_1["default"].PlayerActive:
                handled = this.handlePlayerActive(packet);
                break;
            default:
                break;
        }
        return !handled ? packet.data : "";
    };
    /* Start Packet Handlers */
    TerrariaServerPacketHandler.prototype.handleDisconnect = function (packet) {
        if (!this.currentServer.client.ingame) {
            this.currentServer.client.socket.write(new Buffer(packet.data, 'hex'));
            this.currentServer.client.socket.destroy();
        }
        else {
            var reader = new utils_1.ReadPacketFactory(packet.data);
            var dcReason = reader.readString();
            if (dcReason.length < 50) {
                var color = "C8FF00"; // shitty green
                var message = "[Dimensional Alert]";
                this.currentServer.client.sendChatMessage(message, color);
                this.currentServer.client.sendChatMessage(dcReason, color);
                this.currentServer.client.wasKicked = true;
                this.currentServer.client.connected = false;
                if (this.socket) {
                    this.socket.destroy();
                }
            }
        }
        return true;
    };
    TerrariaServerPacketHandler.prototype.handleContinueConnecting = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        this.currentServer.client.player.id = reader.readByte();
        // Send IP Address
        var ip = utils_1.getProperIP(this.currentServer.client.socket.remoteAddress);
        var packetData = (new utils_1.PacketFactory())
            .setType(packettypes_1["default"].DimensionsUpdate)
            .packInt16(0) // Type
            .packString(ip)
            .data();
        var data = new Buffer(packetData, 'hex');
        this.currentServer.socket.write(data);
        return false;
    };
    TerrariaServerPacketHandler.prototype.handleWorldInfo = function (packet) {
        if (this.currentServer.client.waitingInventoryReset) {
            this.resetInventory(this.currentServer.client);
            this.currentServer.client.waitingInventoryReset = false;
        }
        var reader = new utils_1.ReadPacketFactory(packet.data);
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
            this.currentServer.isSSC = true;
        }
        else {
            this.currentServer.isSSC = false;
        }
        if (this.currentServer.client.state === 2) {
            this.currentServer.spawn.x = spawn.x;
            this.currentServer.spawn.y = spawn.y;
            // In future it would be better to check if they used a warpplate
            // so the tile section is where they came through instead of spawn
            var getSection = (new utils_1.PacketFactory())
                .setType(packettypes_1["default"].GetSectionOrRequestSync)
                .packSingle(-1)
                .packSingle(-1)
                .data();
            this.currentServer.socket.write(new Buffer(getSection, 'hex'));
            this.currentServer.client.state = 3;
            // Routing Information for Warpplate entry
            if (this.currentServer.client.routingInformation !== null) {
                var dimensionsUpdate = (new utils_1.PacketFactory())
                    .setType(packettypes_1["default"].DimensionsUpdate)
                    .packInt16(this.currentServer.client.routingInformation.type)
                    .packString(this.currentServer.client.routingInformation.info)
                    .data();
                this.currentServer.socket.write(new Buffer(dimensionsUpdate, 'hex'));
                this.currentServer.client.routingInformation = null;
            }
        }
        return false;
    };
    TerrariaServerPacketHandler.prototype.handleCompleteConnectionAndSpawn = function (packet) {
        if (this.currentServer.client.state === 3) {
            this.currentServer.client.state = 1;
            var spawnPlayer_1 = (new utils_1.PacketFactory())
                .setType(packettypes_1["default"].SpawnPlayer)
                .packByte(this.currentServer.client.player.id)
                .packInt16(this.currentServer.spawn.x)
                .packInt16(this.currentServer.spawn.y)
                .data();
            var server_1 = this.currentServer;
            setTimeout(function sendSpawnPlayer() {
                if (typeof server_1.client !== 'undefined' && typeof server_1.client.socket !== 'undefined') {
                    server_1.socket.write(new Buffer(spawnPlayer_1, 'hex'));
                    if (!server_1.client.preventSpawnOnJoin) {
                        server_1.client.socket.write(new Buffer(spawnPlayer_1, 'hex'));
                    }
                }
            }, 1000);
        }
        this.currentServer.client.ingame = true;
        this.clearPlayers(this.currentServer.client);
        this.clearNPCs(this.currentServer.client);
        this.clearItems(this.currentServer.client);
        return false;
    };
    TerrariaServerPacketHandler.prototype.handleDimensionsUpdate = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        var messageType = reader.readInt16();
        var messageContent = reader.readString();
        // Switch server
        if (messageType == 2) {
            if (this.currentServer.client.servers[messageContent.toLowerCase()]) {
                this.currentServer.client.sendChatMessage("Shifting to the " + messageContent + " Dimension", "FF0000");
                this.currentServer.client.changeServer(this.currentServer.client.servers[messageContent.toLowerCase()], {
                    preventSpawnOnJoin: true
                });
            }
        }
        return true;
    };
    TerrariaServerPacketHandler.prototype.handleNPCUpdate = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
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
        // Flags
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
            }
            else if (lifeBytes == 4) {
                life = reader.readInt32();
            }
            else {
                life = reader.readSByte();
            }
        }
        else {
            // Placeholder max
            life = 1;
        }
        if (netID === 0 || life === 0) {
            this.currentServer.entityTracking.NPCs[NPCID] = false;
        }
        else {
            if (this.currentServer.entityTracking.NPCs[NPCID] === false || typeof this.currentServer.entityTracking.NPCs[NPCID] === 'undefined') {
                this.currentServer.entityTracking.NPCs[NPCID] = new npc_1["default"](NPCID, netID, life);
            }
            else {
                this.currentServer.entityTracking.NPCs[NPCID].life = life;
                this.currentServer.entityTracking.NPCs[NPCID].type = netID;
            }
        }
        //self.currentServer.client.socket.write(new Buffer(npcUpdate.data(), 'hex'));
        return false;
    };
    TerrariaServerPacketHandler.prototype.handleNPCStrike = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        var NPCID = reader.readInt16();
        var damage = reader.readInt16();
        if (this.currentServer.entityTracking.NPCs[NPCID]) {
            if (damage > 0) {
                this.currentServer.entityTracking.NPCs[NPCID].life -= damage;
                if (this.currentServer.entityTracking.NPCs[NPCID].life <= 0) {
                    this.currentServer.entityTracking.NPCs[NPCID] = false;
                }
            }
            else {
                this.currentServer.entityTracking.NPCs[NPCID] = false;
            }
        }
        return false;
    };
    TerrariaServerPacketHandler.prototype.handleUpdateItemDrop = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
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
            this.currentServer.entityTracking.items[itemID] = true;
        }
        else {
            this.currentServer.entityTracking.items[itemID] = false;
        }
        return false;
    };
    TerrariaServerPacketHandler.prototype.handlePlayerActive = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        var playerID = reader.readByte();
        var active = reader.readByte() === 1;
        this.currentServer.entityTracking.players[playerID] = active;
        return false;
    };
    TerrariaServerPacketHandler.prototype.clearPlayers = function (client) {
        var playerIDs = _.keys(this.currentServer.entityTracking.players);
        for (var i = 0, len = playerIDs.length; i < len; i++) {
            if (playerIDs[i] === client.player.id)
                continue;
            this.clearPlayer(client, parseInt(playerIDs[i]));
        }
    };
    TerrariaServerPacketHandler.prototype.clearPlayer = function (client, playerIndex) {
        var playerActive = (new utils_1.PacketFactory())
            .setType(packettypes_1["default"].PlayerActive)
            .packByte(playerIndex)
            .packByte(0) // Active
            .data();
        client.socket.write(new Buffer(playerActive, 'hex'));
    };
    TerrariaServerPacketHandler.prototype.clearNPCs = function (client) {
        var npcIDs = _.keys(this.currentServer.entityTracking.NPCs);
        for (var i = 0, len = npcIDs.length; i < len; i++) {
            if (this.currentServer.entityTracking.NPCs[npcIDs[i]]) {
                this.clearNPC(client, parseInt(npcIDs[i]));
            }
        }
    };
    TerrariaServerPacketHandler.prototype.clearNPC = function (client, npcIndex) {
        var updateNPC = (new utils_1.PacketFactory())
            .setType(packettypes_1["default"].NPCUpdate)
            .packInt16(npcIndex)
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
    };
    TerrariaServerPacketHandler.prototype.clearItems = function (client) {
        var itemIDs = _.keys(this.currentServer.entityTracking.items);
        for (var i = 0, len = itemIDs.length; i < len; i++) {
            if (this.currentServer.entityTracking.items[itemIDs[i]]) {
                this.clearItem(client, parseInt(itemIDs[i]));
            }
        }
    };
    TerrariaServerPacketHandler.prototype.clearItem = function (client, itemIndex) {
        var updateItemDrop = (new utils_1.PacketFactory())
            .setType(packettypes_1["default"].UpdateItemDrop)
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
    };
    TerrariaServerPacketHandler.prototype.resetInventory = function (client) {
        var slotIDs = _.keys(this.currentServer.client.inventory);
        for (var i = 0, len = slotIDs.length; i < len; i++) {
            if (this.currentServer.client.player.inventory[slotIDs[i]]) {
                this.setItem(client, this.currentServer.client.player.inventory[slotIDs[i]]);
            }
        }
    };
    TerrariaServerPacketHandler.prototype.setItem = function (client, item) {
        var playerInventorySlot = (new utils_1.PacketFactory())
            .setType(packettypes_1["default"].PlayerInventorySlot)
            .packByte(client.player.id)
            .packByte(item.slot)
            .packInt16(item.stack)
            .packByte(item.prefix)
            .packInt16(item.netID)
            .data();
        client.socket.write(new Buffer(playerInventorySlot, 'hex'));
    };
    return TerrariaServerPacketHandler;
}());
;
exports.__esModule = true;
exports["default"] = TerrariaServerPacketHandler;
