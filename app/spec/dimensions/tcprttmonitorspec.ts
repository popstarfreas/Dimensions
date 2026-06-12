import * as Net from 'net';
import * as winston from 'winston';
import { DimensionsUpdatePacket } from 'terraria-packet';
import Client from '../../dimensions/client.js';
import GlobalHandlers from '../../dimensions/globalhandlers.js';
import GlobalTracking from '../../dimensions/globaltracking.js';
import TcpRttMonitor from '../../dimensions/tcprtt/tcprttmonitor.js';
import TcpRttProvider from '../../dimensions/tcprtt/provider.js';
import { TcpRttOptions } from '../../dimensions/configloader.js';
import { tcpInfoSample, TcpRttSample, unavailableTcpRttSample } from '../../dimensions/tcprtt/types.js';

class FakeTcpRttProvider implements TcpRttProvider {
    constructor(private currentSample: TcpRttSample) {
    }

    public sample(_socket: Net.Socket): TcpRttSample {
        return this.currentSample;
    }
}

function makeClient(overrides: Partial<Client> = {}): Client {
    const client: any = {
        ID: "client-1",
        UUID: "client-uuid",
        ip: "127.0.0.1",
        socket: {
            destroyed: false,
        },
        server: {
            name: "lobby",
            isVanilla: false,
            socket: {
                destroyed: false,
            },
            sendDirect: jasmine.createSpy("sendDirect"),
        },
        player: {
            id: 3,
        },
        connected: true,
        playerIdAssigned: true,
        tcpRtt: unavailableTcpRttSample(),
        clientTcpRtt: unavailableTcpRttSample(),
        serverTcpRtt: unavailableTcpRttSample(),
        overallTcpRtt: unavailableTcpRttSample(),
        options: {
            log: {
                extensionError: false,
            },
        },
        logging: winston.createLogger({ silent: true }),
        getName: () => "Aaren",
        setTcpRttSample(sample: TcpRttSample) {
            client.tcpRtt = sample;
            client.clientTcpRtt = sample;
        },
        setServerTcpRttSample(sample: TcpRttSample) {
            client.serverTcpRtt = sample;
        },
        setOverallTcpRttSample(sample: TcpRttSample) {
            client.overallTcpRtt = sample;
        },
        ...overrides,
    };

    return client as Client;
}

function makeGlobalHandlers(extensions: GlobalHandlers["extensions"] = {}): GlobalHandlers {
    return {
        command: undefined as any,
        clientPacketHandler: undefined as any,
        terrariaServerPacketHandler: undefined as any,
        extensions,
    };
}

function makeMonitor(
    globalTracking: GlobalTracking,
    provider: TcpRttProvider,
    globalHandlers = makeGlobalHandlers()
): TcpRttMonitor {
    const options: TcpRttOptions = {
        enabled: true,
        sampleIntervalMs: 2000,
        exportToServers: true,
        restApiEndpoint: true,
        pingCommandPassThrough: false,
    };

    return new TcpRttMonitor(globalTracking, globalHandlers, options, winston.createLogger({ silent: true }), provider);
}

describe("TcpRttMonitor", () => {
    let globalTracking: GlobalTracking;

    beforeEach(() => {
        globalTracking = {
            names: {},
            tcpRtt: {
                clients: {}
            }
        };
    });

    it("stores per-client RTT samples and fires extension updates", () => {
        const sample = tcpInfoSample(42000, 123456789);
        const client = makeClient();
        const updateEvent = jasmine.createSpy("clientTcpRttUpdateEvent");
        const monitor = makeMonitor(
            globalTracking,
            new FakeTcpRttProvider(sample),
            makeGlobalHandlers({
                rtt: {
                    name: "rtt",
                    version: "1",
                    author: "spec",
                    reloadable: false,
                    clientTcpRttUpdateEvent: updateEvent,
                }
            })
        );

        monitor.register(client);

        expect(client.tcpRtt).toEqual(sample);
        expect(globalTracking.tcpRtt.clients[client.ID].rttMs).toBe(42);
        expect(globalTracking.tcpRtt.clients[client.ID].clientRtt.rttMs).toBe(42);
        expect(globalTracking.tcpRtt.clients[client.ID].serverRtt.rttMs).toBe(42);
        expect(globalTracking.tcpRtt.clients[client.ID].overallRtt.rttMs).toBe(84);
        expect(globalTracking.tcpRtt.clients[client.ID].playerId).toBe(3);
        expect(updateEvent).toHaveBeenCalledWith(client, sample);

        monitor.close();
    });

    it("exports RTT to non-vanilla servers as DimensionsUpdate subtype 6", () => {
        const sample = tcpInfoSample(55000, 123456789);
        const client = makeClient();
        const monitor = makeMonitor(globalTracking, new FakeTcpRttProvider(sample));

        monitor.register(client);

        const sendDirect = client.server.sendDirect as jasmine.Spy;
        expect(sendDirect).toHaveBeenCalled();
        const packet = sendDirect.calls.mostRecent().args[0] as Buffer;
        const parsed = DimensionsUpdatePacket.parse(packet);
        if (parsed.TAG === "Error") {
            fail("Failed to parse RttUpdate");
            return;
        }

        const dimensionsUpdate = parsed._0;
        if (typeof dimensionsUpdate !== "object" || dimensionsUpdate.TAG !== "RttUpdate") {
            fail("Expected RttUpdate");
            return;
        }

        expect(dimensionsUpdate._0.playerId).toBe(3);
        expect(dimensionsUpdate._0.clientRttMicros).toBe(55000);
        expect(dimensionsUpdate._0.serverRttMicros).toBe(55000);
        expect(dimensionsUpdate._0.overallRttMicros).toBe(110000);
        expect(dimensionsUpdate._0.updatedAt).toBe(BigInt(123456789));

        monitor.close();
    });

    it("does not export RTT when the current routing server is vanilla", () => {
        const client = makeClient({
            server: {
                name: "vanilla",
                isVanilla: true,
                socket: {
                    destroyed: false,
                },
                sendDirect: jasmine.createSpy("sendDirect"),
            } as any
        });
        const monitor = makeMonitor(globalTracking, new FakeTcpRttProvider(tcpInfoSample(55000)));

        monitor.register(client);

        expect(client.server.sendDirect).not.toHaveBeenCalled();

        monitor.close();
    });
});
