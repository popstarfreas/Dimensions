import { Parser } from 'terraria-packet';
import * as Net from 'net';
import Client from '../../dimensions/client.js';
import ClientState from '../../dimensions/clientstate.js';
import PacketTypes from '../../dimensions/packettypes.js';
import TerrariaServer from '../../dimensions/terrariaserver.js';
import TerrariaServerPacketHandler, { PacketSource } from '../../dimensions/terrariaserverpackethandler.js';

describe("TerrariaServerPacketHandler", () => {
    it("forwards tiles before a synthetic switch spawn when both backend packets share a read", () => {
        const sentToClient: Buffer[] = [];
        const handler = new TerrariaServerPacketHandler();
        const client = {
            globalHandlers: { extensions: {}, terrariaServerPacketHandler: handler },
            logging: { error: jasmine.createSpy("error"), debug: jasmine.createSpy("debug") },
            options: { log: { tServerError: true } },
            socket: { destroyed: false, writable: true },
            player: { id: 1 },
            state: ClientState.FinalisingSwitch,
            preventSpawnOnJoin: false,
            sendDirect: (packet: Buffer) => sentToClient.push(packet),
            sendWaitingPackets: jasmine.createSpy("sendWaitingPackets"),
            sendExtraInformation: jasmine.createSpy("sendExtraInformation"),
        } as unknown as Client;
        const server = new TerrariaServer(new Net.Socket(), client);
        server.spawn = { x: 4227, y: 1275 };
        spyOn(server, "sendDirect");

        // TileSectionSend is intentionally opaque to the proxy's packet parser.
        const section = Buffer.from([3, 0, PacketTypes.SendSection]);
        const completion = Buffer.from([3, 0, PacketTypes.CompleteConnectionAndSpawn]);
        server.handleData(Buffer.concat([section, completion]));

        const sentTypes = sentToClient.map(packet => packet[2]);
        expect(sentTypes.indexOf(PacketTypes.SendSection)).toBeLessThan(sentTypes.indexOf(PacketTypes.SpawnPlayer));
        expect(sentTypes.indexOf(PacketTypes.SpawnPlayer)).toBeLessThan(sentTypes.indexOf(PacketTypes.CompleteConnectionAndSpawn));
        expect(client.logging.error).not.toHaveBeenCalled();
    });

    it("preserves Terraria 1.4.5.8 dungeon coordinates while advancing a dimension switch", () => {
        // WorldInfo fixture from terraria-packet's 1.4.5.8 protocol tests:
        // two extra spawn points followed by signed Int16 dungeon X/Y.
        const data = Buffer.from(
            "b40007483f00000000d0206009b7100e037c0782072a09214a054c6f6262790221123b408994804ab40674ee13ee1d0501000000160100000504090708000305020402050201030002cdcc4c3f411c08000050120000491b000004010403d90a0000de0b0000ed1900000207000500040403000404020402040001000000000e2d9841023d60f404000006000700a700a800a900ffffffffffff000000000000000000ae9d273e02ffffff7f007d00803412c7cf",
            "hex"
        );
        const parsed = Parser.parse(data, true);
        if (parsed.TAG === "Error" || parsed._0.TAG !== "WorldInfo") {
            throw new Error("Expected Terraria 1.4.5.8 WorldInfo");
        }
        expect(parsed._0._0.dungeonX).toBe(4660);
        expect(parsed._0._0.dungeonY).toBe(-12345);

        const client = {
            globalHandlers: { extensions: {} },
            logging: { error: jasmine.createSpy("error") },
            waitingCharacterRestore: false,
            state: ClientState.ConnectionSwitchEstablished,
            routingInformation: null
        } as unknown as Client;
        const server = {
            client,
            isSSC: !parsed._0._0.eventInfo.serverSidedCharacters,
            spawn: { x: 0, y: 0 },
            sendDirect: jasmine.createSpy("sendDirect")
        } as unknown as TerrariaServer;

        const forwarded = new TerrariaServerPacketHandler().handlePacket(server, {
            packetType: PacketTypes.WorldInfo,
            data
        }, PacketSource.TerrariaServer);

        expect(forwarded).toEqual(data);
        expect(server.isSSC).toBe(parsed._0._0.eventInfo.serverSidedCharacters);
        expect(server.spawn).toEqual({ x: parsed._0._0.spawnX, y: parsed._0._0.spawnY });
        expect(client.state).toBe(ClientState.FinalisingSwitch);
        expect(server.sendDirect).toHaveBeenCalledTimes(1);
        const sectionRequest = Parser.parse((server.sendDirect as jasmine.Spy).calls.mostRecent().args[0], false);
        if (sectionRequest.TAG === "Error") {
            throw new Error("Expected a valid initial tile section request");
        }
        expect(sectionRequest._0.TAG).toBe("InitialTileSectionsRequest");
        expect(client.logging.error).not.toHaveBeenCalled();
    });
});
