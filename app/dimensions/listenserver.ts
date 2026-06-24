import * as Net from 'net';
import { v4 as uuidv4 } from 'uuid';
import RawPacket from './packets/rawpacket.js';
import { getProperIP } from './utils.js';
import Client from './client.js';
import ClientArgs from './clientargs.js';
import ServerDetails from './serverdetails.js';
import GlobalHandlers from './globalhandlers.js';
import { ConfigListenServer, ConfigOptions } from './configloader.js';
import RoutingServer from './routingserver.js';
import Blacklist from './blacklist.js';
import GlobalTracking from './globaltracking.js';
import ListenServerArgs from './listenserverargs.js';
import NetworkText from '@popstarfreas/packetfactory/networktext';
import StringUtils from './stringutils.js';
import ErrorHelper from './errorhelper.js';
import BlacklistCheckClient from './blacklistcheckclient.js';
import * as winston from 'winston';
import { RawSocketWriteContext, RawSocketWriteReason } from './extension/index.js';
import { DisconnectPacket, StatusPacket } from 'terraria-packet';
import { ConnectionRateLimitEntry } from './listenserverargs.js';
import {
  DisconnectReason,
  DisconnectReasonCodes,
  formatDisconnectReason,
  makeDisconnectReason,
} from './disconnectreason.js';
import TcpRttMonitor from './tcprtt/tcprttmonitor.js';

const FORCE_SOCKET_CLOSE_TIMEOUT_MS = 3000;

/**
 * Listens on a specified port and routes users balancing amounts between routing servers it handles
 */
export class ListenServer {
  public clients: Client[];
  /** The clients that are currently being checked for whether they are blacklisted */
  public checkingClients: BlacklistCheckClient[];
  public servers: { [id: string]: RoutingServer };
  private options: ConfigOptions;
  private port: number;
  private routingServers: RoutingServer[];
  private serversDetails: { [id: string]: ServerDetails };
  private globalHandlers: GlobalHandlers;
  private server: Net.Server;
  private globalTracking: GlobalTracking;
  private logging: winston.Logger;
  private blacklist?: Blacklist;
  private connectionsTracker: Map<string, number>;
  private connectRateTracker: Map<string, ConnectionRateLimitEntry>;
  private tcpRttMonitor?: TcpRttMonitor;
  private limiterInterval: NodeJS.Timeout | null = null;

  ServerHandleError: (error: Error) => void;
  ServerHandleStart: () => void;

  constructor(args: ListenServerArgs) {
    this.clients = [];
    this.checkingClients = [];
    this.servers = args.servers;
    this.options = args.options;
    this.port = args.info.listenPort;
    this.routingServers = args.info.routingServers;
    this.serversDetails = args.serversDetails;
    this.globalHandlers = args.globalHandlers;
    this.globalTracking = args.globalTracking;
    this.logging = args.logging;
    this.blacklist = args.blacklist;
    this.connectionsTracker = args.connectionsTracker;
    this.connectRateTracker = args.connectRateTracker;
    this.tcpRttMonitor = args.tcpRttMonitor;

    for (var i = 0; i < this.routingServers.length; i++) {
      this.serversDetails[this.routingServers[i].name] = {
        clientCount: 0,
        disabled: false,
        disabledTimeout: null,
        failedConnAttempts: 0
      };
    }


    this.ServerHandleError = this.handleError.bind(this);
    this.ServerHandleStart = this.handleStart.bind(this);

    // Listen Server
    this.server = Net.createServer();
    this.server.on('connection', (socket) => {
      this.handleSocket(socket)
        .catch((e) => {
          if (this.options.log.clientError) {
            this.logging.error(`Socket Error: ${ErrorHelper.toMessage(e)}`);
          }
        });
    });
    this.server.listen(this.port, this.ServerHandleStart);
    this.server.on('error', this.ServerHandleError);

    if (this.options.connectionRateLimit.enabled) {
      this.startConnectionRateLimitTimer();
    }
  }

