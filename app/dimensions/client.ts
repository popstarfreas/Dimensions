import Player from './player.js';
import TerrariaServer from './terrariaserver.js';
import * as Net from 'net';
import { ConfigOptions } from './configloader.js';
import PacketTypes from './packettypes.js';
import ClientPacketHandler from './clientpackethandler.js';
import RoutingServer from './routingserver.js';
import GlobalHandlers from './globalhandlers.js';
import ServerDetails from './serverdetails.js';
import RoutingInformation from './routinginformation.js';
import { getPacketsFromBuffer, BuffersPackets } from './utils.js';
import RawPacket from './packets/rawpacket.js';
import ChangeServerOptions from './changeserveroptions.js';
import GlobalTracking from './globaltracking.js';
import ClientState from './clientstate.js';
import ClientArgs from './clientargs.js';
import ErrorHelper from './errorhelper.js';
import ClearUtils from './clearutils.js';
import { PacketSource } from './terrariaserverpackethandler.js';
import * as winston from 'winston';
import PacketWriter from '@popstarfreas/packetfactory/packetwriter';
import {
  clientSocketErrorReason,
  detailFromDisconnectMessage,
  DisconnectReason,
  DisconnectReasonCodes,
  makeDisconnectReason,
} from './disconnectreason.js';
import { TcpRttSample, unavailableTcpRttSample } from './tcprtt/types.js';

import { DisconnectPacket, NetModuleLoadPacket, PlayerBuffAddPacket } from 'terraria-packet';
import NetworkText from '@popstarfreas/packetfactory/networktext';

interface PacketQueueItem {
  rawPacket: RawPacket,
}

/**
 * This class handles switching servers and passing data of a single client
 */
class Client {
  private static readonly FORCE_DISCONNECT_TIMEOUT_MS = 3000;
  public ID: string;
  public options: ConfigOptions;
  public servers: { [id: string]: RoutingServer };
  public socket: Net.Socket;
  public ip: string;
  public player: Player;
  public globalHandlers: GlobalHandlers;
  public server: TerrariaServer;
  public connected: boolean;
  public state: ClientState;
  private initialConnectionAlreadyCreated: boolean;
  public ingame: boolean;
  public disconnecting: boolean;
  public UUID: string;
  public waitingCharacterRestore: boolean;
  public wasKicked: boolean;
  public routingInformation: RoutingInformation | null;
  public countIncremented: boolean;
  public serversDetails: { [id: string]: ServerDetails };
  public preventSpawnOnJoin: boolean;
  public packetQueue: PacketQueueItem[];
  public logging: winston.Logger;
  public version: string;
  public tcpRtt: TcpRttSample;
  public clientTcpRtt: TcpRttSample;
  public serverTcpRtt: TcpRttSample;
  public overallTcpRtt: TcpRttSample;
  public playerIdAssigned: boolean;
  private globalTracking: GlobalTracking;
  private bufferPacket: Buffer;
  private extraJoinInformation: string | undefined;
  private disconnectTimeout: NodeJS.Timeout | null;
  private dimensionsDisconnectReason: DisconnectReason | null;

  // Queued packets while connecting to a server
  private queuedPacketsWhileConnecting: RawPacket[] = [];

  ServerHandleError: (error: Error) => void;
  ServerHandleData: (data: Buffer) => void;
  ServerHandleClose: () => void;

