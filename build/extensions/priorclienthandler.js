"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clientpackethandler_1 = require("dimensions/extension/clientpackethandler");
const packettypes_1 = require("dimensions/packettypes");
const packetwriter_1 = require("dimensions/packets/packetwriter");
const packetreader_1 = require("dimensions/packets/packetreader");
class PriorClientHandler extends clientpackethandler_1.default {
    constructor(translator) {
        super();
        this._translator = translator;
    }
    handlePacket(client, packet) {
        let handled = false;
        handled = this.handleIncompatiblePacket(client, packet);
        return handled;
    }
    handleIncompatiblePacket(client, packet) {
        let handled = false;
        if (!this._translator.clients.has(client) && packet.packetType !== packettypes_1.default.ConnectRequest) {
            return false;
        }
        switch (packet.packetType) {
            case packettypes_1.default.ConnectRequest:
                handled = this.handleConnectRequest(client, packet);
                break;
            case packettypes_1.default.ChatMessage:
                handled = this.handleChatMessage(client, packet);
                break;
            case packettypes_1.default.PlayerDamage:
                break;
            case packettypes_1.default.KillMe:
                break;
            case packettypes_1.default.AddPlayerBuff:
                break;
        }
        return handled;
    }
    handleConnectRequest(client, packet) {
        let reader = new packetreader_1.default(packet.data);
        let version = reader.readString();
        console.log("Version: "+version);
        // Mobile Version
        if (version === "Terraria155" || version === "Terraria156") {
            this._translator.clients.add(client);
            packet.data = new packetwriter_1.default()
                .setType(packettypes_1.default.ConnectRequest)
                .packString("Terraria194")
                .data;
            return false;
        }
        return false;
    }
    handleChatMessage(client, packet) {
        let reader = new packetreader_1.default(packet.data);
        reader.readByte();
        reader.readByte();
        reader.readByte();
        reader.readByte();
        let message = reader.readString();
        console.log(message);
        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.LoadNetModule)
            .packUInt16(1)
            .packString("Say")
            .packString(message)
            .data;
        return false;
    }
}
exports.default = PriorClientHandler;
