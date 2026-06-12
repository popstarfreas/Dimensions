import GlobalTracking from "./globaltracking.js";
import ErrorHelper from './errorhelper.js';
import RoutingServer from "./routingserver.js";
import ServerDetails from "./serverdetails.js";
import { RestApiResponse } from "./configloader.js";
import * as Net from "net";
import * as uuid from "uuid";
import * as fs from "fs";
import * as winston from 'winston';

export interface TshockVersion {
    Major: number;
    Minor: number;
    Build: number;
    Revision: number;
    MajorRevision: number;
    MinorRevision: number;
}

export interface ApiResponse {
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
    players: string[] | string;
}

export interface RttApiResponse {
    status: number;
    players: Array<{
        id: string;
        uuid: string;
        name: string;
        ip: string;
        server: string;
        playerId: number | null;
        available: boolean;
        rttMs: number | null;
        rttMicros: number | null;
        clientRtt: {
            rttMs: number | null;
            rttMicros: number | null;
            updatedAt: number | null;
            available: boolean;
        };
        serverRtt: {
            rttMs: number | null;
            rttMicros: number | null;
            updatedAt: number | null;
            available: boolean;
        };
        overallRtt: {
            rttMs: number | null;
            rttMicros: number | null;
            updatedAt: number | null;
            available: boolean;
        };
        updatedAt: number | null;
        source: string;
    }>;
}

export interface ServersDetails {
    [id: string]: ServerDetails;
}

export interface RoutingServers {
    [id: string]: RoutingServer;
}

/* Responds to HTTP requests on the specified port with a tShock /v2/status response, which includes the player counts
 * and player names from all hosted Dimensions */
class RestApi {
    public servers: RoutingServers;
    public serversDetails: ServersDetails;
    private server!: Net.Server;
    private port: number;
    private globalTracking: GlobalTracking;
    private openSockets: { [id: string]: Net.Socket };
    private response?: RestApiResponse;
    private logging: winston.Logger;
    private rttEndpointEnabled: boolean;

    constructor(port: number, globalTracking: GlobalTracking, serversDetails: ServersDetails, servers: RoutingServers, response: RestApiResponse | undefined, logging: winston.Logger, rttEndpointEnabled: boolean) {
        this.servers = servers;
        this.port = port;
        this.globalTracking = globalTracking;
        this.serversDetails = serversDetails;
        this.response = response;
        this.openSockets = {};
        this.logging = logging;
        this.rttEndpointEnabled = rttEndpointEnabled;

        this.createServer();
        this.logging.info(`RestApi on ${port} started.`);
    }

    /* Starts a new server listening for socket connections on the appropriate port */
    private createServer(): void {
        this.server = Net.createServer((socket) => {
            this.handleSocket(socket);
        }).on("error", (e) => {
            this.logging.error("REST API Server error: " + ErrorHelper.toMessage(e));
        }).listen(this.port);
    }