  constructor(args: ClientArgs) {
    this.ID = args.id;

    // Options from the config
    this.options = args.options;

    // Tracking Information
    this.globalTracking = args.globalTracking;

    // TerrariaServer information available for connecting to
    this.servers = args.servers;

    // The socket connection to the net server associated with this client
    this.socket = args.socket;

    // The unformatted ip address for the current socket connection to the net server
    this.ip = args.socket.remoteAddress as string;

    // This clients player object which can be used
    // for storing inventory and other player information
    this.player = new Player(this);

    // Global Handlers object whose contents may be updated (reloaded/refreshed)
    this.globalHandlers = args.globalHandlers;

    // For logging errors/info
    this.logging = args.logging;

    // TerrariaServer socket connection and packet handler
    this.server = new TerrariaServer(new Net.Socket(), this);
    this.server.ip = args.server.serverIP;
    this.server.port = args.server.serverPort;
    this.server.name = args.server.name;
    this.server.isVanilla = args.server.isVanilla;

    // Current connection state to TerrariaServer
    this.connected = false;

    // Connection State
    // 0 => Fresh Connection
    // 1 => Finished Sending Inventory
    // 2 => Connection to new server established (extra packet help required because of the actual clients state
    //      being incapable of sending certain packets)
    // 3 => Packet Help sent  Get Section/Request Sync [8] packet in response to world info [7], now waiting on Update Shield Strengths [101]
    // 4 => Spawned on server / Completed Server switch
    // 5 => Disconnected from a terraria server
    this.state = ClientState.FreshConnection;

    // Incomplete packet from last data received. This is used because all packets are inspected
    this.bufferPacket = Buffer.allocUnsafe(0);

    // This is used to make the first connection to a TerrariaServer after receiving data
    this.initialConnectionAlreadyCreated = false;

    // A boolean of whether the current client has made it in-game (they can see minimap, world, tiles, their inventory)
    this.ingame = false;
    this.disconnecting = false;

    // UUID of client
    this.UUID = "";

    this.waitingCharacterRestore = false;

    // A boolean indicating that the socket was closed because the client was booted from the TerrariaServers
    // This is set to false again after the close handler has been run
    this.wasKicked = false;

    // Information to the server about a type of join (gamemode)
    this.routingInformation = null;

    // Whether or not count was incremented
    // this will be turned off when we minus from count
    this.countIncremented = false;

    // The counts of all TerrariaServers available
    this.serversDetails = args.serversDetails;

    this.preventSpawnOnJoin = false;

    this.ServerHandleError = this.server.handleError.bind(this.server);
    this.ServerHandleData = this.server.handleData.bind(this.server);
    this.ServerHandleClose = this.server.handleClose.bind(this.server);

    // Packets that have been queued as they were sent at the wrong time
    // are stored in the packetQueue
    this.packetQueue = [];

    this.version = "unknown";
    this.disconnectTimeout = null;
    this.dimensionsDisconnectReason = null;
    this.tcpRtt = unavailableTcpRttSample();
    this.clientTcpRtt = this.tcpRtt;
    this.serverTcpRtt = unavailableTcpRttSample();
    this.overallTcpRtt = unavailableTcpRttSample();
    this.playerIdAssigned = false;
  }

  /**
   * Gets the packet handler for this client
   * 
   * @return The packet handler 
   */
  public getPacketHandler(): ClientPacketHandler {
    return this.globalHandlers.clientPacketHandler;
  }

  public setTcpRttSample(sample: TcpRttSample): void {
    this.tcpRtt = sample;
    this.clientTcpRtt = sample;
  }

  public setServerTcpRttSample(sample: TcpRttSample): void {
    this.serverTcpRtt = sample;
  }

  public setOverallTcpRttSample(sample: TcpRttSample): void {
    this.overallTcpRtt = sample;
  }

  public sendExtraInformation(): void {
    if (this.extraJoinInformation) {
      this.server.sendDirect(new PacketWriter()
        .setType(PacketTypes.DimensionsUpdate)
        .packInt16(5)
        .packString(this.extraJoinInformation)
        .data);
    }
  }

  /**
   * Sends the disconnect packet and then closes the socket
   *
   * @param reason The reason for the disconnect
   */
  public disconnect(reason: NetworkText | string) {
    if (this.disconnecting || this.socket.destroyed) {
      return;
    }

    this.setDimensionsDisconnectReason(makeDisconnectReason(
      DisconnectReasonCodes.DimensionsDisconnectPacket,
      detailFromDisconnectMessage(reason)
    ));

    if (typeof reason === 'string') {
      reason = new NetworkText(0, reason);
    }

    let disconnect = DisconnectPacket.toBuffer({
      reason: reason
    })

    switch (disconnect.TAG) {
      case "Ok":
        this.disconnecting = true;
        this.connected = false;
        this.socket.pause();
        this.scheduleForcedDisconnect();

        if (this.socket.writable) {
          this.socket.end(disconnect._0);
          this.notifySendPacketToClientEvent(disconnect._0);
        } else {
          this.socket.destroy();
        }
        break;
      case "Error":
        this.logging.error(`Error creating disconnect packet: ${disconnect._0}`);
        this.disconnecting = true;
        this.connected = false;
        this.socket.destroy();
        break;
    }
  }

