import * as Net from 'net';
import * as winston from 'winston';
import RestApi from '../../dimensions/restapi.js';
import GlobalTracking from '../../dimensions/globaltracking.js';

describe("RestApi", () => {
    let restApi: RestApi;
    let globalTracking: GlobalTracking;

    beforeEach(() => {
        globalTracking = {
            names: {
                Aaren: true,
            },
            tcpRtt: {
                clients: {
                    "client-1": {
                        id: "client-1",
                        uuid: "client-uuid",
                        name: "Aaren",
                        ip: "127.0.0.1",
                        server: "lobby",
                        playerId: 3,
                        available: true,
                        rttMs: 42,
                        rttMicros: 42000,
                        updatedAt: 123456789,
                        source: "tcp-info",
                        clientRtt: {
                            available: true,
                            rttMs: 42,
                            rttMicros: 42000,
                            updatedAt: 123456789,
                            source: "tcp-info",
                        },
                        serverRtt: {
                            available: true,
                            rttMs: 5,
                            rttMicros: 5000,
                            updatedAt: 123456790,
                            source: "tcp-info",
                        },
                        overallRtt: {
                            available: true,
                            rttMs: 47,
                            rttMicros: 47000,
                            updatedAt: 123456790,
                            source: "tcp-info",
                        },
                    }
                }
            }
        };

        restApi = new RestApi(0, globalTracking, {}, {}, undefined, winston.createLogger({ silent: true }), true);
    });

    afterEach(() => {
        restApi.close();
    });

    it("returns per-client RTT data from /dimensions/rtt", async () => {
        const write = jasmine.createSpy("write");
        const socket = { write } as unknown as Net.Socket;

        await (restApi as any).handleRequest(socket, "GET /dimensions/rtt HTTP/1.1\r\n\r\n");

        const response = write.calls.mostRecent().args[0] as string;
        expect(response).toContain("HTTP/1.1 200 OK");
        const body = JSON.parse(response.split("\r\n\r\n")[1]);
        expect(body.players.length).toBe(1);
        expect(body.players[0].name).toBe("Aaren");
        expect(body.players[0].rttMicros).toBe(42000);
        expect(body.players[0].clientRtt.rttMicros).toBe(42000);
        expect(body.players[0].serverRtt.rttMicros).toBe(5000);
        expect(body.players[0].overallRtt.rttMicros).toBe(47000);
    });

    it("keeps unknown paths compatible with the status response", async () => {
        const write = jasmine.createSpy("write");
        const socket = { write } as unknown as Net.Socket;

        await (restApi as any).handleRequest(socket, "GET /anything HTTP/1.1\r\n\r\n");

        const response = write.calls.mostRecent().args[0] as string;
        const body = JSON.parse(response.split("\r\n\r\n")[1]);
        expect(body.playercount).toBe(1);
        expect(body.players).toBe("Aaren");
    });
});
