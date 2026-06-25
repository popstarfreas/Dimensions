import ClientCommandHandler from '../../dimensions/clientcommandhandler.js';
import { v4 as uuidv4 } from 'uuid';
import TerrariaServer from '../../dimensions/terrariaserver.js';
import Client from '../../dimensions/client.js';
import ClientArgs from '../../dimensions/clientargs.js';
import * as Net from 'net';
import RoutingServer from '../../dimensions/routingserver.js';
import ClientPacketHandler from '../../dimensions/clientpackethandler.js';
import TerrariaServerPacketHandler from '../../dimensions/terrariaserverpackethandler.js';
import { ConfigOptions } from '../../dimensions/configloader.js';
import * as winston from 'winston';
import GlobalTracking from '../../dimensions/globaltracking.js';
import GlobalHandlers from '../../dimensions/globalhandlers.js';
import ServerDetails from '../../dimensions/serverdetails.js';
import { Dictionary } from '../../dimensions/dictionary.js';
import * as Language from '../../dimensions/language.js';
import PacketTypes from '../../dimensions/packettypes.js';
import { PacketSource } from '../../dimensions/terrariaserverpackethandler.js';
import RawPacket from '../../dimensions/packets/rawpacket.js';
import { DisconnectPacket, Parser, PlayerBuffsSetPacket, PlayerInventorySlotPacket } from 'terraria-packet';
import NetworkText from '@popstarfreas/packetfactory/networktext';
import { DisconnectReasonCodes } from '../../dimensions/disconnectreason.js';
import { getPacketsFromBuffer } from '../../dimensions/utils.js';
type DoneFn = (err?: unknown) => void;