  private scheduleForcedDisconnect(): void {
    this.clearForcedDisconnect();
    this.disconnectTimeout = setTimeout(() => {
      if (!this.socket.destroyed) {
        this.socket.destroy();
      }
      this.disconnectTimeout = null;
    }, Client.FORCE_DISCONNECT_TIMEOUT_MS);
    this.disconnectTimeout.unref?.();
  }

  private clearForcedDisconnect(): void {
    if (this.disconnectTimeout !== null) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
  }

  public setDimensionsDisconnectReason(reason: DisconnectReason, overwrite = false): void {
    if (overwrite || this.dimensionsDisconnectReason === null) {
      this.dimensionsDisconnectReason = reason;
    }
  }

  public getDimensionsDisconnectReason(): DisconnectReason {
    return this.dimensionsDisconnectReason ?? makeDisconnectReason(
      DisconnectReasonCodes.ClientSocketClosed,
      "client socket closed"
    );
  }

  /**
   * Updates the stored name for this client. Will disconnect them if they try
   * to use a name already in use.
   * 
   * @param name The name they are wanting to use
   */
  public setName(name: string): void {
    if (this.player.name === name) {
      return;
    }

    // Only change when the name is not in use by another client
    if (this.globalTracking.names[name]) {
      this.disconnect(this.options.language.phrases.nameAlreadyOnServer.replace("${name}", name));
      return;
    }

    if (name.length < 2 || name.length > 20) {
      this.disconnect(this.options.language.phrases.characterNameLengthOutOfRange);
      return;
    }

    if (this.player.name !== "") {
      delete this.globalTracking.names[this.player.name];
    }

    this.player.name = name;

    if (name !== "") {
      this.globalTracking.names[name] = true;
    }
  }

  public getName(): string {
    return this.player.name;
  }

  public getTrackedPlayerCount(): number {
    return Object.keys(this.globalTracking.names).length;
  }

