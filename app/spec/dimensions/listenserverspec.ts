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
        const destroy = jasmine.createSpy("destroy");
        const socket = {
            remoteAddress: ip,
            removeAllListeners,
            destroy
        } as unknown as Net.Socket;

        await (listenServer as any).handleSocket(socket);

        expect(connectionsTracker.has(ip)).toBe(false);
        expect(removeAllListeners).toHaveBeenCalled();
        expect(destroy).toHaveBeenCalled();
    });
});
