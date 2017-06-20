import ClientCommandHandler from 'dimensions/clientcommandhandler';
import TerrariaServer from 'dimensions/terrariaserver';
import Client from 'dimensions/client';
import ClientArgs from 'dimensions/clientargs';
import * as Net from 'net';
import RoutingServer from 'dimensions/routingserver';
import ClientPacketHandler from 'dimensions/clientpackethandler';
import TerrariaServerPacketHandler from 'dimensions/terrariaserverpackethandler';
import { ConfigOptions } from 'dimensions/configloader';
import Logger from 'dimensions/logger';
import PacketReader from 'dimensions/packets/packetreader';
import PacketTypes from 'dimensions/packettypes';
import GlobalTracking from 'dimensions/globaltracking';
let Mitm = require('mitm');

describe("client", () => {
    let mitm;
    let config: ConfigOptions;
    let serverA: RoutingServer;
    let serverB: RoutingServer;
    let socket: Net.Socket;
    let serversDetails;
    let globalHandlers;
    let servers;
    let globalTracking: GlobalTracking;
    let client: Client;
    let server: TerrariaServer;

    let clientSocket: Net.Socket;
    let clientSocketDataHandlers: ((data: string) => void)[];

    beforeEach(() => {
        config = {
            socketTimeout: 0,
            socketNoDelay: true,
            currentTerrariaVersion: 0,
            fakeVersion: {
                enabled: false,
                terrariaVersion: 0
            },
            blacklist: {
                enabled: false,
                apiKey: ""
            },
            blockInvis: false,
            log: {
                clientBlocked: false,
                clientConnect: false,
                clientDisconnect: false,
                clientError: false,
                clientTimeouts: false,
                extensionLoad: false,
                outputToConsole: false,
                tServerConnect: false,
                tServerDisconnect: false,
                tServerError: false,
            },
            restApi: {
                enabled: false,
                port: 0
            }

        };
        mitm = Mitm();
        clientSocketDataHandlers = [];
        mitm.on("connection", (socket) => {
            clientSocket = socket;
            clientSocket.on("data", (data) => {
                for (let i = 0; i < clientSocketDataHandlers.length; i++) {
                    clientSocketDataHandlers[i](data.toString('hex'));
                }
            });
        });

        socket = Net.connect(22, "example.org");
        serverA = {
            name: "servera",
            serverIP: "localhost",
            serverPort: 7777
        };
        serverB = {
            name: "serverb",
            serverIP: "localhost",
            serverPort: 7778
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
            extensions: []
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
            id: 0,
            logging: new Logger(),
            options: config,
            server: serverA,
            servers: servers,
            serversDetails: serversDetails,
            socket: socket
        };

        client = new Client(clientArgs);
        server = new TerrariaServer(socket, client);
    });

    afterEach(() => {
        mitm.disable();
    });

    it("should correctly set up the required properties", () => {
        expect(client.ID).toEqual(0);
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

    it("should correctly kick the player if they try to use an existing name", (done) => {
        let takenName = "thisnameistaken";
        globalTracking.names[takenName] = true;

        clientSocketDataHandlers.push((data: string) => {
            let reader = new PacketReader(data);
            expect(reader.type).toEqual(PacketTypes.Disconnect);
            done();
        });

        client.setName(takenName);
    });

    it("should correctly send a chat message to the client", (done) => {
        let testMessage = "this is a test";

        clientSocketDataHandlers.push((data: string) => {
            let reader = new PacketReader(data);
            expect(reader.type).toEqual(PacketTypes.LoadNetModule);
            expect(reader.readUInt16()).toEqual(1);
            expect(reader.readByte()).toEqual(255);
            expect(reader.readNetworkText().text).toEqual(testMessage);
            reader.readColor();
            done();
        });

        client.sendChatMessage(testMessage);
    });

    it("should correctly switch the client to another server", () => {
        // Set to true to avoid callback waiting
        client.server.socket.destroyed = true;
        client.changeServer(serverB);

        expect(client.server.name).toBe(serverB.name);
    });
});