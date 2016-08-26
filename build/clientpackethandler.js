"use strict";
var packettypes_1 = require('./packettypes');
var utils_1 = require('./utils');
var item_1 = require('./item');
var ClientPacketHandler = (function () {
    function ClientPacketHandler() {
    }
    ClientPacketHandler.prototype.handlePacket = function (client, packet) {
        var packetType = packet.packetType;
        var handled = false;
        // Set current client while we handle this packet
        this.currentClient = client;
        switch (packetType) {
            case packettypes_1["default"].PlayerInfo:
                handled = this.handlePlayerInfo(packet);
                break;
            case packettypes_1["default"].UpdatePlayerBuff:
                handled = this.handleUpdatePlayerBuff(packet);
                break;
            case packettypes_1["default"].AddPlayerBuff:
                handled = this.handleAddPlayerBuff(packet);
                break;
            case packettypes_1["default"].PlayerInventorySlot:
                handled = this.handlePlayerInventorySlot(packet);
                break;
            // Either will be sent, but not both
            case packettypes_1["default"].ContinueConnecting2:
            case packettypes_1["default"].Status:
                if (this.currentClient.state === 0) {
                    // Finished sending inventory
                    this.currentClient.state = 1;
                }
                break;
            case packettypes_1["default"].UpdateItemOwner:
                // Prevent this being sent unless state is 1
                // this prevents issues with joining while items
                // are next to the player on the past server
                if (this.currentClient.state !== 1) {
                    handled = true;
                }
                break;
            case packettypes_1["default"].ChatMessage:
                handled = this.handleChatMessage(packet);
                break;
            case packettypes_1["default"].DimensionsUpdate:
                // Client cannot send 67 (It's used by Dimensions to communicate special info)
                handled = true;
                break;
            case packettypes_1["default"].ClientUUID:
                handled = this.handleClientUUID(packet);
                break;
            case packettypes_1["default"].NPCStrike:
                handled = this.handleNPCStrike(packet);
                break;
        }
        return !handled ? packet.data : "";
    };
    ClientPacketHandler.prototype.handlePlayerInfo = function (packet) {
        var nameLength = parseInt(packet.data.substr(12, 2), 16);
        if (this.currentClient.name === null) {
            // Take the appropriate hex chars out of the packet
            // then convert them to ascii
            var name_1 = utils_1.hex2a(packet.data.substr(14, nameLength * 2));
            this.currentClient.setName(name_1);
        }
        return false;
    };
    ClientPacketHandler.prototype.handleUpdatePlayerBuff = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        var playerID = reader.readByte();
        if (!this.currentClient.options.blockInvis) {
            var updatePlayerBuff = (new utils_1.PacketFactory())
                .setType(packettypes_1["default"].UpdatePlayerBuff)
                .packByte(playerID);
            for (var i = 0; i < 22; i++) {
                if (reader.packetData.length !== 0) {
                    var buffType = reader.readByte();
                    if (buffType !== 10) {
                        updatePlayerBuff.packByte(buffType);
                    }
                    else {
                        updatePlayerBuff.packByte(0);
                    }
                }
            }
            this.currentClient.server.socket.write(new Buffer(updatePlayerBuff.data(), 'hex'));
            return true;
        }
        else {
            return false;
        }
    };
    ClientPacketHandler.prototype.handleAddPlayerBuff = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        var playerID = reader.readByte();
        var buffID = reader.readByte();
        if (this.currentClient.options.blockInvis) {
            return buffID === 10;
        }
        else {
            return false;
        }
    };
    ClientPacketHandler.prototype.handlePlayerInventorySlot = function (packet) {
        if ((this.currentClient.state === 0 || this.currentClient.state === 2) && !this.currentClient.waitingInventoryReset) {
            var reader = new utils_1.ReadPacketFactory(packet.data);
            var playerID = reader.readByte();
            var slotID = reader.readByte();
            var stack = reader.readInt16();
            var prefix = reader.readByte();
            var netID = reader.readInt16();
            this.currentClient.player.inventory[slotID] = new item_1["default"](slotID, stack, prefix, netID);
        }
        return false;
    };
    ClientPacketHandler.prototype.handleChatMessage = function (packet) {
        var handled = false;
        var chatMessage = utils_1.hex2a(packet.data.substr(16));
        // If chat message is a command
        if (chatMessage.length > 1 && chatMessage.substr(0, 1) === "/") {
            var command = this.currentClient.globalHandlers.command.parseCommand(chatMessage);
            handled = this.currentClient.globalHandlers.command.handle(command.name.toLowerCase(), command.args, this.currentClient);
        }
        return handled;
    };
    ClientPacketHandler.prototype.handleClientUUID = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        this.currentClient.clientUUID = reader.readString();
        return false;
    };
    ClientPacketHandler.prototype.handleNPCStrike = function (packet) {
        var reader = new utils_1.ReadPacketFactory(packet.data);
        var NPCID = reader.readInt16();
        var damage = reader.readInt16();
        if (this.currentClient.server.entityTracking.NPCs[NPCID]) {
            if (damage > 0) {
                this.currentClient.server.entityTracking.NPCs[NPCID].life -= damage;
                if (this.currentClient.server.entityTracking.NPCs[NPCID].life <= 0) {
                    this.currentClient.server.entityTracking.NPCs[NPCID] = false;
                }
            }
            else {
                this.currentClient.server.entityTracking.NPCs[NPCID] = false;
            }
        }
        return false;
    };
    return ClientPacketHandler;
}());
exports.__esModule = true;
exports["default"] = ClientPacketHandler;
