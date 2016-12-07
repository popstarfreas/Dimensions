import * as Net from 'net';
import GlobalTracking from 'globaltracking';
import ServerDetails from 'serverdetails';
import RoutingServer from 'routingserver';
import * as _ from 'lodash';
import * as uuid from 'uuid/v4';

interface TshockVersion {
    Major: number;
    Minor: number;
    Build: number;
    Revision: number;
    MajorRevision: number;
    MinorRevision: number;
}

interface ApiResponse {
    status: number;
    name: string;
    serverversion: string;
    tshockversion: TshockVersion;
    port: number;
    playercount: number;
    maxplayers: number;
    world: string;
    uptime: string;
    serverpassword: boolean;
    players: Array<string>;
}

type ServersDetails = {
    [id: string]: ServerDetails
};

type RoutingServers = {
    [id: string]: RoutingServer
}

class RestApi {
    server: Net.Server;
    port: number;
    servers: RoutingServers;
    globalTracking: GlobalTracking;
    serversDetails: ServersDetails;
    openSockets: { [id: string]: Net.Socket };

    constructor(port: number, globalTracking: GlobalTracking, serversDetails: ServersDetails, servers: RoutingServers) {
        this.servers = servers;
        this.port = port;
        this.globalTracking = globalTracking;
        this.serversDetails = serversDetails;
        this.openSockets = {};

        this.createServer();
        console.log(`\u001b[35mRestApi on ${port} started.\u001b[0m`);
    }

    createServer(): void {
        this.server = Net.createServer((socket) => {
            this.handleSocket(socket);
        }).on('error', (e) => {
            console.log(e);
        }).listen(this.port);
    }

    handleReload(port: number): void {
        if (this.port !== port) {
            let socketIds = _.keys(this.openSockets);
            let id: string;
            for (let i = 0; i < socketIds.length; i++) {
                id = socketIds[i];
                this.openSockets[id].destroy();
            }

            this.server.close();

            this.port = port;
            this.createServer();
        }
    }

    handleSocket(socket: Net.Socket): void {
        let id: string = uuid();
        this.openSockets[id] = socket;
        socket.on('close', () => {
            delete this.openSockets[id];
        });

        socket.on('error', (e) => {
            console.log(e);
        });
        
        socket.setEncoding('utf8');
        this.sendInformation(socket)
            .then(() => {
                socket.destroy();
            });
    }

    sendInformation(socket: Net.Socket): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let response: ApiResponse = {
                status: 200,
                name: "",
                serverversion: "1.3.4.4",
                tshockversion: {
                    Major: 4,
                    Minor: 3,
                    Build: 21,
                    Revision: 0,
                    MajorRevision: 0,
                    MinorRevision: 0
                },
                port: 7777,
                playercount: 0,
                maxplayers: 400,
                world: "Dark Gaming",
                uptime: "0.01:27:38",
                serverpassword:false,
                players: [

                ]
            };

            let serverKeys: string[] = _.keys(this.servers);
            for (let i: number = 0; i < serverKeys.length; i++) {
                response.playercount += this.serversDetails[serverKeys[i]].clientCount;
            }

            response.players  =  _.keys(this.globalTracking.names);
            socket.write(JSON.stringify(response));

            resolve();
        });
    }
}

export default RestApi;