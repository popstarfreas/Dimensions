import {hex2str, BuffersPackets, getPacketsFromHexString} from 'utils';
import PacketTypes from 'packettypes';
import * as _ from 'lodash';
import terrariaServerPacketHandler from 'terrariaserverpackethandler';
import Client from 'client';
import * as Net from 'net';
import Point from 'point';
import Item from 'item';
import NPC from 'npc';
import Player from 'player';
import Packet from 'packet';
import Entities from 'entities';

class TerrariaServer {
  client: Client;
  socket: Net.Socket;

  // Connection Details
  ip: string;
  port: number;

  // Unique name
  name: string;
  spawn: Point;
  bufferPacket: string;
  afterClosed: ((client: Client) => void) | null;
  entityTracking: Entities;
  isSSC: boolean;

  constructor(socket: Net.Socket, client: Client) {
    this.socket = socket;
    this.client = client;
    this.reset();
  }

  reset(): void {
    this.ip = "127.0.0.1";
    this.port = 7777;
    this.name = "";
    this.spawn = {
      x: 0,
      y: 0
    };
    this.bufferPacket = "";
    this.afterClosed = null;
    this.entityTracking = {
      items: [],
      NPCs: [],
      players: []
    };
    this.isSSC = false;
  }

  getPacketHandler(): terrariaServerPacketHandler {
    return this.client.globalHandlers.terrariaServerPacketHandler;
  }

  handleData(encodedData: Buffer): void {
    try {
      let incompleteData: string = hex2str(encodedData);

      // This is the incomplete packet carried over from last time
      let bufferPacket: string = this.bufferPacket;

      // The combined packet info using buffer
      let entireData: string = bufferPacket + incompleteData;

      // Get an array of packets from the entireData
      let entireDataInfo: BuffersPackets = getPacketsFromHexString(entireData);

      // Update buffer packet to the new incomplete packet (if any)
      this.bufferPacket = entireDataInfo.bufferPacket;

      // The hex string of the allowed packets to send to the client
      let allowedPackets: string = "";

      // Inspect and handle each packet
      let packets: Packet[] = entireDataInfo.packets;
      _.each(packets, (packet: Packet) => {
        allowedPackets += this.getPacketHandler().handlePacket(this, packet);
      });

      if (allowedPackets.length > 0) {
        this.client.socket.write(new Buffer(allowedPackets, "hex"));
      }
    } catch (e) {
      if (this.client.options.log.tServerError) {
        console.log("TS Handle Data Error: " + e.stack);
      }
    }
  }

  handledByPreCloseHandlers(): boolean {
    let handlers = this.client.globalHandlers.extensions;
    let handled = false;
    for (let key in handlers) {
      let handler = handlers[key];
      if (typeof handler.serverDisconnectPreHandler !== 'undefined') {
        handled = handler.serverDisconnectPreHandler(this);
        if (handled) {
          break;
        }
      }
    }
    
    return handled;
  }

  handledByCloseHandlers(): boolean {
    let handlers = this.client.globalHandlers.extensions;
    let handled = false;
    for (let key in handlers) {
      let handler = handlers[key];
      if (typeof handler.serverDisconnectHandler !== 'undefined') {
        handled = handler.serverDisconnectHandler(this);
        if (handled) {
          break;
        }
      }
    }
    
    return handled;
  }

  handleClose(): void {
    try {
      if (this.client.countIncremented) {
        this.client.serversDetails[this.name].clientCount--;
        this.client.countIncremented = false;
      }
    } catch (e) {
      if (this.client.options.log.tServerError) {
        console.log("handleClose Err: " + e);
      }
    }
    
    if (this.client.options.log.tServerDisconnect) {
      console.log(`TerrariaServer socket closed. [${this.name}]`);
    }

    if (this.handledByPreCloseHandlers()) {
      return;
    }

    if (this.afterClosed !== null) {
      this.afterClosed(this.client);
    } else {
      if (this.handledByCloseHandlers()) {
        return;
      }

      let dimensionsList: string = "";
      let dimensionNames: string[] = _.keys(this.client.servers);
      for (var i = 0; i < dimensionNames.length; i++) {
        dimensionsList += (i > 0 ? ", " : " ") + "/" + dimensionNames[i];
      }

      if (!this.client.wasKicked) {
        this.client.sendChatMessage("The timeline you were in has collapsed.", "00BFFF");
        this.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
      } else {
        this.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
        this.client.wasKicked = false;
      }
    }
  }

  handleError(error: Error): void {
    //console.log(this.ip + ":" + this.port + " " + this.name);
    //this.client.changeServer(Config.IP, Config.PORT);
    let matches: RegExpMatchArray | null = /ECONN([A-z]*?) /.exec(error.message);
    let type: string = matches !== null && matches.length > 1 ? matches[1] : "";
    if (type === "REFUSED") {
      if (!this.client.serversDetails[this.name].disabled && ++this.client.serversDetails[this.name].failedConnAttempts >= 3) {
        this.client.serversDetails[this.name].disabled = true;
        setTimeout(() => {
          this.client.serversDetails[this.name].failedConnAttempts = 0;
          this.client.serversDetails[this.name].disabled = false;
        }, 20000);
      }
    }

    if (this.client.options.log.tServerError) {
      console.log("TerrariaServer Socket Error: " + error.message);
    }

    if (this.socket !== null) {
      this.socket.destroy();
    }
    this.client.connected = false;
  }
}

export default TerrariaServer;