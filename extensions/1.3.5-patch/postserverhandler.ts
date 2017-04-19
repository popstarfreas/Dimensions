import TerrariaServerPacketHandler from 'dimensions/extension/terrariaserverpackethandler';
import TerrariaServer from 'dimensions/terrariaserver';
import Packet from 'dimensions/packet';
import Translator from './';
import Utils from './utils';
import PacketReader from 'dimensions/packets/packetreader';
import PacketWriter from 'dimensions/packets/packetwriter';
import PacketTypes from 'dimensions/packettypes';
import HexWriter from 'dimensions/packets/hexwriter';
import HexReader from 'dimensions/packets/hexreader';
import NetworkText from 'dimensions/packets/networktext';
import BitsByte from './bitsbyte';
import * as zlib from 'zlib';

class PostServerHandler extends TerrariaServerPacketHandler {
    protected _translator: Translator;

    constructor(translator: Translator) {
        super();
        this._translator = translator;
    }

    public handlePacket(server: TerrariaServer, packet: Packet): boolean {
        let handled = false;
        handled = this.handleIncompatiblePacket(server, packet);

        return handled;
    }

    protected handleIncompatiblePacket(server: TerrariaServer, packet: Packet): boolean {
        let handled = false;
        switch (packet.packetType) {
            case PacketTypes.Disconnect:
                handled = this.handleDisconnect(server, packet);
                break;
            case PacketTypes.WorldInfo:
                handled = this.handleWorldInfo(server, packet);
                break;
            case PacketTypes.SmartChatMessage:
                handled = this.handleSmartChatMessage(server, packet);
                break;
            case PacketTypes.Status:
                handled = this.handleStatusText(server, packet);
                break;
            case PacketTypes.CreateCombatText:
                handled = this.handleCreateCombatText(server, packet);
                break;
        }

        return handled;
    }

    protected handleDisconnect(server: TerrariaServer, packet: Packet): boolean {
        let reader = new PacketReader(packet.data);
        let message = reader.readString();

        let disconnect = new PacketWriter()
            .setType(PacketTypes.Disconnect);

        let text = new NetworkText(message, 0).Serialize(disconnect);

        packet.data = disconnect.data;
        return false;
    }

