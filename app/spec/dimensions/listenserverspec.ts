import * as Net from 'net';
import * as winston from 'winston';
import ListenServer from '../../dimensions/listenserver.js';
import ListenServerArgs from '../../dimensions/listenserverargs.js';
import RoutingServer from '../../dimensions/routingserver.js';
import ClientCommandHandler from '../../dimensions/clientcommandhandler.js';
import ClientPacketHandler from '../../dimensions/clientpackethandler.js';
import TerrariaServerPacketHandler from '../../dimensions/terrariaserverpackethandler.js';
import { ConfigOptions } from '../../dimensions/configloader.js';
import * as Language from '../../dimensions/language.js';
import { Parser } from 'terraria-packet';
import { DisconnectReasonCodes, makeDisconnectReason } from '../../dimensions/disconnectreason.js';

describe("ListenServer", () => {
    let listenServer!: ListenServer;
    let connectionsTracker!: Map<string, number>;
    let connectRateTracker!: Map<string, number>;

    beforeEach(() => {
        connectionsTracker = new Map();
        connectRateTracker = new Map();

        const routingServer: RoutingServer = {
            name: "servera",
            serverIP: "127.0.0.1",
            serverPort: 7777,
            hidden: false,
            isVanilla: false,
        };

        const options: ConfigOptions = {
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
                enabled: true,
                connectionLimitPerIP: 2,
                kickReason: ""
            },
            connectionRateLimit: {
                enabled: true,
                connectionRateLimitPerIP: 1
            },
            redis: {
                enabled: false,
                host: "localhost",
                port: 6379
            },
            language: Language.english,
            debuffOnSwitch: { enabled: false },
            disconnectOnKick: { type: "never" },
            hotReload: false
        };

        const args: ListenServerArgs = {
            info: {
                listenPort: 0,
                routingServers: [routingServer]
            },
            serversDetails: {
                servera: {
                    clientCount: 0,
                    disabled: false,
                    disabledTimeout: null,
                    failedConnAttempts: 0
                }
            },
            globalHandlers: {
                command: new ClientCommandHandler(),
                clientPacketHandler: new ClientPacketHandler(),
                terrariaServerPacketHandler: new TerrariaServerPacketHandler(),
                extensions: {}
            },
            servers: {
                servera: routingServer
            },
            options,
            globalTracking: {
                names: {}
            },
            logging: winston.createLogger({ silent: true }),
            connectionsTracker,
            connectRateTracker
        };

        listenServer = new ListenServer(args);
    });

    afterEach(() => {
        listenServer.shutdown();
    });

    it("should rollback the connection tracker when rate limit rejects a socket", async () => {
        const ip = "127.0.0.1";
        connectRateTracker.set(ip, 1);

        const removeAllListeners = jasmine.createSpy("removeAllListeners");
        const once = jasmine.createSpy("once");
        const end = jasmine.createSpy("end");
        const destroy = jasmine.createSpy("destroy");
        const socket = {
            remoteAddress: ip,
            removeAllListeners,
            once,
            end,
            destroy,
            destroyed: false,
            writable: true
        } as unknown as Net.Socket;

        await (listenServer as any).handleSocket(socket);

        expect(connectionsTracker.has(ip)).toBe(false);
        expect(removeAllListeners).toHaveBeenCalled();
        expect(end).toHaveBeenCalled();
        expect(destroy).not.toHaveBeenCalled();

        const disconnectPacket = end.calls.mostRecent().args[0];
        const parsed = Parser.parse(disconnectPacket, true);
        expect(parsed.TAG).toBe("Ok");
        if (parsed.TAG === "Ok") {
            expect(parsed._0.TAG).toBe("Disconnect");
        }
    });

    it("should send a disconnect packet when no routing server is available", async () => {
        const ip = "127.0.0.1";
        const once = jasmine.createSpy("once");
        const end = jasmine.createSpy("end");
        const destroy = jasmine.createSpy("destroy");
        const socket = {
            remoteAddress: ip,
            once,
            end,
            destroy,
            destroyed: false,
            writable: true
        } as unknown as Net.Socket;

        spyOn(listenServer as any, "chooseServer").and.returnValue(null);

        await (listenServer as any).handleSocket(socket);

        expect(connectionsTracker.has(ip)).toBe(false);
        expect(end).toHaveBeenCalled();
        expect(destroy).not.toHaveBeenCalled();

        const disconnectPacket = end.calls.mostRecent().args[0];
        const parsed = Parser.parse(disconnectPacket, true);
        expect(parsed.TAG).toBe("Ok");
        if (parsed.TAG === "Ok") {
            expect(parsed._0.TAG).toBe("Disconnect");
        }
    });

    it("should run raw socket write post hooks after ending a rejected socket", async () => {
        const events: string[] = [];
        (listenServer as any).globalHandlers.extensions = {
            recorder: {
                name: "recorder",
                version: "test",
                author: "test",
                reloadable: false,
                rawSocketWritePreHandler: () => {
                    events.push("pre");
                    return false;
                },
                rawSocketWritePostHandler: () => {
                    events.push("post");
                }
            }
        };

        const ip = "127.0.0.1";
        const socket = {
            remoteAddress: ip,
            once: jasmine.createSpy("once"),
            end: jasmine.createSpy("end").and.callFake(() => {
                events.push("end");
            }),
            destroy: jasmine.createSpy("destroy"),
            destroyed: false,
            writable: true
        } as unknown as Net.Socket;

        spyOn(listenServer as any, "chooseServer").and.returnValue(null);

        await (listenServer as any).handleSocket(socket);

        expect(events).toEqual(["pre", "end", "post"]);
    });

    it("should destroy a rejected socket when a raw socket write pre hook blocks the disconnect packet", async () => {
        (listenServer as any).globalHandlers.extensions = {
            blocker: {
                name: "blocker",
                version: "test",
                author: "test",
                reloadable: false,
                rawSocketWritePreHandler: () => true
            }
        };

        const ip = "127.0.0.1";
        const end = jasmine.createSpy("end");
        const destroy = jasmine.createSpy("destroy");
        const socket = {
            remoteAddress: ip,
            end,
            destroy,
            destroyed: false,
            writable: true
        } as unknown as Net.Socket;

        spyOn(listenServer as any, "chooseServer").and.returnValue(null);

        await (listenServer as any).handleSocket(socket);

        expect(end).not.toHaveBeenCalled();
        expect(destroy).toHaveBeenCalled();
    });

    it("should force close a rejected socket if it does not close after the disconnect packet is written", () => {
        jasmine.clock().install();
        try {
            const end = jasmine.createSpy("end").and.callFake((_packet: Buffer, callback?: () => void) => {
                if (callback) {
                    callback();
                }
            });
            const destroy = jasmine.createSpy("destroy");
            const socket = {
                remoteAddress: "127.0.0.1",
                once: jasmine.createSpy("once"),
                end,
                destroy,
                destroyed: false,
                writable: true
            } as unknown as Net.Socket;

            (listenServer as any).disconnectClient(socket, "Rejected");

            expect(end).toHaveBeenCalled();
            jasmine.clock().tick(2999);
            expect(destroy).not.toHaveBeenCalled();
            jasmine.clock().tick(1);
            expect(destroy).toHaveBeenCalled();
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it("should log a Dimensions disconnect reason without throwing when server details are missing", () => {
        (listenServer as any).options.log.clientDisconnect = true;
        const info = spyOn((listenServer as any).logging, "info");
        const closeHandlers: Array<() => void> = [];
        const socket = {
            remoteAddress: "127.0.0.1",
            once: (event: string, callback: () => void) => {
                if (event === "close") {
                    closeHandlers.push(callback);
                }
                return socket;
            },
            removeAllListeners: jasmine.createSpy("removeAllListeners"),
        } as unknown as Net.Socket;
        const client = {
            ID: "client-id",
            ip: "127.0.0.1",
            server: { name: "missing" },
            countIncremented: true,
            handleClose: jasmine.createSpy("handleClose"),
            getDimensionsDisconnectReason: () => makeDisconnectReason(
                DisconnectReasonCodes.ClientSocketClosed,
                "client socket closed"
            ),
        };

        (listenServer as any).hookSocketClose(socket, client);
        closeHandlers[0]!();

        expect(client.handleClose).toHaveBeenCalled();
        expect(info).toHaveBeenCalled();
        const args = info.calls.mostRecent().args;
        expect(args[0]).toContain("disconnected from Dimensions");
        expect(args[0]).toContain(DisconnectReasonCodes.ClientSocketClosed);
        expect(args[0]).toContain("missing: unknown");
        expect((args as any)[1].reasonCode).toBe(DisconnectReasonCodes.ClientSocketClosed);
    });
});