  private startConnectionRateLimitTimer() {
    this.limiterInterval = setInterval(() => {
      this.clearExpiredConnectionRateLimitEntries();
    }, 1000);
  }

  private clearExpiredConnectionRateLimitEntries(now = Date.now()): void {
    for (const [ip, entry] of this.connectRateTracker) {
      if (entry.expiresAtMs <= now) {
        this.connectRateTracker.delete(ip);
      }
    }
  }

  /**
   * Finds server with lowest client count
   *
   * @return Either a found routing server or null if one was not found
   */
  private chooseServer(): RoutingServer | null {
    let chosenServer: RoutingServer | null = null;
    let currentClientCount: number | null = null;
    let details: ServerDetails;
    for (let i: number = 0; i < this.routingServers.length; i++) {
      details = this.serversDetails[this.routingServers[i].name];

      // Even if the server has been disabled, if we have no current choice, we must use it
      if (!details.disabled || currentClientCount === null) {
        // Favour either lower player count or non-disability
        if (currentClientCount === null || chosenServer === null || details.clientCount < currentClientCount || this.serversDetails[chosenServer.name].disabled) {
          chosenServer = this.routingServers[i];
          currentClientCount = details.clientCount;
        }
      }
    }

    return chosenServer;
  }

  /**
   * Replaces the current blacklist with a new instance
   */
  public loadNewBlacklist(blacklist: Blacklist) {
    this.blacklist = blacklist;
  }

  /**
   * Updates this listen server with its new ownership of routing servers
   *
   * @param info The server configuration containing the routing servers for this listen server
   */
  public updateInfo(info: ConfigListenServer): void {
    this.port = info.listenPort;
    this.routingServers = info.routingServers;

    // Reset disabled and failedConnAttempts but only
    // reset counts if it didn't already exist as a server
    let details: ServerDetails;
    for (let i = 0; i < this.routingServers.length; i++) {
      if (this.serversDetails[this.routingServers[i].name]) {
        details = this.serversDetails[this.routingServers[i].name]
        details.disabled = false;
        details.failedConnAttempts = 0;
      } else {
        this.serversDetails[this.routingServers[i].name] = {
          clientCount: 0,
          disabled: false,
          disabledTimeout: null,
          failedConnAttempts: 0
        };
      }
    }
  }

  /**
   * Destroys all client sockets connected, removing any listeners and resets counts for any servers
   */
  public shutdown(): void {
    this.logging.info(`Server on ${this.port} is now shutting down.`);
    for (let i: number = 0; i < this.clients.length; i++) {
      this.clients[i].server.socket.removeListener('data', this.clients[i].ServerHandleData);
      this.clients[i].server.socket.removeListener('error', this.clients[i].ServerHandleError);
      this.clients[i].server.socket.removeListener('close', this.clients[i].ServerHandleClose);
      this.tcpRttMonitor?.unregister(this.clients[i]);
      this.clients[i].disconnect(this.options.language.phrases.close);
    }
    this.clients = [];
    this.server.removeListener('error', this.ServerHandleError);
    this.server.close();

    // Reset counts
    let details: ServerDetails;
    for (var i = 0; i < this.routingServers.length; i++) {
      details = this.serversDetails[this.routingServers[i].name];
      details.clientCount = 0;
    }

    if (this.limiterInterval !== null) {
      clearInterval(this.limiterInterval);
    }
  }

  /**
   * Logs that the server was started
   */
  private handleStart(): void {
    this.logging.info(`Server on ${this.port} started.`);
  }

