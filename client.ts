import Player from './player';
import {} from './utils';
import TerrariaServer from './terrariaserver';
import * as Net from 'net';
import {ConfigSettings, ConfigOptions} from './configloader';
import PacketTypes from './packettypes';
import * as _ from 'lodash';
import ClientPacketHandler from './clientpackethandler';
import RoutingServer from './routingserver';
import GlobalHandlers from './globalhandlers';
import ServerDetails from './serverdetails';
import RoutingInformation from './routinginformation';
import {hex2str, getPacketsFromHexString, BuffersPackets, PacketFactory} from './utils';
import Packet from './packet';
import ChangeServerOptions from './changeserveroptions';
import GlobalTracking from './globaltracking';
import ClientStates from './clientstates';

class Client {
  ID: number;
  options: ConfigOptions;
  servers: { [id: string]: RoutingServer };
  socket: Net.Socket;
  ip: string;
  player: Player;
  globalHandlers: GlobalHandlers;
  server: TerrariaServer;
  connected: boolean;
  state: ClientStates;
  bufferPacket: string;
  initialConnectionAlreadyCreated: boolean;
  ingame: boolean;
  UUID: string;
  waitingInventoryRestore: boolean;
  wasKicked: boolean;
  routingInformation: RoutingInformation | null;
  countIncremented: boolean;
  serversDetails: { [id: string]: ServerDetails };
  preventSpawnOnJoin: boolean;
  ServerHandleError: (error: Error) => void;
  ServerHandleData: (data: Buffer) => void;
  ServerHandleClose: () => void;
  globalTracking: GlobalTracking;

  constructor(id: number, socket: Net.Socket, server: RoutingServer, serversDetails: { [id: string]: ServerDetails }, globalHandlers: GlobalHandlers, servers: { [id: string]: RoutingServer }, options: ConfigOptions, globalTracking: GlobalTracking) {
    this.ID = id;

    // Options from the config
    this.options = options;

    // Tracking Information
    this.globalTracking = globalTracking;

    // TerrariaServer information available for connecting to
    this.servers = servers;

    // The socket connection to the net server associated with this client
    this.socket = socket;

    // The unformatted ip address for the current socket connection to the net server
    this.ip = socket.remoteAddress;

    // This clients player object which can be used
    // for storing inventory and other player information
    this.player = new Player();

    // Global Handlers object whose contents may be updated (reloaded/refreshed)
    this.globalHandlers = globalHandlers;

    // TerrariaServer socket connection and packet handler
    this.server = new TerrariaServer(new Net.Socket(), this);
    this.server.ip = server.serverIP;
    this.server.port = server.serverPort;
    this.server.name = server.name;

    // Current connection state to TerrariaServer
    this.connected = false;

    // Connection State
    // 0 => Fresh Connection
    // 1 => Finished Sending Inventory
    // 2 => Connection to new server established (extra packet help required because of the actual clients state
    //      being incapable of sending certain packets)
    // 3 => Packet Help sent  Get Section/Request Sync [8] packet in response to world info [7], now waiting on Update Shield Strengths [101]
    // 4 => Spawned on server / Completed Server switch
    this.state = ClientStates.FreshConnection;

    // Incomplete packet from last data received. This is used because all packets are inspected
    this.bufferPacket = "";

    // This is used to make the first connection to a TerrariaServer after receiving data
    this.initialConnectionAlreadyCreated = false;

    // A boolean of whether the current client has made it in-game (they can see minimap, world, tiles, their inventory)
    this.ingame = false;

    // UUID of client
    this.UUID = "";

    this.waitingInventoryRestore = false;

    // A boolean indicating that the socket was closed because the client was booted from the TerrariaServers
    // This is set to false again after the close handler has been run
    this.wasKicked = false;

    // Information to the server about a type of join (gamemode)
    this.routingInformation = null;

    // Whether or not count was incremented
    // this will be turned off when we minus from count
    this.countIncremented = false;

    // The counts of all TerrariaServers available
    this.serversDetails = serversDetails;

    this.preventSpawnOnJoin = false;

    this.ServerHandleError = this.server.handleError.bind(this.server);
    this.ServerHandleData = this.server.handleData.bind(this.server);
    this.ServerHandleClose = this.server.handleClose.bind(this.server);
  }

  getPacketHandler(): ClientPacketHandler {
    return this.globalHandlers.clientPacketHandler;
  }

  setName(name: string): void {
    this.player.name = name;

    if (name !== "") {
      this.globalTracking.names[name] = true;
    }
  }

  getName(): string {
    return this.player.name;
  }