    protected handleWorldInfo(server: TerrariaServer, packet: Packet): boolean {
        let reader = new PacketReader(packet.data);
        let time = reader.readInt32();
        let dayAndMoonInfo = reader.readByte();
        let moonPhase = reader.readByte();
        let maxTilesX = reader.readInt16();
        let maxTilesY = reader.readInt16();
        let spawnTileX = reader.readInt16();
        let spawnTileY = reader.readInt16();
        let worldSurface = reader.readInt16();
        let rockLayer = reader.readInt16();
        let worldId = reader.readInt32();
        let worldName = reader.readString();
        let worldUUID = reader.readString().replace(/-/g, '');
        let moonType = reader.readByte();
        let treeBg = reader.readByte();
        let corruptBg = reader.readByte();
        let jungleBg = reader.readByte();
        let snowBg = reader.readByte();
        let hallowBg = reader.readByte();
        let crimsonBg = reader.readByte();
        let desertBg = reader.readByte();
        let oceanBg = reader.readByte();
        let iceBackStyle = reader.readByte();
        let jungleBackStyle = reader.readByte();
        let hellBackStyle = reader.readByte();
        let windSpeed = reader.readSingle();
        let numClouds = reader.readByte();
        let tree1 = reader.readInt32();
        let tree2 = reader.readInt32();
        let tree3 = reader.readInt32();
        let treeStyle1 = reader.readByte();
        let treeStyle2 = reader.readByte();
        let treeStyle3 = reader.readByte();
        let treeStyle4 = reader.readByte();
        let caveBack1 = reader.readInt32();
        let caveBack2 = reader.readInt32();
        let caveBack3 = reader.readInt32();
        let caveBackStyle1 = reader.readByte();
        let caveBackStyle2 = reader.readByte();
        let caveBackStyle3 = reader.readByte();
        let caveBackStyle4 = reader.readByte();
        let rain = reader.readSingle();
        let eventInfo1 = reader.readByte();
        let eventInfo2 = reader.readByte();
        let eventInfo3 = reader.readByte();
        let eventInfo4 = reader.readByte();
        let eventInfo5 = reader.readByte();

        let worldInfo = new PacketWriter()
            .setType(PacketTypes.WorldInfo)
            .packInt32(time)
            .packByte(dayAndMoonInfo)
            .packByte(moonPhase)
            .packInt16(maxTilesX)
            .packInt16(maxTilesY)
            .packInt16(spawnTileX)
            .packInt16(spawnTileY)
            .packInt16(worldSurface)
            .packInt16(rockLayer)
            .packInt32(worldId)
            .packString(worldName)
            .packHex(worldUUID)
            .packUInt64(0) // Fake generator id
            .packByte(moonType)
            .packByte(treeBg)
            .packByte(corruptBg)
            .packByte(jungleBg)
            .packByte(snowBg)
            .packByte(hallowBg)
            .packByte(crimsonBg)
            .packByte(desertBg)
            .packByte(oceanBg)
            .packByte(iceBackStyle)
            .packByte(jungleBackStyle)
            .packByte(hellBackStyle)
            .packSingle(windSpeed)
            .packByte(numClouds)
            .packInt32(tree1)
            .packInt32(tree2)
            .packInt32(tree3)
            .packByte(treeStyle1)
            .packByte(treeStyle2)
            .packByte(treeStyle3)
            .packByte(treeStyle4)
            .packInt32(caveBack1)
            .packInt32(caveBack2)
            .packInt32(caveBack3)
            .packByte(caveBackStyle1)
            .packByte(caveBackStyle2)
            .packByte(caveBackStyle3)
            .packByte(caveBackStyle4)
            .packSingle(rain)
            .packByte(eventInfo1)
            .packByte(eventInfo2)
            .packByte(eventInfo3)
            .packByte(eventInfo4)
            .packByte(eventInfo5)
            .data;

        packet.data = worldInfo;
        return false;
    }

    protected handleSmartChatMessage(server: TerrariaServer, packet: Packet): boolean {
        let reader = new PacketReader(packet.data);
        let playerId = reader.readByte();
        let messageColor = reader.readColor();
        let message = reader.readString();
        let messageLength = reader.readInt16();

        let chatMessage = new PacketWriter()
            .setType(PacketTypes.LoadNetModule)
            .packUInt16(1)
            .packByte(playerId)

        let text = new NetworkText(message, 0);
        text.Serialize(chatMessage);
        chatMessage.packColor(messageColor)

        packet.data = chatMessage.data;
        return false;
    }

    protected handleStatusText(server: TerrariaServer, packet: Packet): boolean {
        let reader = new PacketReader(packet.data);
        let max = reader.readInt32();
        let text = reader.readString();

        let statusText = new PacketWriter()
            .setType(PacketTypes.Status)
            .packInt32(max);

        let netText = new NetworkText(text, 0).Serialize(statusText);

        packet.data = statusText.data;
        return false;
    }

    protected handleCreateCombatText(server: TerrariaServer, packet: Packet): boolean {
        let reader = new PacketReader(packet.data);
        let x = reader.readSingle();
        let y = reader.readSingle();
        let color = reader.readColor();
        let text = reader.readString();
        let num = <any>parseInt(text) == text ? parseInt(text) : 0;

        let combatText = new PacketWriter()
            .setType(PacketTypes.CreateCombatText)
            .packSingle(x)
            .packSingle(y)
            .packColor(color)
            .packInt32(num)
            .data;

        packet.data = combatText;
        return false;
    }
}

export default PostServerHandler;