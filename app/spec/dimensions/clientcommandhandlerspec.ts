import { v4 as uuidv4 } from 'uuid';
import ClientCommandHandler from '../../dimensions/clientcommandhandler.js';
import TerrariaServer from '../../dimensions/terrariaserver.js';
import Client from '../../dimensions/client.js';
import ClientArgs from '../../dimensions/clientargs.js';
import * as Net from 'net';
import RoutingServer from '../../dimensions/routingserver.js';
import ClientPacketHandler from '../../dimensions/clientpackethandler.js';
import TerrariaServerPacketHandler from '../../dimensions/terrariaserverpackethandler.js';
import { ConfigOptions } from '../../dimensions/configloader.js';
import * as winston from 'winston';
import ClientState from '../../dimensions/clientstate.js';
import * as Language from '../../dimensions/language.js';
type DoneFn = (err?: unknown) => void;

describe("ClientCommandHandler", () => {
    let config: ConfigOptions;
    let serverA: RoutingServer;
    let serverB: RoutingServer;
    let socket: Net.Socket;
    let tcpServer: Net.Server;
    let serversDetails: any;
    let globalHandlers;
    let servers;
    let globalTracking: any;
    let client: Client;
    // @ts-ignore
    let server: TerrariaServer;

    let clientSocket: Net.Socket;
    let clientSocketDataHandlers: ((data: string) => void)[];

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
                outputToConsole: false,
                outputToFile: false,
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
                    clientSocketDataHandlers[i](data.toString());
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
            names: {}
        };

        let clientArgs: ClientArgs = {
            globalHandlers: globalHandlers,
            globalTracking: globalTracking,
            id: uuidv4(),
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

    it("should not handle a non-existant command", () => {
        client.globalHandlers.command.parseCommand("/idonotexist");
        expect(client.server.name).toEqual(serverA.name);
    });

    it("should properly convert a string into a command object", () => {
        let command = client.globalHandlers.command.parseCommand("/chips and gravy");
        expect(command.name).toBe("chips");
        expect(command.args.length).toBe(2);
        expect(command.args[0]).toBe("and");
        expect(command.args[1]).toBe("gravy");
    });

    describe("who", () => {
        it("should not handle the who command", () => {
            let command = client.globalHandlers.command.parseCommand("/who");
            let handled = client.globalHandlers.command.handle(command, client);
            expect(handled).toBe(false);
        });

        it("should use tracked player names for who count", (done: DoneFn) => {
            serversDetails.servera.clientCount = 8;
            serversDetails.serverb.clientCount = 9;
            globalTracking.names = { one: true, two: true };

            const handler = (data: string) => {
                if (data.indexOf("There are 2 players across all Dimensions") === -1) {
                    return;
                }
                clientSocketDataHandlers = clientSocketDataHandlers.filter(h => h !== handler);
                done();
            };
            clientSocketDataHandlers.push(handler);

            let command = client.globalHandlers.command.parseCommand("/who");
            client.globalHandlers.command.handle(command, client);
        });

        it("should send the user a user count", (done: DoneFn) => {
            const handler = (data: string) => {
                if (data.indexOf("There are 0 players across all Dimensions") === -1) {
                    return;
                }
                // Only handle the first relevant message to avoid calling done twice
                clientSocketDataHandlers = clientSocketDataHandlers.filter(h => h !== handler);
                done();
            };
            clientSocketDataHandlers.push(handler);
            let command = client.globalHandlers.command.parseCommand("/who");
            client.globalHandlers.command.handle(command, client);
        });
    });

    describe("dimensionswitch", () => {
        it("should not switch to a non-existing dimension", () => {
            // Set to true to avoid callback waiting
            (client.server.socket as any).destroyed = true;

            let command = client.globalHandlers.command.parseCommand("/asdasdas");
            let handled = client.globalHandlers.command.handle(command, client);
            expect(handled).toBe(false);
            expect(client.server.name).toBe(serverA.name);
        });

        it("should switch to an existing dimension", () => {
            // Set to true to avoid callback waiting
            (client.server.socket as any).destroyed = true;
            client.state = ClientState.FullyConnected;

            let command = client.globalHandlers.command.parseCommand("/serverb");
            let handled = client.globalHandlers.command.handle(command, client);
            expect(handled).toBe(true);
            expect(client.server.name).toBe(serverB.name);
        });
    });
});