  handleDataSend(encodedData: Buffer): void {
    try {
      let incompleteData: string = hex2str(encodedData);
      //console.log(entireData);

      // Add Buffer Packet (incomplete packet from last data)
      // to the new data
      let bufferPacket: string = this.bufferPacket;
      let entireData: string = bufferPacket + incompleteData;

      // Get the individual packets from the data
      let entireDataInfo: BuffersPackets = getPacketsFromHexString(entireData);

      // Update Buffer Packet using the new incomplete packet (if any)
      this.bufferPacket = entireDataInfo.bufferPacket;

      let packets: Packet[] = entireDataInfo.packets;

      // The packets are only handled if the client has already connected
      // to a server for the first time
      if (this.initialConnectionAlreadyCreated) {
        let allowedData: string = "";
        _.each(packets, (packet: Packet) => {
          allowedData += this.getPacketHandler().handlePacket(this, packet);
        });

        // Send allowedData to the server if the client is connected to one
        if (allowedData.length > 0 && this.connected) {
          if (this.server.socket) {
            this.server.socket.write(new Buffer(allowedData, 'hex'));
          } else {
            this.sendChatMessage("Are you even connected?", "ff0000");
          }
        }
      } else {
        // Connect to the server for the first time
        this.initialConnectionAlreadyCreated = true;

        this.server.socket.connect(this.server.port, this.server.ip, () => {
          this.countIncremented = true;
          this.serversDetails[this.server.name].clientCount++;
          this.serversDetails[this.server.name].failedConnAttempts = 0;
          this.connected = true;

          // Write the data the client sent us to the now connected server
          if (this.options.fakeVersion) {
            let packet: string = (new PacketFactory())
              .setType(1)
              .packString("Terraria" + this.options.fakeVersionNum)
              .data();
            this.server.socket.write(new Buffer(packet, "hex"));
          } else {
            this.server.socket.write(encodedData);
          }
        });

        this.server.socket.on('data', this.ServerHandleData);
        this.server.socket.on('close', this.ServerHandleClose);
        this.server.socket.on('error', this.ServerHandleError);
      }
    } catch (e) {
      console.log("Client Handle Send Data Error: " + e);
    }
  }

  sendChatMessage(message: string, color?: string | undefined): void {
    if (message.length > 0) {
      if (typeof color === 'undefined') {
        color = "00ff00"
      }

      let packetData: string = (new PacketFactory())
        .setType(PacketTypes.ChatMessage)
        .packByte(255)
        .packHex(color)
        .packString(message)
        .data();
      let msg: Buffer = new Buffer(packetData, 'hex');
      this.socket.write(msg);
    }
  }

  changeServer(server: RoutingServer, options?: ChangeServerOptions): void {
    let ip: string = server.serverIP;
    let port: number = server.serverPort;
    let name: string = server.name;

    if (typeof options !== 'undefined' && typeof options.preventSpawnOnJoin !== 'undefined') {
      this.preventSpawnOnJoin = options.preventSpawnOnJoin;
    } else {
      this.preventSpawnOnJoin = false;
    }

    // Client is now not connected to a server
    this.connected = false;

    this.server.afterClosed =  () => {
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
        this.waitingInventoryRestore = true;
      }
      this.server.reset();

      //console.log("Connecting to " + ip + ":" + port);

      // Update server information
      this.server.ip = ip;
      this.server.port = port;
      this.server.name = name;

      // Create connection
      this.server.socket.connect(port, ip, () => {
        // Increment server count
        this.countIncremented = true;
        this.serversDetails[this.server.name].clientCount++;
        this.serversDetails[this.server.name].failedConnAttempts = 0;

        // Send Packet 1
        // This needs to be changed; it should not be hardcoded data
        var connectPacket = (new PacketFactory())
          .setType(1)
          .packString("Terraria173")
          .data();
        this.server.socket.write(new Buffer(connectPacket, "hex"));
        if (typeof options !== 'undefined' && typeof options.routingInformation !== 'undefined') {
          this.routingInformation = options.routingInformation;
        }
        this.state = ClientStates.ConnectionSwitchEstablished;
        this.connected = true;
      });

      this.server.socket.on('data', this.ServerHandleData);
      this.server.socket.on('close', this.ServerHandleClose);
      this.server.socket.on('error', this.ServerHandleError);
    };

    // Close the TerrariaServer socket completely
    if (!this.server.socket.destroyed) {
      this.server.socket.destroy();
    } else {
      this.server.afterClosed(this);
    }
  }

  handleError(err: Error): void {
    //console.log("Client Socket Error: " + err);
  }

  handleClose(): void {
    //console.log("Client Socket Closed.");
    if (this.server.socket && typeof this.server.socket.destroy === 'function') {
      this.server.socket.destroy();
    }

    if (this.getName() !== "") {
      delete this.globalTracking.names[this.getName()];
    }
  }
}

export default Client;