  /**
   * Writes to a socket with extension hook support.
   * Used for writes that occur before a Client object exists.
   */
  private prepareSocketPacketWithHooks(
    socket: Net.Socket,
    packet: Buffer,
    reason: RawSocketWriteContext['reason'],
    clientArgs?: ClientArgs
  ): { context: RawSocketWriteContext, packetWrapper: { packet: Buffer } } | null {
    const context: RawSocketWriteContext = {
      socket: socket,
      remoteAddress: socket.remoteAddress,
      reason: reason,
      clientArgs: clientArgs
    };
    const packetWrapper = { packet: packet };

    // Run pre-handlers
    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.rawSocketWritePreHandler) {
        try {
          const blocked = extension.rawSocketWritePreHandler(context, packetWrapper);
          if (blocked) {
            return null;
          }
        } catch (error) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} RawSocketWrite Pre Handler Error: ${ErrorHelper.toMessage(error)}`;
            this.logging.info(logMessage);
          }
        }
      }
    }

    return { context, packetWrapper };
  }

  private runRawSocketWritePostHandlers(
    context: RawSocketWriteContext,
    packetWrapper: { packet: Buffer }
  ): void {
    // Run post-handlers
    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.rawSocketWritePostHandler) {
        try {
          extension.rawSocketWritePostHandler(context, packetWrapper);
        } catch (error) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} RawSocketWrite Post Handler Error: ${ErrorHelper.toMessage(error)}`;
            this.logging.info(logMessage);
          }
        }
      }
    }
  }

  /**
   * Sends the client the disconnect packet and then drops the connection
   *
   * @param socket The socket to disconnect
   * @param reason The reason to disconnect the client
   */
  private disconnectClient(
    socket: Net.Socket,
    reason: string,
    hookReason: RawSocketWriteContext['reason'] = RawSocketWriteReason.Other,
    disconnectReason: DisconnectReason = makeDisconnectReason(DisconnectReasonCodes.RawSocketDisconnect, reason)
  ): void {
    let kickPacket = DisconnectPacket.toBuffer({
      reason: new NetworkText(0, reason)
    })

    if (!socket.destroyed) {
      const ip = socket.remoteAddress;
      this.logDimensionsDisconnect(ip, "pre-client", "unknown", disconnectReason);

      switch (kickPacket.TAG) {
        case "Ok":
          const prepared = this.prepareSocketPacketWithHooks(socket, kickPacket._0, hookReason);
          if (prepared === null) {
            socket.destroy();
            return;
          }

          const forceCloseTimeout = setTimeout(() => {
            if (!socket.destroyed) {
              socket.destroy();
            }
          }, FORCE_SOCKET_CLOSE_TIMEOUT_MS);
          forceCloseTimeout.unref?.();
          socket.once('close', () => {
            clearTimeout(forceCloseTimeout);
          });

          if (socket.writable) {
            const packet = this.withPreDisconnectStatusClear(prepared.packetWrapper.packet, hookReason);
            socket.end(packet);
            this.runRawSocketWritePostHandlers(prepared.context, prepared.packetWrapper);
          } else {
            socket.destroy();
          }
          break;
        case "Error":
          this.logging.error(`Error creating disconnect packet: ${kickPacket._0}`);
          socket.destroy();
          break;
      }
    }
  }

  private withPreDisconnectStatusClear(packet: Buffer, hookReason: RawSocketWriteContext['reason']): Buffer {
    if (hookReason !== RawSocketWriteReason.BlacklistCheck) {
      return packet;
    }

    const statusPacket = StatusPacket.toBuffer({
      max: 0,
      text: new NetworkText(0, ""),
      flags: {
        hideStatusTextPercent: true,
        statusTextHasShadows: false,
        runCheckBytes: false
      }
    });

    switch (statusPacket.TAG) {
      case "Ok":
        return Buffer.concat([statusPacket._0, packet]);
      case "Error":
        this.logging.error(`Error creating status clear packet: ${statusPacket._0}`);
        return packet;
    }
  }

  /**
   * Decrements the number of connections in the tracker for a socket's remote address
   *
   * @param socket The socket that is being disconnected
   */
  private decrementConnectionTracker(ip: string): void {
    if (this.options.connectionLimit.enabled) {
      const count = this.connectionsTracker.get(ip);
      if (typeof count !== "undefined") {
        if (count === 1) {
          this.connectionsTracker.delete(ip);
        } else {
          this.connectionsTracker.set(ip, count - 1);
        }
      }
    }
  }

  /**
   * Gets a server to connect to for a new socket connection, sets up the appropriate handlers
   * and checks if their IP is blacklisted
   *
   * @param socket The socket of a new client
   */
  private async handleSocket(socket: Net.Socket): Promise<void> {
    const socketIp = socket.remoteAddress;

    if (this.options.connectionLimit.enabled && this.enforceConnectionLimit(socket)) {
      socket.removeAllListeners();
      return;
    }

    if (this.options.connectionRateLimit.enabled && this.enforceConnectionRateLimit(socket)) {
      // If connectionLimit accepted this socket first, rollback its tracker entry
      // when rate limit later rejects the same connection.
      if (this.options.connectionLimit.enabled && typeof socketIp !== "undefined") {
        this.decrementConnectionTracker(socketIp);
      }
      socket.removeAllListeners();
      return;
    }

    try {
      for (const extension of Object.values(this.globalHandlers.extensions)) {
        if (extension.socketConnectPreHandler) {
          try {
            const handled = await extension.socketConnectPreHandler(socket);
            if (handled) {
              return;
            }
          } catch (error) {
            if (this.options.log.extensionError) {
              const name = extension.name ?? "unknown";
              const logMessage = `[${process.pid}] Extension ${name} Socket Connect Pre Handler Error: ${ErrorHelper.toMessage(error)}`;
              this.logging.info(logMessage);
            }
          }
        }
      }
    }
    catch (error) {
      console.log(error);
    }

    this.setupNewSocket(socket);

    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.socketConnectPostHandler) {
        try {
          extension.socketConnectPostHandler(socket);
        } catch (error) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} Socket Connect Post Handler Error: ${ErrorHelper.toMessage(error)}`;
            this.logging.info(logMessage);
          }
        }
      }
    }
  }

  private enforceConnectionLimit(socket: Net.Socket): boolean {
    let connectionDropped = false;
    const ip = socket.remoteAddress;
    if (typeof ip === "undefined") {
      return connectionDropped;
    }

    const counter = this.connectionsTracker.get(ip);
    if (typeof counter !== "undefined") {
      if (counter + 1 > this.options.connectionLimit.connectionLimitPerIP) {
        this.disconnectClient(
          socket,
          StringUtils.format(this.options.connectionLimit.kickReason, this.options.connectionLimit.connectionLimitPerIP),
          RawSocketWriteReason.ConnectionLimitExceeded,
          makeDisconnectReason(
            DisconnectReasonCodes.ConnectionLimitExceeded,
            `connection limit exceeded: ${this.options.connectionLimit.connectionLimitPerIP}`
          )
        );
        connectionDropped = true;
      } else {
        this.connectionsTracker.set(ip, counter + 1);
      }
    } else {
      this.connectionsTracker.set(ip, 1);
    }

    return connectionDropped;
  }

  private enforceConnectionRateLimit(socket: Net.Socket): boolean {
    let connectionDropped = false;
    const ip = socket.remoteAddress;
    if (typeof ip === "undefined") {
      return connectionDropped;
    }

    const now = Date.now();
    const windowMs = this.options.connectionRateLimit.connectionRateLimitWindowSeconds * 1000;
    const countLimit = this.options.connectionRateLimit.connectionRateLimitPerIP;
    const countWindow = `${countLimit}/${this.options.connectionRateLimit.connectionRateLimitWindowSeconds}s`;
    const entry = this.connectRateTracker.get(ip);

    if (typeof entry === "undefined" || entry.expiresAtMs <= now) {
      this.connectRateTracker.set(ip, {
        count: 1,
        expiresAtMs: now + windowMs,
      });
      return connectionDropped;
    }

    if (entry.count + 1 > countLimit) {
      this.disconnectClient(
        socket,
        this.options.language.phrases.connectionRateLimitExceeded,
        RawSocketWriteReason.Other,
        makeDisconnectReason(
          DisconnectReasonCodes.ConnectionRateLimitExceeded,
          `connection rate limit exceeded: ${countWindow}`
        )
      );
      connectionDropped = true;
    } else {
      entry.count += 1;
    }

    return connectionDropped;
  }

  /**
   * Checks there is a server available and then sets up listeners and a client object for
   * the socket. Also checking if the ip address of this socket is blacklisted.
   */
  private async setupNewSocket(socket: Net.Socket): Promise<void> {
    const socketIp = socket.remoteAddress;
    let chosenServer: RoutingServer | null = this.chooseServer();
    if (chosenServer === null) {
      this.logging.warn(`No servers available for ListenServer[Port: ${this.port}]`);
      this.disconnectClient(
        socket,
        this.options.language.phrases.noServersAvailable,
        RawSocketWriteReason.Other,
        makeDisconnectReason(DisconnectReasonCodes.NoServersAvailable, "no routing servers available")
      );
      if (typeof socketIp !== "undefined") {
        this.decrementConnectionTracker(socketIp);
      }
      return;
    }

    // Try using no delay (no buffering of data); maybe set to config option
    if (this.options.socketNoDelay) {
      socket.setNoDelay(true);
    }

    let clientArgs: ClientArgs = {
      id: uuidv4(),
      socket: socket,
      server: chosenServer,
      serversDetails: this.serversDetails,
      globalHandlers: this.globalHandlers,
      servers: this.servers,
      options: this.options,
      globalTracking: this.globalTracking,
      logging: this.logging
    };

    // When the blacklist is enabled, clients must first send their initial data
    // and then get checked before they are allowed to connect to a server
    if (this.options.blacklist.enabled && this.blacklist) {
      const configuration = this.options.blacklist;
      let client = new BlacklistCheckClient({
        blacklist: this.blacklist,
        clientArgs,
      });

      client.setupCallbacks({
        clientAcceptedCb: (bufferPacket: Buffer, packetsReceived: RawPacket[]) => {
          const index = this.checkingClients.indexOf(client);
          if (index > -1) {
            this.checkingClients.splice(index, 1);
          }
          this.setupNewClient(clientArgs, bufferPacket, packetsReceived);
        },
        clientBlacklistedCb: () => {
          const index = this.checkingClients.indexOf(client);
          if (index > -1) {
            this.checkingClients.splice(index, 1);
          }
          this.kickBlacklisted(clientArgs);
        },
        errorCheckingBlacklistCb: (bufferPacket: Buffer, packetsReceived: RawPacket[], e: Error) => {
          this.logging.error(`Error checking blacklist: ${ErrorHelper.toMessage(e)}`);
          if (configuration.errorPolicy === "DenyJoining") {
            const index = this.checkingClients.indexOf(client);
            if (index > -1) {
              this.checkingClients.splice(index, 1);
            }
            this.disconnectClient(
              socket,
              this.options.language.phrases.blacklistCheckError,
              RawSocketWriteReason.BlacklistCheck,
              makeDisconnectReason(DisconnectReasonCodes.BlacklistCheckError, ErrorHelper.toMessage(e))
            );
          } else {
            const index = this.checkingClients.indexOf(client);
            if (index > -1) {
              this.checkingClients.splice(index, 1);
            }
            this.setupNewClient(clientArgs, bufferPacket, packetsReceived);
          }
        },
        packetErrorCheckingBlacklistCb: (e: Error) => {
          this.logging.error(`Packet error checking blacklist: ${ErrorHelper.toMessage(e)}`);
          const index = this.checkingClients.indexOf(client);
          if (index > -1) {
            this.checkingClients.splice(index, 1);
          }
          this.disconnectClient(
            socket,
            this.options.language.phrases.blacklistCheckError,
            RawSocketWriteReason.BlacklistCheck,
            makeDisconnectReason(DisconnectReasonCodes.BlacklistCheckError, ErrorHelper.toMessage(e))
          );
        },
        disconnectCb: () => {
          const index = this.checkingClients.indexOf(client);
          if (index > -1) {
            this.checkingClients.splice(index, 1);
          }
          if (typeof socketIp !== "undefined") {
            this.decrementConnectionTracker(socketIp);
          }
        }
      });
      this.checkingClients.push(client);
    } else {
      this.setupNewClient(clientArgs, undefined, []);
    }
  }

  private setupNewClient(clientArgs: ClientArgs, bufferPacket: Buffer | undefined, packetsAlreadyReceived: RawPacket[]): Client {
    let client = new Client(clientArgs);
    this.clients.push(client);

    if (this.options.log.clientConnect) {
      this.logging.info(`[Client: ${getProperIP(client.socket.remoteAddress)} connected [${clientArgs.server.name}: ${this.serversDetails[clientArgs.server.name].clientCount + 1}]`);
    }

    this.hookSocketError(client.socket, client);
    this.hookSocketTimeout(client.socket, client);
    this.hookSocketClose(client.socket, client);

    this.hookSocketData(client.socket, client);
    client.handleDataSend(Buffer.concat(packetsAlreadyReceived.map((packet) => packet.data)));
    if (bufferPacket !== undefined) {
      client.handleDataSend(bufferPacket);
    }
    this.tcpRttMonitor?.register(client);
    this.extensionClientConnectEvent(client);
    return client;
  }

  /**
   * Checks the blacklist to see if the ip is blacklisted, and will disconnect the socket if they are
   *
   * @param client The client to check the information against the blacklist
   * @return Whether or not the ip is blacklisted
   */
  private kickBlacklisted(client: ClientArgs): void {
    this.disconnectClient(
      client.socket,
      this.options.language.phrases.blacklisted,
      RawSocketWriteReason.BlacklistCheck,
      makeDisconnectReason(DisconnectReasonCodes.Blacklisted, "client is blacklisted")
    );

    if (this.options.log.clientBlocked) {
      this.logging.info(`${process.pid}] Client: ${getProperIP(client.socket.remoteAddress)} was blocked from joining.`);
    }
  }

  /**
   * Hook the socket error and pass it into the client object
   *
   * @param socket The socket of the client to listen for errors on
   * @param client The client object associated with the socket
   */
  private hookSocketError(socket: Net.Socket, client: Client): void {
    socket.once('error', (e: Error) => {
      try {
        client.handleError(e);
      } catch (e) {
        if (this.options.log.clientError) {
          this.logging.error(`handleError Error: ${ErrorHelper.toMessage(e)}`)
        }
      }
    });
  }

  /**
   *  Simply destroys any sockets that have triggered the timeout
   *
   * @param socket The socket of the client to listen for timeouts on
   * @param client The client object associated with the socket
   */
  private hookSocketTimeout(socket: Net.Socket, client: Client): void {
    socket.once('timeout', () => {
      client.setDimensionsDisconnectReason(makeDisconnectReason(
        DisconnectReasonCodes.ClientSocketTimeout,
        "client socket timed out"
      ));
      if (this.options.log.clientTimeouts) {
        this.logging.warn(`Socket Timeout: ${client.getName()} ${client.ID}`);
      }
      socket.destroy();
    });
  }

  private extensionClientConnectEvent(client: Client) {
    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.clientConnectEvent) {
        try {
          extension.clientConnectEvent(client);
        } catch (error) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} Connect Event Error: ${ErrorHelper.toMessage(error)}`;
            this.logging.info(logMessage);
          }
        }
      }
    }
  }

  private extensionClientDisconnectEvent(client: Client) {
    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.clientDisconnectEvent) {
        try {
          extension.clientDisconnectEvent(client);
        } catch (error) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} Disconnect Event Error: ${ErrorHelper.toMessage(error)}`;
            this.logging.info(logMessage);
          }
        }
      }
    }
  }

  private extensionSocketClosePreHandlers(socket: Net.Socket, client: Client): boolean {
    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.socketClosePreHandler) {
        try {
          const handled = extension.socketClosePreHandler(socket, client);
          if (handled) {
            return true;
          }
        } catch (e) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} Disconnect Pre Handler Error: ${ErrorHelper.toMessage(e)}`;
            this.logging.info(logMessage);
          }
        }
      }
    }

    return false;
  }

  private extensionSocketClosePostHandlers(socket: Net.Socket, client: Client) {
    for (const extension of Object.values(this.globalHandlers.extensions)) {
      if (extension.socketClosePostHandler) {
        try {
          extension.socketClosePostHandler(socket, client);
        } catch (e) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} Disconnect Post Handler Error: ${ErrorHelper.toMessage(e)}`;
            this.logging.info(logMessage);
          }
        }
      }
    }
  }

  private getClientCountAfterDisconnect(client: Client): number | "unknown" {
    const details = this.serversDetails[client.server.name];
    if (!details) {
      return "unknown";
    }

    const pendingDecrement = client.countIncremented ? 1 : 0;
    return Math.max(0, details.clientCount - pendingDecrement);
  }

  private logDimensionsDisconnect(
    ip: string | undefined,
    serverName: string,
    clientCount: number | "unknown",
    reason: DisconnectReason
  ): void {
    if (!this.options.log.clientDisconnect) {
      return;
    }

    const clientIp = getProperIP(ip) ?? "unknown";
    const logMessage = `[${process.pid}] Client: ${clientIp} disconnected from Dimensions (${formatDisconnectReason(reason)}) ${serverName}: ${clientCount}]`;
    this.logging.info(logMessage, {
      disconnectScope: "dimensions",
      reasonCode: reason.code,
      reasonDetail: reason.detail,
      clientIp,
      serverName,
      clientCount,
    });
  }

  /**
   * Hook the socket close and pass it into the client object
   *
   * @param socket The socket of the client to listen for closing on
   * @param client The client object associated with the socket
   */
  private hookSocketClose(socket: Net.Socket, client: Client): void {
    socket.once('close', () => {
      if (this.extensionSocketClosePreHandlers(socket, client)) {
        return;
      }

      try {
        const ip = client.ip || socket.remoteAddress;
        if (typeof ip !== "undefined") {
          this.decrementConnectionTracker(ip);
        }
        if (this.options.log.clientDisconnect) {
          const serverName = client.server.name || "unknown";
          this.logDimensionsDisconnect(ip, serverName, this.getClientCountAfterDisconnect(client), client.getDimensionsDisconnectReason());
        }
        this.tcpRttMonitor?.unregister(client);
        client.handleClose();
        for (let i: number = 0; i < this.clients.length; i++) {
          if (this.clients[i].ID === client.ID) {
            this.clients.splice(i, 1);
            break;
          }
        }
      } catch (e) {
        if (this.options.log.clientError) {
          this.logging.error(`SocketCloseEvent ERROR: ${ErrorHelper.toMessage(e)}`);
        }
      }

      socket.removeAllListeners();
      this.extensionSocketClosePostHandlers(socket, client);
      this.extensionClientDisconnectEvent(client);
    });
  }

  /**
   * Hook the socket data and pass it into the client object
   *
   * @param socket The socket of the client to listen for data on
   * @param client The client object associated with the socket
   */
  private hookSocketData(socket: Net.Socket, client: Client): void {
    socket.on('data', (data: Buffer) => {
      try {
        client.handleDataSend(data);
      } catch (e) {
        if (this.options.log.clientError) {
          this.logging.error(`HandleDataSend ERROR: ${ErrorHelper.toMessage(e)}`);
        }
      }
    });

    socket.setTimeout(this.options.socketTimeout);
  }

  /**
   * Handles when an error event occurs for this listen server
   *
   * @param error The error object containing the error information
   */
  private handleError(error: Error) {
    this.logging.error(` Server on ${this.port} encountered an error: ${ErrorHelper.toMessage(error)}.`);
  }
}

export default ListenServer;
