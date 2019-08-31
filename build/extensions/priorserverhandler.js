"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const terrariaserverpackethandler_1 = require("dimensions/extension/terrariaserverpackethandler");
const packetreader_1 = require("dimensions/packets/packetreader");
const bufferreader_1 = require("dimensions/packets/bufferreader");
const packetwriter_1 = require("dimensions/packets/packetwriter");
const packettypes_1 = require("dimensions/packettypes");
const clientstate_1 = require("dimensions/clientstate");
const bitsbyte = require("dimensions/datatypes/bitsbyte");
const playerDeathReason = require("dimensions/datatypes/playerdeathreason");
const TileFrameImportant = require("./tileframeimportant");
const zlib = require("zlib");
class PriorServerHandler extends terrariaserverpackethandler_1.default {
    constructor(translator) {
        super();
        this._translator = translator;
    }
    handlePacket(server, packet) {
        if (!this._translator.clients.has(server.client)) {
            return false;
        }
        let handled = false;
        switch (packet.packetType) {
            case packettypes_1.default.Disconnect:
                this.handleDisconnect(server, packet);
                break;
            case packettypes_1.default.WorldInfo:
                this.handleWorldInfo(server, packet);
                break;
            case packettypes_1.default.Status:
                this.handleStatus(server, packet);
                break;
            case packettypes_1.default.LoadNetModule:
                this.handleLoadNetModule(server, packet);
                break;
            case packettypes_1.default.SendSection:
                this.handleSendSection(server, packet);
                break;
            case packettypes_1.default.SectionTileFrame:
                this.handleSectionTileFrame(server, packet);
                break;

            // TODO
            case packettypes_1.default.NPCUpdate:
                this.handleNpcUpdate(server, packet);
                break;
            case packettypes_1.default.PlayerHurtV2:
                this.handlePlayerHurt(server, packet);
                break;
            case packettypes_1.default.PlayerDeathV2:
                this.handlePlayerDeath(server, packet);
                break;
            case packettypes_1.default.SmartChatMessage:
                this.handleSmartChatMessage(server, packet);
                break;
            case packettypes_1.default.AddPlayerBuff:
                this.handleAddPlayerBuff(server, packet);
                break;
            case packettypes_1.default.CreateCombatTextString:
                this.handleCreateCombatTextString(server, packet);
                break;
            /*case packettypes_1.default.UpdateGoodOrEvil:
                packet.data = Buffer.allocUnsafe(0);
                break;
            case packettypes_1.default.UpdateShieldStrengths:
                packet.data = Buffer.allocUnsafe(0);
                break;*/
        }
        return handled;
    }
    handleDisconnect(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const netText = reader.readNetworkText();
        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.Disconnect)
            .packString(netText.text)
            .data;
        return false;
    }
    handleWorldInfo(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const time = reader.readInt32();
        const dayMoon = reader.readByte();
        const moonPhase = reader.readByte();
        const maxTilesX = reader.readInt16();
        const maxTilesY = reader.readInt16();
        const spawnX = reader.readInt16();
        const spawnY = reader.readInt16();
        const worldSurface = reader.readInt16();
        const rockLayer = reader.readInt16();
        const worldId = reader.readInt32();
        const worldName = reader.readString();
        const worldUId = reader.readBytes(16);
        const worldGenVer = reader.readUInt64();
        const moonType = reader.readByte();
        const treeBg = reader.readByte();
        const corruptBg = reader.readByte();
        const jungleBg = reader.readByte();
        const snowBg = reader.readByte();
        const hallowBg = reader.readByte();
        const crimsonBg = reader.readByte();
        const desertBg = reader.readByte();
        const oceanBg = reader.readByte();
        const iceBackStyle = reader.readByte();
        const jungleBackStyle = reader.readByte();
        const hellBackStyle = reader.readByte();
        const windSpeed = reader.readSingle();
        const cloudNum = reader.readByte();
        const tree1 = reader.readInt32();
        const tree2 = reader.readInt32();
        const tree3 = reader.readInt32();
        const treeStyle1 = reader.readByte();
        const treeStyle2 = reader.readByte();
        const treeStyle3 = reader.readByte();
        const treeStyle4 = reader.readByte();
        const caveBack1 = reader.readInt32();
        const caveBack2 = reader.readInt32();
        const caveBack3 = reader.readInt32();
        const caveBackStyle1 = reader.readByte();
        const caveBackStyle2 = reader.readByte();
        const caveBackStyle3 = reader.readByte();
        const caveBackStyle4 = reader.readByte();
        const rain = reader.readSingle();
        const eventInfo = reader.readByte();
        const eventInfo2 = reader.readByte();
        const eventInfo3 = reader.readByte();
        const eventInfo4 = reader.readByte();
        const eventInfo5 = reader.readByte();
        const invasionType = reader.readSByte();
        const lobbyId = reader.readUInt64();
        const sandstormSeverity = reader.readSingle();
        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.WorldInfo)
            .packInt32(time) // 23902 vs 27000
            .packByte(dayMoon) // 0 vs 1
            .packByte(moonPhase) // 0 vs 0
            .packInt16(maxTilesX) // 4200 vs 8400
            .packInt16(maxTilesY) // 1200 vs 2400
            .packInt16(spawnX) // 2096 vs 4227
            .packInt16(spawnY) // 246 vs 1275
            .packInt16(worldSurface) // 366 vs 745
            .packInt16(rockLayer) // 480 vs 1 009
            .packInt32(worldId) // 17169071 vs 1
            .packString(worldName) // World 1 vs Dark Gaming - Lite
            .packByte(moonType) // 1 vs 147
            .packByte(treeBg) // 8 vs 134
            .packByte(corruptBg) // 0 vs 228
            .packByte(jungleBg) // 0 vs 29
            .packByte(snowBg) // 32 vs 125
            .packByte(hallowBg) // 0 vs 22
            .packByte(crimsonBg) // 0 vs 0
            .packByte(desertBg) // 0 vs 0
            .packByte(oceanBg) // 2 vs 0
            .packByte(iceBackStyle) // 2 vs 0
            .packByte(jungleBackStyle) // 1 vs 0
            .packByte(hellBackStyle) // 0 vs 0
            .packSingle(windSpeed) // 0.04220030456781387 vs 0
            .packByte(cloudNum) // 113 vs 0
            .packInt32(tree1) // 2736 vs 0
            .packInt32(tree2) // 4200 vs 0
            .packInt32(tree3) // 4200 vs 0
            .packByte(treeStyle1) // 3 vs 0
            .packByte(treeStyle2) // 4 vs 0
            .packByte(treeStyle3) // 0 vs 0
            .packByte(treeStyle4) // 0 vs 0
            .packInt32(caveBack1) // 2342 vs 0
            .packInt32(caveBack2) // 4200 vs 0
            .packInt32(caveBack3) // 4200 vs 0
            .packByte(caveBackStyle1) // 6 vs 0
            .packByte(caveBackStyle2) // 2 vs 0
            .packByte(caveBackStyle3) // 5 vs 0
            .packByte(caveBackStyle4) // 1 vs 0
            .packSingle(rain) // 0.5299999713897705 vs 0
            .packByte(eventInfo) // 0 vs 0
            .packByte(eventInfo2) // 48 vs 0
            .packByte(eventInfo3) // 0 vs 0
            .packByte(eventInfo4) // 0 vs 0
            .packByte(invasionType) // 0 vs 0
            .packUInt64(lobbyId) // 0 vs 0
            .data;

        // packet.data = new Buffer("6300075e5d000000006810b0043008f6006e01e001affa050107576f726c6420310108000020000000020201003ada2c3d71b00a00006810000068100000030400002609000068100000681000000602050114ae073f00300000000000000000000000", "hex"); // 
        return false;
    }
    handleStatus(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const statusMax = reader.readInt32(); 
        const netText = reader.readNetworkText(); 
        packet.data = new packetwriter_1.default() 
            .setType(packettypes_1.default.Status) 
            .packInt32(statusMax)
            .packString(netText.text)
            .data;
        return false;
    }
    handleLoadNetModule(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const moduleId = reader.readUInt16();
        if (moduleId === 1) {
            reader.readByte();
            const netText = reader.readNetworkText();
            const color = reader.readColor();
            packet.data = new packetwriter_1.default()
                .setType(packettypes_1.default.ChatMessage)
                .packByte(255)
                .packByte(color.R)
                .packByte(color.G)
                .packByte(color.B)
                .packString(netText.text)
                .data;
            if (server.client.state !== clientstate_1.default.FullyConnected) {
                packet.data = Buffer.allocUnsafe(0);
            }
        }

        return false;
    }
    fixSendSection(data) {
        var packetReader = new packetreader_1.default(data);
        const compressed = packetReader.readByte() !== 0;
        const tileData = zlib.inflateRawSync(packetReader.readBuffer(data.length - 4));
        const reader = new bufferreader_1.default(tileData);
        const tileX = reader.readInt32();
        const tileY = reader.readInt32();
        const width = reader.readInt16();
        const height = reader.readInt16();

        let copies = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (copies > 0) {
                    copies = copies - 1;
                    continue;
                }

                let extraFlags = 0;
                const tileFlags = reader.readByte();
                if (tileFlags & 1) {
                    const someFlags = reader.readByte();
                    if (someFlags & 1) {
                        extraFlags = reader.readByte();
                    }
                }

                if (tileFlags & 2) {
                    // tile.active(true)
                    let tileType = undefined;
                    if (tileFlags & 32) {
                        let part = reader.readByte();
                        tileType = (reader.readByte() << 8) | part;
                    } else {
                        tileType = reader.readByte();
                    }

                    if (tileType > 418) {
                        console.log(`Correcting incompatible tile type ${tileType}`);
                        let newType = 1;
                        if (TileFrameImportant[tileType]) {
                            newType = 72; // Needed so client reads tileframeimportant bytes
                        }

                        if (tileFlags & 32) {
                            reader._data.writeUInt8(newType, reader.head - 2);
                            reader._data.writeUInt8(0, reader.head - 1);
                        } else {
                            reader._data.writeUInt8(newType, reader.head - 1);
                        }
                    }

                    if (TileFrameImportant[tileType]) {
                        reader.readInt16();
                        reader.readInt16();
                    }

                    if (extraFlags & 8) {
                        reader.readByte(); // color
                    }
                }

                if (tileFlags & 4) {
                const wallId = reader.readByte(); // wall id
                if (wallId > 224) {
                    console.log(`Correcting incompatible wall type ${tileType}`);
                    reader._data.writeUInt8(1, reader.head - 1);
                }

                if (extraFlags & 16) {
                    reader.readByte(); // wall color
                }
                }

                let num6 = ((tileFlags & 24) >> 3) & 255;
                if (num6 !== 0) {
                reader.readByte(); // tile liquid
                }

                switch ((tileFlags & 192) >> 6) {
                case 0:
                    copies = 0;
                    continue;
                case 1:
                    copies = reader.readByte();
                    continue;
                default:
                    copies = reader.readInt16();
                    continue;
                }
            }
        }

        return new packetwriter_1.default()
            .setType(packettypes_1.default.SendSection)
            .packByte(1)
            .packBuffer(zlib.deflateRawSync(reader._data))
            .data
    }

    handleSendSection(server, packet) {
        packet.data = this.fixSendSection(packet.data);
    }

    handleNpcUpdate(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const npcId = reader.readInt16();
        const position = {
            x: reader.readSingle(),
            y: reader.readSingle(),
        };
        const velocity = {
            x: reader.readSingle(),
            y: reader.readSingle(),
        };
        const target = reader.readUInt16(); // -> byte
        const flags = new bitsbyte(reader.readByte());
        const ai = [];
        for (let i = 0; i < 4; i++) {
            if (flags[i]) {
                ai[i] = reader.readSingle();
            }
        }
        const npcNetId = reader.readInt16();
        let life = undefined;
        let lifeBytes = undefined;
        if (!flags[7]) {
            lifeBytes = reader.readByte();
            switch(lifeBytes) {
                case 2:
                    life = reader.readInt16();
                    break;
                case 4:
                    life = reader.readInt32();
                    break;
                default:
                    life = reader.readSByte();
                    break;
            }
        }

        let release = undefined;
        if (reader.head < reader._data.length) {
            release = reader.readByte();
        }

        const newPacket = new packetwriter_1.default()
            .setType(packettypes_1.default.NPCUpdate)
            .packInt16(npcId)
            .packSingle(position.x)
            .packSingle(position.y)
            .packSingle(velocity.x)
            .packSingle(velocity.y)
            .packByte(target)
            .packByte(flags.value);

        for (let i = 0; i < 4; i++) {
            if (typeof ai[i] !== "undefined") {
                newPacket.packSingle(ai[i]);
            }
        }
        newPacket.packInt16(npcNetId);
        if (flags[7]) {
            switch (lifeBytes) {
                case 2:
                    newPacket.packInt16(life);
                    break;
                case 4:
                    newPacket.packInt32(life);
                    break;
                default:
                    newPacket.packSByte(life);
                    break;
            }
        }

        if (typeof release !== "undefined") {
            newPacket.packByte(release);
        }

        packet.data = newPacket.data;
    }

    handlePlayerHurt(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const playerId = reader.readByte();
        const deathReason = new playerDeathReason(reader);
        const damage = reader.readInt16();
        const hitDirection = reader.readByte();
        const flags = reader.readByte();
        const cooldownCounter = reader.readSByte();

        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.PlayerDamage)
            .packByte(playerId)
            .packByte(hitDirection)
            .packInt16(damage)
            .packString(deathReason._deathReason || "died.")
            .packByte(flags)
            .data;
    }

    handlePlayerDeath(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const playerId = reader.readByte();
        const deathReason = new playerDeathReason(reader);
        const damage = reader.readInt16();
        const hitDirection = reader.readByte();
        const flags = reader.readByte();

        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.KillMe)
            .packByte(playerId)
            .packByte(hitDirection)
            .packInt16(damage)
            .packByte(flags)
            .packString(deathReason._deathReason || "died.")
            .data;
    }

    handleSmartChatMessage(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const color = reader.readColor();
        const message = reader.readNetworkText();

        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.ChatMessage)
            .packByte(255)
            .packColor(color)
            .packString(message.text)
            .data;
    }

    handleAddPlayerBuff(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const playerId = reader.readByte();
        const buff = reader.readByte();
        const time = reader.readInt32();

        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.AddPlayerBuff)
            .packByte(playerId)
            .packByte(buff)
            .packInt16(time) // Maybe fix this cause int32 -> int16 might not work properly
            .data;
    }

    handleCreateCombatTextString(server, packet) {
        const reader = new packetreader_1.default(packet.data);
        const x = reader.readSingle();
        const y = reader.readSingle();
        const color = reader.readColor();
        const combatText = reader.readNetworkText();

        packet.data = new packetwriter_1.default()
            .setType(packettypes_1.default.CreateCombatText)
            .packSingle(x)
            .packSingle(y)
            .packColor(color)
            .packString(combatText.text)
            .data;
    }
}
exports.default = PriorServerHandler;