  public handleDataSend(encodedData: Buffer): void {
    try {
      // Add Buffer Packet (incomplete packet from last data)
      // to the new data
      let bufferPacket = this.bufferPacket;
      let entireData = Buffer.concat([bufferPacket, encodedData]);

      // Get the individual packets from the data
      let entireDataInfo: BuffersPackets = getPacketsFromBuffer(entireData);

      if (entireDataInfo.type === "InvalidPacketLength") {
        this.disconnect(this.options.language.phrases.invalidPacketLength);
        return
      }

      // Update Buffer Packet using the new incomplete packet (if any)
      this.bufferPacket = entireDataInfo.bufferPacket;

      let packets: RawPacket[] = entireDataInfo.packets;

      // The packets are only handled if the client has already connected
      // to a server for the first time
      if (this.initialConnectionAlreadyCreated) {
        if (this.connected || this.state > ClientState.FreshConnection) {
          let allowedData: Buffer[] = [];
          packets.forEach((packet: RawPacket) => {
            try {
              const buf = this.getPacketHandler().handlePacket(this, packet);
              if (buf !== null) {
                allowedData.push(buf);
              }
            } catch (e) {
              if (this.options.log.clientError) {
                this.logging.error(`Client handle packet error. PacketType: ${PacketTypes[packet.packetType]} (${packet.packetType}): ${ErrorHelper.toMessage(e)}. Data: ${packet.data.toString("hex")}`);
              }
            }
          });

          // Send allowedData to the server if the client is connected to one
          if (allowedData.length > 0 && this.connected) {
            if (this.server.socket) {
              for (const buf of allowedData) {
                this.server.sendDirect(buf);
              }
            } else {
              this.sendChatMessage(this.options.language.phrases.areYouEvenConnected, "ff0000");
            }
          }
        } else {
          // Send packets to the server once the client is connected
          this.queuedPacketsWhileConnecting.push(...packets);
        }
      } else {
        // Connect to a server for the first time in this session
        this.initialConnectionAlreadyCreated = true;
        this.player.allowedCharacterChange = true;
        this.player.allowedLifeChange = true;
        this.player.allowedManaChange = true;
        this.player.allowedNameChange = true;

        this.server.socket.on('data', this.ServerHandleData);
        this.server.socket.on('close', this.ServerHandleClose);
        this.server.socket.on('error', this.ServerHandleError);

        this.server.socket.connect(this.server.port, this.server.ip, () => {
          this.countIncremented = true;
          this.serversDetails[this.server.name].clientCount++;
          this.serversDetails[this.server.name].failedConnAttempts = 0;
          this.connected = true;

          packets.push(...this.queuedPacketsWhileConnecting);
          this.queuedPacketsWhileConnecting = [];

          // In order to allow inspection of first packet regardless of fake version
          let allowedData: Buffer[] = [];
          packets.forEach((packet: RawPacket) => {
            const buf = this.getPacketHandler().handlePacket(this, packet);
            if (buf !== null) {
              allowedData.push(buf);
            }
          });

          // Write the data the client sent us to the now connected server
          if (this.options.fakeVersion.enabled) {
            const verText = "Terraria" + this.options.fakeVersion.terrariaVersion;
            let packet = new PacketWriter()
              .setType(1)
              .packString(verText)
              .data;
            this.server.sendDirect(packet);
          } else {
            // Send allowedData to the server if the client is connected to one
            if (allowedData.length > 0 && this.connected) {
              if (this.server.socket) {
                for (const buf of allowedData) {
                  this.server.sendDirect(buf);
                }
              } else {
                this.sendChatMessage(this.options.language.phrases.areYouEvenConnected, "ff0000");
              }
            }
          }
        });
      }
    } catch (e) {
      if (this.options.log.clientError) {
        this.logging.error(`Client Handle Send Data Error: ${ErrorHelper.toMessage(e)}`);
      }
    }
  }

  // Useful method for sending a chat message packet to a client */
  public sendChatMessage(text: string | NetworkText, color?: string | undefined): void {
    if (this.socket.destroyed) {
      return;
    }

    let networkText: NetworkText;
    if (text instanceof NetworkText) {
      networkText = text;
    } else {
      networkText = new NetworkText(0, text);
    }

    if (networkText.text.length > 0) {
      if (typeof color === 'undefined') {
        color = "00ff00"
      }

      let colorRgb = {
        R: parseInt(color.substring(0, 2), 16),
        G: parseInt(color.substring(2, 4), 16),
        B: parseInt(color.substring(4, 6), 16)
      }
      let chatMessageData = NetModuleLoadPacket.toBuffer({
        TAG: "ServerText",
        _0: 255,
        _1: networkText,
        _2: colorRgb
      })

      switch (chatMessageData.TAG) {
        case "Ok":
          const chatMessage = { packetType: PacketTypes.LoadNetModule, data: chatMessageData._0 };
          const chatMessagePacket = this.server.getPacketHandler().handlePacket(this.server, chatMessage, PacketSource.Dimensions);
          if (chatMessagePacket !== null) {
            this.sendDirect(chatMessagePacket);
          }
          break;
        case "Error":
          this.logging.error(`Error creating chat message packet: ${chatMessageData._0}`);
          break;
      }
    }
  }

  /* Sends any queued packets from the connection phase to the server */
  public sendWaitingPackets(): void {
    if (!this.server.socket.destroyed && this.packetQueue.length > 0) {
      for (const packet of this.packetQueue) {
        const data = this.globalHandlers.clientPacketHandler.handlePacket(this, packet.rawPacket)
        if (data !== null) {
          this.server.sendDirect(data);
        }
      }

      this.packetQueue = [];
    }
  }

