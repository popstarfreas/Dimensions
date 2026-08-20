import ClearUtils from '../../dimensions/clearutils.js';
import Client from '../../dimensions/client.js';
import NPC from '../../dimensions/npc.js';
import PacketTypes from '../../dimensions/packettypes.js';
import TerrariaServer from '../../dimensions/terrariaserver.js';
import TerrariaServerPacketHandler, { PacketSource } from '../../dimensions/terrariaserverpackethandler.js';
import { ItemDropUpdatePacket, NpcUpdatePacket, Parser } from 'terraria-packet';

describe("ClearUtils", () => {
    function unwrapBuffer(result: { TAG: "Ok"; _0: Buffer } | { TAG: "Error"; _0: unknown }): Buffer {
        if (result.TAG === "Error") {
            throw new Error(`Error creating packet: ${String(result._0)}`);
        }

        return result._0;
    }

    function makeClient(): { client: Client; server: TerrariaServer; handler: TerrariaServerPacketHandler } {
        const handler = new TerrariaServerPacketHandler();
        const client = {
            globalHandlers: { extensions: {} },
            options: { log: { extensionError: false } },
            logging: {
                debug: jasmine.createSpy("debug"),
                error: jasmine.createSpy("error")
            },
            sendDirect: jasmine.createSpy("sendDirect")
        } as unknown as Client;
        const server = {
            client,
            entityTracking: {
                items: [],
                NPCs: [],
                players: [],
                pylons: []
            },
            getPacketHandler: () => handler
        } as unknown as TerrariaServer;
        client.server = server;

        return { client, server, handler };
    }

    it("preserves an NPC generation when clearing its reused slot", () => {
        const { client, server } = makeClient();
        server.entityTracking.NPCs[7] = new NPC(7, 1, 100, 23);

        ClearUtils.clearNPC(client, 7);

        expect(client.sendDirect).toHaveBeenCalledTimes(1);
        const packet = (client.sendDirect as jasmine.Spy).calls.mostRecent().args[0] as Buffer;
        const parsed = NpcUpdatePacket.parse(packet);
        if (parsed.TAG === "Error") {
            throw new Error(`Error parsing NPC update packet: ${String(parsed._0)}`);
        }
        expect(parsed._0.npcSlotId).toBe(7);
        expect(parsed._0.generation).toBe(23);
        expect(server.entityTracking.NPCs[7]).toBeUndefined();
    });

    it("tracks item slot zero and clears it with ItemDropClear", () => {
        const { client, server, handler } = makeClient();
        const update = unwrapBuffer(ItemDropUpdatePacket.toBuffer({
            itemDropId: 0,
            position: { x: 1, y: 2 },
            velocity: { x: 0, y: 0 },
            stack: 1,
            prefix: 0,
            ownership: "None",
            itemId: 1,
            shimmer: undefined,
            enemyGrabDelayTime: undefined
        }));

        handler.handlePacket(server, {
            packetType: PacketTypes.UpdateItemDrop,
            data: update
        }, PacketSource.TerrariaServer);
        expect(server.entityTracking.items[0]?.netID).toBe(1);

        ClearUtils.clearItem(client, 0);

        expect(server.entityTracking.items[0]).toBeUndefined();
        expect(client.sendDirect).toHaveBeenCalledTimes(1);
        const packet = (client.sendDirect as jasmine.Spy).calls.mostRecent().args[0] as Buffer;
        const parsed = Parser.parse(packet, true);
        if (parsed.TAG === "Error") {
            throw new Error(`Error parsing item clear packet: ${String(parsed._0)}`);
        }
        expect(parsed._0.TAG).toBe("ItemDropClear");
    });
});
