import PacketTypes from 'packettypes';
import {ReadPacketFactory, PacketFactory} from 'utils';
import * as Net from 'net';
import TerrariaServer from 'terrariaserver';
import Packet from 'packet';
import Client from 'client';

class PriorHandlers {
    static newVersionClients = {};
    static server(server: TerrariaServer, packet: Packet): boolean {
        let handled = false;
		switch (packet.packetType) {
			case 7:
                handled = this.handleWorldInfo(server, packet);
                break;
		}
        return handled;
    }

    static handleWorldInfo(server: TerrariaServer, packet: Packet): boolean {
        let handled = false;

        if (!this.newVersionClients[server.client.ID]) {
            return false;
        }

        let reader = new ReadPacketFactory(packet.data);
        let time = reader.readInt32(); // Time
        let daynmoon = reader.readByte(); // Day&MoonInfo
        let moonPhase = reader.readByte(); // Moon Phase
        let maxTilesX = reader.readInt16(); // MaxTilesX
        let maxTilesY = reader.readInt16(); // MaxTilesY
        let spawn = {
            x: reader.readInt16(),
            y: reader.readInt16()
        };
        let worldSurface = reader.readInt16(); // WorldSurface
        let rockLayer = reader.readInt16(); // RockLayer
        let worldID = reader.readInt32(); // WorldID
        let worldName = reader.readString(); // World Name
        let moonType = reader.readByte(); // Moon Type
        let treeBackground = reader.readByte(); // Tree Background
        let corruptionBackground = reader.readByte(); // Corruption Background
        let jungleBackground = reader.readByte(); // Jungle Background
        let snowBackground = reader.readByte(); // Snow Background
        let hallowBackground = reader.readByte(); // Hallow Background
        let crimsonBackground = reader.readByte(); // Crimson Background
        let desertBackground = reader.readByte(); // Desert Background
        let oceanBackground = reader.readByte(); // Ocean Background
        let iceBackStyle = reader.readByte(); // Ice Back Style
        let jungleBackStyle = reader.readByte(); // Jungle Back Style
        let hellBackStyle = reader.readByte(); // Hell Back Style
        let windSpeedSet = reader.readSingle(); // Wind Speed Set
        let cloudNumber = reader.readByte(); // Cloud Number
        let treeOne = reader.readInt32(); // Tree 1
        let treeTwo = reader.readInt32(); // Tree 2
        let treeThree = reader.readInt32(); // Tree 3
        let treeStyleOne = reader.readByte(); // Tree Style 1
        let treeStyleTwo = reader.readByte(); // Tree Style 2
        let treeStyleThree = reader.readByte(); // Tree Style 3
        let treeStyleFour = reader.readByte(); // Tree Style 4
        let caveBackOne = reader.readInt32(); // Cave Back 1
        let caveBackTwo = reader.readInt32(); // Cave Back 2
        let caveBackThree = reader.readInt32(); // Cave Back 3
        let caveBackStyleOne = reader.readByte(); // Cave Back Style 1
        let caveBackStyleTwo = reader.readByte(); // Cave Back Style 2
        let caveBackStyleThree = reader.readByte(); // Cave Back Style 3
        let caveBackStyleFour = reader.readByte(); // Cave Back Style 4
        let rain = reader.readSingle(); // Rain
        let eventInfo = reader.readByte();
        let eventInfoTwo = reader.readByte();
        let eventInfoThree = reader.readByte();
        let eventInfoFour = reader.readByte();
        let invasionType = reader.readByte();
        let lobbyID_part1 = reader.readInt32();
        let lobbyID_part2 = reader.readInt32();
        let eventInfoSSC = eventInfo;
        let eventInfoNonSSC = eventInfo;

        let worldInfoPrimary = (new PacketFactory())
            .setType(PacketTypes.WorldInfo)
            .packInt32(time)
            .packByte(daynmoon)
            .packByte(moonPhase)
            .packInt16(maxTilesX)
            .packInt16(maxTilesY)
            .packInt16(spawn.x)
            .packInt16(spawn.y)
            .packInt16(worldSurface)
            .packInt16(rockLayer)
            .packInt32(worldID)
            .packString(worldName)
            .packString("c7e2e900-0e2a-45ec-81b2-5da61f2249f3")
            .packByte(moonType)
            .packByte(treeBackground)
            .packByte(corruptionBackground)
            .packByte(jungleBackground)
            .packByte(snowBackground)
            .packByte(hallowBackground)
            .packByte(crimsonBackground)
            .packByte(desertBackground)
            .packByte(oceanBackground)
            .packByte(iceBackStyle)
            .packByte(jungleBackStyle)
            .packByte(hellBackStyle)
            .packSingle(windSpeedSet)
            .packByte(cloudNumber)
            .packInt32(treeOne)
            .packInt32(treeTwo)
            .packInt32(treeThree)
            .packByte(treeStyleOne)
            .packByte(treeStyleTwo)
            .packByte(treeStyleThree)
            .packByte(treeStyleFour)
            .packInt32(caveBackOne)
            .packInt32(caveBackTwo)
            .packInt32(caveBackThree)
            .packByte(caveBackStyleOne)
            .packByte(caveBackStyleTwo)
            .packByte(caveBackStyleThree)
            .packByte(caveBackStyleFour)
            .packSingle(rain)
            .packByte(eventInfoSSC)
            .packByte(eventInfoTwo)
            .packByte(eventInfoThree)
            .packByte(eventInfoFour)
            .packByte(invasionType)
            .packInt32(lobbyID_part1)
            .packInt32(lobbyID_part2)
            .data();

        server.client.socket.write(new Buffer(worldInfoPrimary, 'hex'));
        return true;
    }
	
    static client(client: Client, packet: Packet): boolean {
        let handled = false;
        switch (packet.packetType) {
            case PacketTypes.ConnectRequest:
                handled = this.handleConnect(client, packet);
                break;
        }

        return handled;
    }

    static handleConnect(client: Client, packet: Packet): boolean {
        let reader = new ReadPacketFactory(packet.data);
        if (reader.readString() == "Terraria188") {
            this.newVersionClients[client.ID] = true;
        } else {
            this.newVersionClients[client.ID] = false;
        }
        return false;
    }
}

class PostHandlers {
}

export default class Patch {
    name: string;
    version: string;
    author: string;
    reloadable: boolean;
    priorPacketHandlers: PriorHandlers;
    postPacketHandlers: PostHandlers;

    constructor() {
        this.name = "1.3.4.4 Patch";
        this.version = "v0.2";
        this.author = "popstarfreas";
        this.reloadable = false;
        this.priorPacketHandlers = PriorHandlers;
        this.postPacketHandlers = PostHandlers;
    }
}