  private sendQueuedPacketsWhileConnecting(): void {
    if (this.queuedPacketsWhileConnecting.length === 0) {
      return;
    }

    const queuedPackets = this.queuedPacketsWhileConnecting;
    this.queuedPacketsWhileConnecting = [];

    for (const packet of queuedPackets) {
      try {
        const data = this.getPacketHandler().handlePacket(this, packet);
        if (data !== null) {
          this.server.sendDirect(data);
        }
      } catch (e) {
        if (this.options.log.clientError) {
          this.logging.error(`Client handle queued packet error. PacketType: ${PacketTypes[packet.packetType]} (${packet.packetType}): ${ErrorHelper.toMessage(e)}. Data: ${packet.data.toString("hex")}`);
        }
      }
    }
  }

  /* Handles switching from one server to another */
  public changeServer(server: RoutingServer, options?: ChangeServerOptions): void {
    this.extraJoinInformation = options?.extraJoinInformation;
    ClearUtils.clearPlayers(this);
    ClearUtils.clearNPCs(this);
    ClearUtils.clearItems(this);
    ClearUtils.clearPylons(this);
    ClearUtils.clearJourneyPowers(this);

    let ip: string = server.serverIP;
    let port: number = server.serverPort;
    let name: string = server.name;
    let isVanilla: boolean = server.isVanilla;

    if (typeof options !== 'undefined' && typeof options.preventSpawnOnJoin !== 'undefined') {
      this.preventSpawnOnJoin = options.preventSpawnOnJoin;
    } else {
      this.preventSpawnOnJoin = false;
    }

    // Client is now not connected to a server
    this.connected = false;

    this.server.afterClosed = () => {
      // Remove data and error listeners on TerrariaServer socket
      // done AFTER being closed to avoid errors potentially cropping up unhandled
      this.server.socket.removeListener('data', this.ServerHandleData);
      this.server.socket.removeListener('error', this.ServerHandleError);

      this.server.afterClosed = null;
      // Remove close listener now that socket has been closed and event was called
      this.server.socket.removeListener('close', this.ServerHandleClose);

      // Start new socket
      this.server.socket = new Net.Socket();
      if (this.server.isSSC) {
        this.waitingCharacterRestore = true;
      } else {
        // Only allow updates to visuals if coming from non-ssc
        this.player.allowedCharacterChange = true;
        this.player.allowedLifeChange = true;
        this.player.allowedManaChange = true;
      }
      this.server.reset();
      this.state = ClientState.FreshConnection;

      // Update server information
      this.server.ip = ip;
      this.server.port = port;
      this.server.name = name;
      this.server.isVanilla = isVanilla;

      // Allow name change during this stage
      this.player.allowedNameChange = true;

      // Debuffs are added to try and prevent a bug in Terraria where a weapon/item can be in use and the slot
      // be changed (due to SSC) causing unintended behaviour
      if (this.options.debuffOnSwitch.enabled) {
        for (const debuffId of this.options.debuffOnSwitch.buffTypes) {
          const debuffData = PlayerBuffAddPacket.toBuffer({
            playerId: this.player.id,
            buff: debuffId,
            time: 60 * this.options.debuffOnSwitch.debuffTimeInSeconds
          })

          if (debuffData.TAG === "Error") {
            this.logging.error(`Error creating debuff add packet: ${debuffData._0}`);
            return;
          }

          const debuff = {
            data: debuffData._0,
            packetType: PacketTypes.AddPlayerBuff,
          };

          const debuffPacket = this.server.getPacketHandler().handlePacket(this.server, debuff, PacketSource.Dimensions);
          if (debuffPacket !== null) {
            this.sendDirect(debuffPacket);
          }
        }
      }

      this.server.socket.on('data', this.ServerHandleData);
      this.server.socket.on('close', this.ServerHandleClose);
      this.server.socket.on('error', this.ServerHandleError);

      // Create connection
      this.server.socket.connect(port, ip, () => {
        if (this.options.log.tServerConnect) {
          this.logging.info(`[${process.pid}] TerrariaServer Socket Connection [${ip}:${port}]`);
        }

        // Increment server count
        this.countIncremented = true;
        if (!this.serversDetails[this.server.name]) {
          this.serversDetails[this.server.name] = { clientCount: 0, failedConnAttempts: 0, disabled: false, disabledTimeout: null };
        }
        this.serversDetails[this.server.name].clientCount++;
        this.serversDetails[this.server.name].failedConnAttempts = 0;

        const verText = this.version;
        var connectPacket = new PacketWriter()
          .setType(1)
          .packString(verText)
          .data;

        // Construct Packet object to be handled by any handlers first
        let packet: RawPacket = {
          packetType: PacketTypes.ConnectRequest,
          data: connectPacket
        };
        const allowedData = this.getPacketHandler().handlePacket(this, packet);

        if (allowedData !== null) {
          this.server.sendDirect(packet.data);
        }

        if (typeof options !== 'undefined' && typeof options.routingInformation !== 'undefined') {
          this.routingInformation = options.routingInformation;
        }
        this.state = ClientState.ConnectionSwitchEstablished;
        this.connected = true;
        this.sendQueuedPacketsWhileConnecting();
      });
    };

    // Close the TerrariaServer socket completely
    if (!this.server.socket.destroyed) {
      this.server.setDisconnectReason(makeDisconnectReason(
        DisconnectReasonCodes.DimensionSwitch,
        `switching from ${this.server.name} to ${name}`
      ));
      this.server.socket.destroy();
    } else {
      this.server.afterClosed(this);
    }
  }