    /* Used by the reload command to check if the port has changed, and if so
     * will close existing connections and the socket server, then start a new
     * one using the new port */
    public handleReload(port: number, rttEndpointEnabled: boolean): void {
        this.rttEndpointEnabled = rttEndpointEnabled;
        if (this.port !== port) {
            const socketIds = Object.keys(this.openSockets);
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

    /* Responds to a new socket with a routed API response and then closes the connection. */
    private handleSocket(socket: Net.Socket): void {
        const id: string = uuid.v4();
        this.openSockets[id] = socket;
        let requestHandled = false;
        let fallbackTimeout: NodeJS.Timeout | null = null;
        socket.on("close", () => {
            if (fallbackTimeout !== null) {
                clearTimeout(fallbackTimeout);
            }
            delete this.openSockets[id];
        });

        socket.on("error", (e) => {
            this.logging.warn("REST API Socket error: " + ErrorHelper.toMessage(e));
        });

        socket.setEncoding("utf8");
        socket.once("data", (request) => {
            requestHandled = true;
            if (fallbackTimeout !== null) {
                clearTimeout(fallbackTimeout);
            }
            this.handleRequest(socket, request.toString())
                .then(() => {
                    socket.destroy();
                });
        });

        fallbackTimeout = setTimeout(() => {
            if (requestHandled || socket.destroyed) {
                return;
            }

            this.sendInformation(socket)
                .then(() => {
                    socket.destroy();
                });
        }, 100);
        fallbackTimeout.unref();
    }

    private async handleRequest(socket: Net.Socket, request: string): Promise<void> {
        const path = this.getRequestPath(request);
        if (path === "/dimensions/rtt") {
            if (this.rttEndpointEnabled) {
                this.sendTcpRttInformation(socket);
            } else {
                this.sendJson(socket, 404, { status: 404, error: "TCP RTT endpoint disabled" });
            }
            return;
        }

        await this.sendInformation(socket);
    }

    private getRequestPath(request: string): string {
        const firstLine = request.split(/\r?\n/, 1)[0] ?? "";
        const match = /^GET\s+([^\s]+)\s+HTTP\/\d(?:\.\d)?$/i.exec(firstLine);
        if (match === null) {
            return "/v2/status";
        }

        try {
            return new URL(match[1], "http://dimensions.local").pathname;
        } catch (e) {
            return "/v2/status";
        }
    }

    /* Generates a /v2/status-like response using the tracking server counts and player names
     * and sends it to the socket */
    private async sendInformation(socket: Net.Socket): Promise<void> {
        let version = "1.4.3.6";
        try {
            version = (await fs.promises.readFile("version.txt")).toString();
        } catch (e) {

        }
        const response: ApiResponse = {
            status: 200,
            name: this.response?.name ?? "",
            serverversion: this.response?.version ?? version,
            tshockversion: {
                Major: 4,
                Minor: 4,
                Build: 0,
                Revision: 0,
                MajorRevision: 0,
                MinorRevision: 0
            },
            port: this.response?.terrariaServerPort ?? 7777,
            playercount: 0,
            maxplayers: this.response?.maxPlayers ?? 400,
            world: this.response?.worldName ?? "Dimensions Generic",
            uptime: "0.01:27:38",
            serverpassword: this.response?.hasServerPassword ?? false,
            players: [

            ]
        };

        const playerNames = Object.keys(this.globalTracking.names);

        // This is compatible with terraria-servers.com.
        // When they fix their usage of old rest, this
        // should be updated
        response.players = playerNames.join(", ");

        // New REST version
        // response.players = playerNames;

        response.playercount = playerNames.length;
        this.sendJson(socket, 200, response);
    }

    private sendTcpRttInformation(socket: Net.Socket): void {
        const response: RttApiResponse = {
            status: 200,
            players: Object.values(this.globalTracking.tcpRtt.clients).map((client) => ({
                id: client.id,
                uuid: client.uuid,
                name: client.name,
                ip: client.ip,
                server: client.server,
                playerId: client.playerId,
                available: client.available,
                rttMs: client.rttMs,
                rttMicros: client.rttMicros,
                clientRtt: {
                    rttMs: client.clientRtt.rttMs,
                    rttMicros: client.clientRtt.rttMicros,
                    updatedAt: client.clientRtt.updatedAt,
                    available: client.clientRtt.available,
                },
                serverRtt: {
                    rttMs: client.serverRtt.rttMs,
                    rttMicros: client.serverRtt.rttMicros,
                    updatedAt: client.serverRtt.updatedAt,
                    available: client.serverRtt.available,
                },
                overallRtt: {
                    rttMs: client.overallRtt.rttMs,
                    rttMicros: client.overallRtt.rttMicros,
                    updatedAt: client.overallRtt.updatedAt,
                    available: client.overallRtt.available,
                },
                updatedAt: client.updatedAt,
                source: client.source,
            }))
        };

        this.sendJson(socket, 200, response);
    }

    private sendJson(socket: Net.Socket, statusCode: number, response: unknown): void {
        socket.write(`HTTP/1.1 ${statusCode} ${this.getStatusText(statusCode)}\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify(response)}`);
    }

    private getStatusText(statusCode: number): string {
        switch (statusCode) {
            case 200:
                return "OK";
            case 404:
                return "Not Found";
            default:
                return "OK";
        }
    }

    public close(): void {
        this.server.close();
    }
}

export default RestApi;
