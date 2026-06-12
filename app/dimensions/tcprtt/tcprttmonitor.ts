import * as winston from 'winston';
import { DimensionsUpdatePacket } from 'terraria-packet';
import Client from '../client.js';
import ErrorHelper from '../errorhelper.js';
import GlobalHandlers from '../globalhandlers.js';
import GlobalTracking from '../globaltracking.js';
import { TcpRttOptions } from '../configloader.js';
import NativeTcpRttProvider from './nativeprovider.js';
import TcpRttProvider from './provider.js';
import { combineTcpRttSamples, TcpRttClientSummary, TcpRttSample, unavailableTcpRttSample } from './types.js';

class TcpRttMonitor {
  private clients = new Map<string, Client>();
  private timer: NodeJS.Timeout | null = null;
  private unavailableReasonsLogged = new Set<string>();
  private provider: TcpRttProvider | null;

  constructor(
    private globalTracking: GlobalTracking,
    private globalHandlers: GlobalHandlers,
    private options: TcpRttOptions,
    private logging: winston.Logger,
    provider?: TcpRttProvider
  ) {
    this.provider = provider ?? null;
  }

  public register(client: Client): void {
    this.clients.set(client.ID, client);
    this.updateTracking(client);

    if (this.options.enabled) {
      this.sampleClient(client);
    }

    this.ensureTimer();
  }

  public unregister(client: Client): void {
    this.clients.delete(client.ID);
    delete this.globalTracking.tcpRtt.clients[client.ID];

    if (this.clients.size === 0) {
      this.stopTimer();
    }
  }

  public updateOptions(options: TcpRttOptions): void {
    this.options = options;
    if (!this.options.enabled) {
      this.stopTimer();
      for (const client of this.clients.values()) {
        const sample = unavailableTcpRttSample("TCP RTT disabled");
        client.setTcpRttSample(sample);
        client.setServerTcpRttSample(sample);
        client.setOverallTcpRttSample(sample);
        this.updateTracking(client);
      }
      return;
    }

    this.restartTimer();
  }

  public close(): void {
    this.stopTimer();
    this.clients.clear();
    this.globalTracking.tcpRtt.clients = {};
  }

  private ensureTimer(): void {
    if (!this.options.enabled || this.clients.size === 0 || this.timer !== null) {
      return;
    }

    this.timer = setInterval(() => {
      this.sampleAllClients();
    }, this.options.sampleIntervalMs);
    this.timer.unref();
  }

  private restartTimer(): void {
    this.stopTimer();
    this.ensureTimer();
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private sampleAllClients(): void {
    for (const client of this.clients.values()) {
      this.sampleClient(client);
    }
  }

  private sampleClient(client: Client): void {
    if (client.socket.destroyed) {
      this.unregister(client);
      return;
    }

    const clientRtt = this.getProvider().sample(client.socket);
    const serverRtt = this.sampleServerRtt(client);
    const overallRtt = combineTcpRttSamples(clientRtt, serverRtt);

    client.setTcpRttSample(clientRtt);
    client.setServerTcpRttSample(serverRtt);
    client.setOverallTcpRttSample(overallRtt);
    this.updateTracking(client);
    this.logUnavailableOnce("client", clientRtt);
    this.logUnavailableOnce("server", serverRtt);
    this.emitUpdate(client, clientRtt);

    if (this.options.exportToServers && clientRtt.available) {
      this.exportToServer(client, clientRtt, serverRtt, overallRtt);
    }
  }

  private sampleServerRtt(client: Client): TcpRttSample {
    if (!client.connected || client.server.socket.destroyed) {
      return unavailableTcpRttSample("Terraria server socket unavailable");
    }

    return this.getProvider().sample(client.server.socket);
  }

  private getProvider(): TcpRttProvider {
    if (this.provider === null) {
      this.provider = new NativeTcpRttProvider();
    }

    return this.provider;
  }

  private updateTracking(client: Client): void {
    const summary: TcpRttClientSummary = {
      id: client.ID,
      uuid: client.UUID,
      name: client.getName(),
      ip: client.ip,
      server: client.server.name,
      playerId: client.playerIdAssigned ? client.player.id : null,
      clientRtt: client.clientTcpRtt,
      serverRtt: client.serverTcpRtt,
      overallRtt: client.overallTcpRtt,
      ...client.clientTcpRtt,
    };
    this.globalTracking.tcpRtt.clients[client.ID] = summary;
  }

  private logUnavailableOnce(label: string, sample: TcpRttSample): void {
    if (sample.available) {
      return;
    }

    const reason = `${label}: ${sample.error ?? "TCP RTT unavailable"}`;
    if (this.unavailableReasonsLogged.has(reason)) {
      return;
    }

    this.unavailableReasonsLogged.add(reason);
    this.logging.warn(`TCP RTT unavailable: ${reason}`);
  }

  private emitUpdate(client: Client, sample: TcpRttSample): void {
    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.clientTcpRttUpdateEvent) {
        try {
          extension.clientTcpRttUpdateEvent(client, sample);
        } catch (error) {
          if (client.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} TCP RTT Update Event Error: ${ErrorHelper.toMessage(error)}`;
            client.logging.info(logMessage);
          }
        }
      }
    }
  }

  private exportToServer(client: Client, clientRtt: TcpRttSample, serverRtt: TcpRttSample, overallRtt: TcpRttSample): void {
    if (!client.playerIdAssigned || client.server.isVanilla || client.server.socket.destroyed) {
      return;
    }

    const updatedAt = Math.max(clientRtt.updatedAt ?? 0, serverRtt.updatedAt ?? 0, overallRtt.updatedAt ?? 0);
    const packetData = DimensionsUpdatePacket.toBuffer({
      TAG: "RttUpdate",
      _0: {
        playerId: client.player.id,
        clientRttMicros: this.packRttMicros(clientRtt),
        serverRttMicros: this.packRttMicros(serverRtt),
        overallRttMicros: this.packRttMicros(overallRtt),
        updatedAt: BigInt(updatedAt),
      },
    });

    if (packetData.TAG === "Error") {
      this.logging.error(`Failed to export TCP RTT update packet: ${ErrorHelper.toMessage(packetData._0.error)}`);
      return;
    }

    client.server.sendDirect(packetData._0);
  }

  private packRttMicros(sample: TcpRttSample): number {
    return sample.rttMicros === null ? -1 : Math.round(sample.rttMicros);
  }
}

export { unavailableTcpRttSample };
export default TcpRttMonitor;