describe("client", () => {
    let config: ConfigOptions;
    let serverA: RoutingServer;
    let serverB: RoutingServer;
    let socket: Net.Socket;
    let tcpServer: Net.Server;
    let serversDetails: Dictionary<ServerDetails>;
    let globalHandlers: GlobalHandlers;
    let servers: Dictionary<RoutingServer>;
    let globalTracking: GlobalTracking;
    let client: Client;
    // @ts-ignore
    let server: TerrariaServer;

    let clientSocket: Net.Socket;
    let clientSocketDataHandlers: ((data: string) => void)[];
    let id = uuidv4();
    const OBSERVED_CLIENT_PRE_CONNECT_JOIN_PACKET_COUNT = 358;
    const OBSERVED_BACKEND_PRE_READY_INVENTORY_PACKET_COUNT = 1750;
    const FULL_JOIN_INVENTORY_SLOT_RANGES: Array<[number, number]> = [
        [0, 59],
        [59, 20],
        [79, 10],
        [89, 5],
        [94, 5],
        [99, 40],
        [299, 40],
        [499, 1],
        [500, 40],
        [700, 40],
        [900, 20],
        [920, 10],
        [930, 20],
        [950, 10],
        [960, 20],
        [980, 10]
    ];

    function unwrapBuffer(result: { TAG: "Ok"; _0: Buffer } | { TAG: "Error"; _0: unknown }): Buffer {
        if (result.TAG === "Error") {
            throw new Error(`Error creating packet: ${String(result._0)}`);
        }

        return result._0;
    }

    function playerBuffsSetPacket(): Buffer {
        return unwrapBuffer(PlayerBuffsSetPacket.toBuffer({
            playerId: 0,
            buffs: Array(22).fill(0)
        }));
    }

    function playerInventorySlotPacket(slot = 0): Buffer {
        return unwrapBuffer(PlayerInventorySlotPacket.toBuffer({
            playerId: 0,
            slot,
            stack: 1,
            prefix: 0,
            itemType: 1,
            favorited: false,
            blocked: false
        }));
    }

    function rawPacketWithLength(packetType: PacketTypes, length: number): RawPacket {
        const data = Buffer.alloc(length);
        data.writeUInt16LE(length, 0);
        data.writeUInt8(packetType, 2);
        return { packetType, data };
    }

    function fullJoinInventorySlotIds(): number[] {
        return FULL_JOIN_INVENTORY_SLOT_RANGES.flatMap(([start, count]) => {
            return Array.from({ length: count }, (_value, index) => start + index);
        });
    }

    function observedClientPreConnectJoinBurst(): RawPacket[] {
        return [
            rawPacketWithLength(PacketTypes.ConnectRequest, 15),
            rawPacketWithLength(PacketTypes.PlayerInfo, 45),
            rawPacketWithLength(PacketTypes.ClientUUID, 40),
            rawPacketWithLength(PacketTypes.PlayerHP, 8),
            rawPacketWithLength(PacketTypes.PlayerMana, 8),
            rawPacketWithLength(PacketTypes.UpdatePlayerBuff, 6),
            rawPacketWithLength(PacketTypes.LoadoutSwitch, 7),
            ...fullJoinInventorySlotIds().map((slot) => ({
                packetType: PacketTypes.PlayerInventorySlot,
                data: playerInventorySlotPacket(slot)
            })),
            rawPacketWithLength(PacketTypes.ContinueConnecting2, 3)
        ];
    }

    function queuedPacketsWhileConnectingLength(): number {
        return (client as unknown as { queuedPacketsWhileConnecting: RawPacket[] }).queuedPacketsWhileConnecting.length;
    }

    beforeEach((done: DoneFn) => {
        config = {
            socketTimeout: 0,
            socketNoDelay: true,
            fakeVersion: {
                enabled: false,
                terrariaVersion: 0
            },
            blacklist: {
                enabled: false,
            },
            blockInvis: false,
            log: {
                clientBlocked: false,
                clientConnect: false,
                clientDisconnect: false,
                clientError: false,
                clientTimeouts: false,
                checkingClientConnect: false,
                checkingClientDisconnect: false,
                checkingClientError: false,
                checkingClientTimeouts: false,
                extensionLoad: false,
                outputToFile: false,
                outputToConsole: false,
                tServerConnect: false,
                tServerDisconnect: false,
                tServerError: false,
                extensionError: false,
            },
            restApi: {
                enabled: false,
                port: 0
            },
            connectionLimit: {
                enabled: false,
                connectionLimitPerIP: 1,
                kickReason: ""
            },
            connectionRateLimit: {
                enabled: false,
                connectionRateLimitPerIP: 5,
                connectionRateLimitWindowSeconds: 1
            },
            redis: {
                enabled: false,
                host: "localhost",
                port: 6379
            },
            tcpRtt: {
                enabled: false,
                sampleIntervalMs: 2000,
                exportToServers: true,
                restApiEndpoint: true,
                pingCommandPassThrough: false
            },
            language: Language.english,
            debuffOnSwitch: { enabled: false },
            disconnectOnKick: { type: "never" },
            hotReload: false
        };
        clientSocketDataHandlers = [];
        tcpServer = Net.createServer((incomingSocket: Net.Socket) => {
            clientSocket = incomingSocket;
            clientSocket.on("data", (data) => {
                for (let i = 0; i < clientSocketDataHandlers.length; i++) {
                    clientSocketDataHandlers[i](data.toString('hex'));
                }
            });
        });
        serverA = {
            name: "servera",
            serverIP: "localhost",
            serverPort: 7777,
            hidden: false,
            isVanilla: false,
        };
        serverB = {
            name: "serverb",
            serverIP: "localhost",
            serverPort: 7778,
            hidden: false,
            isVanilla: false,
        };

        serversDetails = {
            servera: {
                clientCount: 0,
                disabled: false,
                disabledTimeout: null,
                failedConnAttempts: 0
            },
            serverb: {
                clientCount: 0,
                disabled: false,
                disabledTimeout: null,
                failedConnAttempts: 0
            }
        };

        globalHandlers = {
            command: new ClientCommandHandler(),
            clientPacketHandler: new ClientPacketHandler(),
            terrariaServerPacketHandler: new TerrariaServerPacketHandler(),
            extensions: {}
        };

        servers = {
            servera: serverA,
            serverb: serverB
        };

        globalTracking = {
            names: {},
            tcpRtt: {
                clients: {}
            }
        };

        let clientArgs: ClientArgs = {
            globalHandlers: globalHandlers,
            globalTracking: globalTracking,
            id,
            logging: winston.createLogger(),
            options: config,
            server: serverA,
            servers: servers,
            serversDetails: serversDetails,
            socket: socket
        };

        tcpServer.listen(0, "127.0.0.1", () => {
            const address = tcpServer.address();
            if (!address || typeof address === "string") {
                done(new Error("Failed to start local test server"));
                return;
            }

            socket = Net.connect(address.port, "127.0.0.1");
            const onError = (err: Error) => done(err);
            socket.once("error", onError);
            socket.once("connect", () => {
                socket.off("error", onError);
                clientArgs.socket = socket;
                client = new Client(clientArgs);
                server = new TerrariaServer(socket, client);
                done();
            });
        });
    });

    afterEach((done: DoneFn) => {
        if (clientSocket && !clientSocket.destroyed) {
            clientSocket.destroy();
        }
        if (socket && !socket.destroyed) {
            socket.destroy();
        }
        if (tcpServer) {
            tcpServer.close(() => done());
        } else {
            done();
        }
    });

    it("should decrement client counts when disconnecting from a server", () => {
        client.serversDetails[serverA.name].clientCount = 1;
        client.countIncremented = true;

        client.disconnectFromServer();

        expect(client.serversDetails[serverA.name].clientCount).toBe(0);
        expect(client.countIncremented).toBe(false);
    });

    it("should correctly set up the required properties", () => {
        expect(client.ID).toEqual(id);
        expect(client.options).toEqual(config);
        expect(client.server.name).toEqual(serverA.name);
        expect(client.server.ip).toEqual(serverA.serverIP);
        expect(client.server.port).toEqual(serverA.serverPort);
        expect(client.servers).toEqual(servers);
        expect(client.serversDetails).toEqual(serversDetails);
        expect(client.logging).not.toBeNull();
    });

    it("should correctly set the name of the client", () => {
        let name = "test";
        client.setName(name);
        expect(client.getName()).toBe(name);
    });

    it("should correctly deny changing the name to an existing one", () => {
        let takenName = "thisnameistaken";
        globalTracking.names[takenName] = true;
        client.setName(takenName);
        expect(client.getName()).not.toBe(takenName);
    });

    /* TODO: Fix
    it("should correctly kick the player if they try to use an existing name", (done: DoneFn) => {
        let takenName = "thisnameistaken";
        globalTracking.names[takenName] = true;

        clientSocketDataHandlers.push((data: string) => {
            let reader = new PacketReader(Buffer.from(data, "hex"));
            expect(reader.type).toEqual(PacketTypes.Disconnect);
            done();
        });

        client.setName(takenName);
    });*/

    /* TODO: Fix
     * it("should correctly send a chat message to the client", (done: DoneFn) => {
        let testMessage = "this is a test";

        clientSocketDataHandlers.push((data: string) => {
            let reader = new PacketReader(Buffer.from(data, "hex"));
            expect(reader.type).toEqual(PacketTypes.LoadNetModule);
            expect(reader.readUInt16()).toEqual(1);
            expect(reader.readByte()).toEqual(255);
            expect(reader.readNetworkText().text).toEqual(testMessage);
            reader.readColor();
            done();
        });

        client.sendChatMessage(testMessage);
    });*/

    it("should correctly switch the client to another server", () => {
        // Set to true to avoid callback waiting
        (client.server.socket as any).destroyed = true;
        client.changeServer(serverB);

        expect(client.server.name).toBe(serverB.name);
    });

    it("should force close the client socket if it does not close after a disconnect packet is written", () => {
        jasmine.clock().install();
        try {
            const sendPacketToClientEvent = jasmine.createSpy("sendPacketToClientEvent");
            globalHandlers.extensions = {
                recorder: {
                    name: "recorder",
                    version: "test",
                    author: "test",
                    reloadable: false,
                    sendPacketToClientEvent
                }
            };

            const end = spyOn(socket, "end").and.callFake(function (this: Net.Socket, ...args: any[]) {
                const callback = args.find((arg) => typeof arg === "function");
                if (callback) {
                    callback();
                }
                return this;
            });
            const destroy = spyOn(socket, "destroy").and.callThrough();

            client.disconnect("Rejected");

            expect(end).toHaveBeenCalled();
            expect(sendPacketToClientEvent).toHaveBeenCalled();
            jasmine.clock().tick(2999);
            expect(destroy).not.toHaveBeenCalled();
            jasmine.clock().tick(1);
            expect(destroy).toHaveBeenCalled();
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it("should clear the client status text before pre-ingame disconnects", () => {
        const sendPacketToClientEvent = jasmine.createSpy("sendPacketToClientEvent");
        globalHandlers.extensions = {
            recorder: {
                name: "recorder",
                version: "test",
                author: "test",
                reloadable: false,
                sendPacketToClientEvent
            }
        };

        const end = spyOn(socket, "end").and.callFake(function (this: Net.Socket) {
            return this;
        });

        client.disconnect("Rejected");

        expect(end).toHaveBeenCalled();
        const writtenPacket = end.calls.mostRecent().args[0] as Buffer;
        const parsedPackets = getPacketsFromBuffer(writtenPacket);
        expect(parsedPackets.type).toBe("ValidPackets");
        if (parsedPackets.type !== "ValidPackets") {
            return;
        }

        expect(parsedPackets.packets.map(packet => packet.packetType)).toEqual([
            PacketTypes.Status,
            PacketTypes.Disconnect
        ]);

        expect(sendPacketToClientEvent.calls.count()).toBe(2);
        const eventPacketTypes = sendPacketToClientEvent.calls.allArgs().map((args) => {
            const eventPackets = getPacketsFromBuffer(args[1] as Buffer);
            expect(eventPackets.type).toBe("ValidPackets");
            if (eventPackets.type !== "ValidPackets") {
                return -1;
            }
            return eventPackets.packets[0].packetType;
        });
        expect(eventPacketTypes).toEqual([
            PacketTypes.Status,
            PacketTypes.Disconnect
        ]);
    });

    it("should not clear the client status text before ingame disconnects", () => {
        client.ingame = true;
        const end = spyOn(socket, "end").and.callFake(function (this: Net.Socket) {
            return this;
        });

        client.disconnect("Rejected");

        expect(end).toHaveBeenCalled();
        const writtenPacket = end.calls.mostRecent().args[0] as Buffer;
        const parsedPackets = getPacketsFromBuffer(writtenPacket);
        expect(parsedPackets.type).toBe("ValidPackets");
        if (parsedPackets.type !== "ValidPackets") {
            return;
        }

        expect(parsedPackets.packets.map(packet => packet.packetType)).toEqual([
            PacketTypes.Disconnect
        ]);
    });

    it("should track the reason for an explicit Dimensions disconnect", () => {
        client.disconnect("Rejected");

        const reason = client.getDimensionsDisconnectReason();
        expect(reason.code).toBe(DisconnectReasonCodes.DimensionsDisconnectPacket);
        expect(reason.detail).toBe("Rejected");
    });

    it("should log a backend timeout reason when a dimension socket closes after timing out", () => {
        config.log.tServerDisconnect = true;
        const info = spyOn(client.logging, "info");
        const error = Object.assign(new Error("connect ETIMEDOUT 127.0.0.1:7777"), { code: "ETIMEDOUT" });

        client.countIncremented = true;
        client.serversDetails[serverA.name].clientCount = 1;
        client.server.handleError(error);
        client.server.handleClose();

        expect(info).toHaveBeenCalled();
        const args = info.calls.mostRecent().args;
        expect(args[0]).toContain("disconnected from dimension");
        expect(args[0]).toContain(DisconnectReasonCodes.ServerSocketTimeout);
        expect(args[0]).toContain(`${serverA.name}: 0`);
        expect((args as any)[1].reasonCode).toBe(DisconnectReasonCodes.ServerSocketTimeout);
    });

    it("should not send follow-up chat packets after an early backend kick", (done: DoneFn) => {
        const receivedPackets: Buffer[] = [];
        clientSocketDataHandlers.push((data: string) => {
            receivedPackets.push(Buffer.from(data, "hex"));
        });

        const disconnectPacket = DisconnectPacket.toBuffer({
            reason: new NetworkText(0, "Server rejected join")
        });

        if (disconnectPacket.TAG === "Error") {
            done(new Error(String(disconnectPacket._0)));
            return;
        }

        client.server.name = serverA.name;
        client.server.isVanilla = serverA.isVanilla;

        clientSocket.once("close", () => {
            expect(receivedPackets.length).toBeGreaterThan(0);

            const packets = getPacketsFromBuffer(Buffer.concat(receivedPackets));
            expect(packets.type).toBe("ValidPackets");
            if (packets.type !== "ValidPackets") {
                done();
                return;
            }

            expect(packets.packets.map(packet => packet.packetType)).toEqual([
                PacketTypes.Status,
                PacketTypes.Disconnect
            ]);

            const parsed = Parser.parse(packets.packets[1].data, true);
            expect(parsed.TAG).toBe("Ok");
            if (parsed.TAG === "Ok") {
                expect(parsed._0.TAG).toBe("Disconnect");
                if (parsed._0.TAG === "Disconnect") {
                    expect(parsed._0._0.reason.text).toBe("Server rejected join");
                }
            }
            done();
        });

        globalHandlers.terrariaServerPacketHandler.handlePacket(client.server, {
            packetType: PacketTypes.Disconnect,
            data: disconnectPacket._0
        }, PacketSource.TerrariaServer);
        client.server.handleClose();
    });

    it("should queue a small number of pre-ready packets", () => {
        const data = playerBuffsSetPacket();

        globalHandlers.clientPacketHandler.handlePacket(client, {
            packetType: PacketTypes.UpdatePlayerBuff,
            data
        });

        expect(client.packetQueue.length).toBe(1);
    });

    it("should disconnect instead of retaining unbounded pre-ready client packets", () => {
        const data = playerBuffsSetPacket();
        const disconnect = spyOn(client, "disconnect").and.callThrough();

        for (let i = 0; i < 10000; i++) {
            globalHandlers.clientPacketHandler.handlePacket(client, {
                packetType: PacketTypes.UpdatePlayerBuff,
                data: Buffer.from(data)
            });
        }

        expect(disconnect).toHaveBeenCalled();
        expect(client.packetQueue.length).toBe(0);
    });

    it("should disconnect instead of retaining unbounded packets while connecting to a server", () => {
        const data = playerBuffsSetPacket();
        const disconnect = spyOn(client, "disconnect").and.callThrough();
        let accepted = true;

        for (let i = 0; i < 10000 && accepted; i++) {
            accepted = client.queuePacketsWhileConnecting([{
                packetType: PacketTypes.UpdatePlayerBuff,
                data: Buffer.from(data)
            }]);
        }

        expect(accepted).toBeFalse();
        expect(disconnect).toHaveBeenCalledTimes(1);
        expect(queuedPacketsWhileConnectingLength()).toBe(0);
    });

    it("should queue the observed client join burst while connecting to a server", () => {
        const accepted = client.queuePacketsWhileConnecting(observedClientPreConnectJoinBurst());

        expect(accepted).toBeTrue();
        expect(queuedPacketsWhileConnectingLength()).toBe(OBSERVED_CLIENT_PRE_CONNECT_JOIN_PACKET_COUNT);
    });

    it("should queue a small number of upstream pre-ready inventory packets", () => {
        const data = playerInventorySlotPacket();

        globalHandlers.terrariaServerPacketHandler.handlePacket(client.server, {
            packetType: PacketTypes.PlayerInventorySlot,
            data
        }, PacketSource.TerrariaServer);

        expect(client.server.packetQueue.length).toBe(1);
    });

    it("should queue the observed upstream pre-ready inventory burst", () => {
        const disconnectFromServer = spyOn(client, "disconnectFromServer").and.callThrough();
        const slots = fullJoinInventorySlotIds();

        for (let i = 0; i < OBSERVED_BACKEND_PRE_READY_INVENTORY_PACKET_COUNT; i++) {
            const data = playerInventorySlotPacket(slots[i % slots.length]);
            globalHandlers.terrariaServerPacketHandler.handlePacket(client.server, {
                packetType: PacketTypes.PlayerInventorySlot,
                data
            }, PacketSource.TerrariaServer);
        }

        expect(disconnectFromServer).not.toHaveBeenCalled();
        expect(client.server.packetQueue.length).toBe(OBSERVED_BACKEND_PRE_READY_INVENTORY_PACKET_COUNT);
    });

    it("should disconnect from the upstream instead of retaining unbounded pre-ready inventory packets", () => {
        const data = playerInventorySlotPacket();
        const disconnectFromServer = spyOn(client, "disconnectFromServer").and.callThrough();

        for (let i = 0; i < 10000; i++) {
            globalHandlers.terrariaServerPacketHandler.handlePacket(client.server, {
                packetType: PacketTypes.PlayerInventorySlot,
                data: Buffer.from(data)
            }, PacketSource.TerrariaServer);
        }

        expect(disconnectFromServer).toHaveBeenCalled();
        expect(client.server.packetQueue.length).toBe(0);
    });
});