  /**
   * Sends data if the socket is open, does not invoke any handlers
   *
   * @param buf 
   */
  public sendDirect(buf: Buffer): void {
    if (!this.disconnecting && this.socket.writable) {
      this.socket.write(buf);
      this.notifySendPacketToClientEvent(buf);
    }
  }

  private notifySendPacketToClientEvent(buf: Buffer): void {
    Object.values(this.globalHandlers.extensions).forEach((extension) => {
      if (extension.sendPacketToClientEvent) {
        try {
          extension.sendPacketToClientEvent(this, buf);
        } catch (error) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? "unknown";
            const logMessage = `[${process.pid}] Extension ${name} Client Send Packet Event Error: ${ErrorHelper.toMessage(error)}`;
            this.logging.info(logMessage);
          }
        }
      }
    });
  }

  public disconnectFromServer(): void {
    this.server.setDisconnectReason(makeDisconnectReason(
      DisconnectReasonCodes.ClientLeftDimension,
      "client left dimension"
    ));

    // Client is now not connected to a server
    this.connected = false;

    // If the TerrariaServer socket won't emit close (because we tear down listeners),
    // make sure we still balance the count increment done on connect.
    if (this.countIncremented && this.serversDetails[this.server.name]) {
      this.serversDetails[this.server.name].clientCount--;
      this.countIncremented = false;
    }

    this.server.logDisconnect();

    this.server.socket.destroy();

    // Remove data and error listeners on TerrariaServer socket
    this.server.socket.removeListener('data', this.ServerHandleData);
    this.server.socket.removeListener('error', this.ServerHandleError);
    this.server.socket.removeListener('close', this.ServerHandleClose);
  }

  public handleError(e: Error): void {
    this.setDimensionsDisconnectReason(clientSocketErrorReason(e));
    if (this.options.log.clientError) {
      this.logging.error(`Client Socket Error: ${ErrorHelper.toMessage(e)}`)
    }
  }

  public handleClose(): void {
    this.clearForcedDisconnect();

    if (!this.server.socket.destroyed) {
      this.server.afterClosed = null;
      this.server.setDisconnectReason(makeDisconnectReason(
        DisconnectReasonCodes.ClientDisconnectedFromDimensions,
        "client disconnected from Dimensions"
      ));
      this.server.socket.destroy();
    }

    if (this.getName() !== "") {
      delete this.globalTracking.names[this.getName()];
    }
  }
}

export default Client;
