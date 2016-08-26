/// <reference path="typings/index.d.ts" />
import PacketTypes from './packettypes';
import {ReadPacketFactory, getProperIP, PacketFactory} from './utils';
import * as _ from 'lodash';
import NPC from './npc';
import TerrariaServer from './terrariaserver';
import Client from './client';
import Packet from './packet';
import * as Net from 'net';
import Point from './point';
import Item from './item';

class TerrariaServerPacketHandler {
  currentServer: TerrariaServer;
  socket: Net.Socket;

  handlePacket(server: TerrariaServer, packet: Packet): string {
    let handled: boolean = false;
    let packetType: number = packet.packetType;
    this.currentServer = server;
    switch (packetType) {
      case PacketTypes.Disconnect:
        handled = this.handleDisconnect(packet);
        break;

      case PacketTypes.ContinueConnecting:
        handled = this.handleContinueConnecting(packet);
        break;

      case PacketTypes.WorldInfo:
        handled = this.handleWorldInfo(packet);
        break;

      case PacketTypes.CompleteConnectionAndSpawn:
        handled = this.handleCompleteConnectionAndSpawn(packet);
        break;

      case PacketTypes.DimensionsUpdate:
        handled = this.handleDimensionsUpdate(packet);
        break;

      case PacketTypes.NPCUpdate:
        handled = this.handleNPCUpdate(packet);
        break;

      case PacketTypes.NPCStrike:
        handled = this.handleNPCStrike(packet);
        break;

      case PacketTypes.UpdateItemDrop_Instanced:
      case PacketTypes.UpdateItemDrop:
        handled = this.handleUpdateItemDrop(packet);
        break;

      case PacketTypes.PlayerActive:
        handled = this.handlePlayerActive(packet);
        break;

      default:
        break;
    }

    return !handled ? packet.data : "";
  }

  /* Start Packet Handlers */
  handleDisconnect(packet: Packet): boolean {
    if (!this.currentServer.client.ingame) {
      this.currentServer.client.socket.write(new Buffer(packet.data, 'hex'));
      this.currentServer.client.socket.destroy();
    } else {
      let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
      var dcReason = reader.readString();
      if (dcReason.length < 50) {
        var color = "C8FF00"; // shitty green
        var message = "[Dimensional Alert]";
        this.currentServer.client.sendChatMessage(message, color);
        this.currentServer.client.sendChatMessage(dcReason, color);
        this.currentServer.client.wasKicked = true;
        this.currentServer.client.connected = false;

        if (this.socket) {
          this.socket.destroy();
        }
      }
    }

    return true;
  }

  handleContinueConnecting(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    this.currentServer.client.player.id = reader.readByte();

    // Send IP Address
    let ip: string = getProperIP(this.currentServer.client.socket.remoteAddress);
    let packetData: string = (new PacketFactory())
      .setType(PacketTypes.DimensionsUpdate)
      .packInt16(0) // Type
      .packString(ip)
      .data();
    let data: Buffer = new Buffer(packetData, 'hex');
    this.currentServer.socket.write(data);

    return false;
  }

  handleWorldInfo(packet: Packet): boolean {
    if (this.currentServer.client.waitingInventoryReset) {
      this.resetInventory(this.currentServer.client);
      this.currentServer.client.waitingInventoryReset = false;
    }

    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    reader.readInt32(); // Time
    reader.readByte(); // Day&MoonInfo
    reader.readByte(); // Moon Phase
    reader.readInt16(); // MaxTilesX
    reader.readInt16(); // MaxTilesY
    let spawn: Point = {
      x: reader.readInt16(),
      y: reader.readInt16()
    };
    reader.readInt16(); // WorldSurface
    reader.readInt16(); // RockLayer
    reader.readInt32(); // WorldID
    reader.readString(); // World Name
    reader.readByte(); // Moon Type
    reader.readByte(); // Tree Background
    reader.readByte(); // Corruption Background
    reader.readByte(); // Jungle Background
    reader.readByte(); // Snow Background
    reader.readByte(); // Hallow Background
    reader.readByte(); // Crimson Background
    reader.readByte(); // Desert Background
    reader.readByte(); // Ocean Background
    reader.readByte(); // Ice Back Style
    reader.readByte(); // Jungle Back Style
    reader.readByte(); // Hell Back Style
    reader.readSingle(); // Wind Speed Set
    reader.readByte(); // Cloud Number
    reader.readInt32(); // Tree 1
    reader.readInt32(); // Tree 2
    reader.readInt32(); // Tree 3
    reader.readByte(); // Tree Style 1
    reader.readByte(); // Tree Style 2
    reader.readByte(); // Tree Style 3
    reader.readByte(); // Tree Style 4
    reader.readInt32(); // Cave Back 1
    reader.readInt32(); // Cave Back 2
    reader.readInt32(); // Cave Back 3
    reader.readByte(); // Cave Back Style 1
    reader.readByte(); // Cave Back Style 2
    reader.readByte(); // Cave Back Style 3
    reader.readByte(); // Cave Back Style 4
    reader.readSingle(); // Rain
    let eventInfo: number = reader.readByte();
    if ((eventInfo & 64) === 64) {
      this.currentServer.isSSC = true;
    } else {
      this.currentServer.isSSC = false;
    }
    if (this.currentServer.client.state === 2) {
      this.currentServer.spawn.x = spawn.x;
      this.currentServer.spawn.y = spawn.y;

      // In future it would be better to check if they used a warpplate
      // so the tile section is where they came through instead of spawn
      let getSection: string = (new PacketFactory())
        .setType(PacketTypes.GetSectionOrRequestSync)
        .packSingle(-1)
        .packSingle(-1)
        .data();
      this.currentServer.socket.write(new Buffer(getSection, 'hex'));

      this.currentServer.client.state = 3;

      // Routing Information for Warpplate entry
      if (this.currentServer.client.routingInformation !== null) {
        let dimensionsUpdate: string = (new PacketFactory())
          .setType(PacketTypes.DimensionsUpdate)
          .packInt16(this.currentServer.client.routingInformation.type)
          .packString(this.currentServer.client.routingInformation.info)
          .data();
        this.currentServer.socket.write(new Buffer(dimensionsUpdate, 'hex'));
        this.currentServer.client.routingInformation = null;
      }
    }

    return false;
  }

  handleCompleteConnectionAndSpawn(packet: Packet): boolean {
    if (this.currentServer.client.state === 3) {
      this.currentServer.client.state = 1;
      let spawnPlayer: string = (new PacketFactory())
        .setType(PacketTypes.SpawnPlayer)
        .packByte(this.currentServer.client.player.id)
        .packInt16(this.currentServer.spawn.x)
        .packInt16(this.currentServer.spawn.y)
        .data();

      let server: TerrariaServer = this.currentServer;
      setTimeout(function sendSpawnPlayer() {
        if (typeof server.client !== 'undefined' && typeof server.client.socket !== 'undefined') {
          server.socket.write(new Buffer(spawnPlayer, 'hex'));

          if (!server.client.preventSpawnOnJoin) {
            server.client.socket.write(new Buffer(spawnPlayer, 'hex'));
          }
        }
      }, 1000);
    }

    this.currentServer.client.ingame = true;

    this.clearPlayers(this.currentServer.client);
    this.clearNPCs(this.currentServer.client);
    this.clearItems(this.currentServer.client);
    return false;
  }

  handleDimensionsUpdate(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    let messageType: number = reader.readInt16();
    let messageContent: string = reader.readString();

    // Switch server
    if (messageType == 2) {
      if (this.currentServer.client.servers[messageContent.toLowerCase()]) {
        this.currentServer.client.sendChatMessage("Shifting to the " + messageContent + " Dimension", "FF0000");
        this.currentServer.client.changeServer(this.currentServer.client.servers[messageContent.toLowerCase()], {
          preventSpawnOnJoin: true
        });
      }
    }

    return true;
  }

  handleNPCUpdate(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    let NPCID: number = reader.readInt16();
    let position: Point = {
      x: reader.readSingle(),
      y: reader.readSingle()
    };
    let velocity: Point = {
      x: reader.readSingle(),
      y: reader.readSingle()
    };
    let target: number = reader.readByte();

    // Flags
    let bits: number = reader.readByte();
    let direction: boolean = (bits & 1) === 1;
    let directionY: boolean = (bits & 2) === 2;
    let AIBits: boolean[] = [];
    AIBits[0] = (bits & 4) === 4;
    AIBits[1] = (bits & 8) === 8;
    AIBits[2] = (bits & 16) === 16;
    AIBits[3] = (bits & 32) === 32;
    let spriteDirection: boolean = (bits & 64) === 64;
    let lifeMax: boolean = (bits & 128) === 128;

    let AI: number[] = [];
    if (AIBits[0]) {
      AI[0] = reader.readSingle();
    }
    if (AIBits[1]) {
      AI[1] = reader.readSingle();
    }
    if (AIBits[2]) {
      AI[2] = reader.readSingle();
    }
    if (AIBits[3]) {
      AI[3] = reader.readSingle();
    }

    let netID: number = reader.readInt16();
    let life: number = 0;
    let lifeBytes: number = 2;
    if (!lifeMax) {
      lifeBytes = reader.readByte();
      if (lifeBytes == 2) {
        life = reader.readInt16();
      } else if (lifeBytes == 4) {
        life = reader.readInt32();
      } else {
        life = reader.readSByte();
      }
    } else {
      // Placeholder max
      life = 1;
    }

    if (netID === 0 || life === 0) {
      this.currentServer.entityTracking.NPCs[NPCID] = false;
    } else {
      if (this.currentServer.entityTracking.NPCs[NPCID] === false || typeof this.currentServer.entityTracking.NPCs[NPCID] === 'undefined') {
        this.currentServer.entityTracking.NPCs[NPCID] = new NPC(NPCID, netID, life);
      } else {
        this.currentServer.entityTracking.NPCs[NPCID].life = life;
        this.currentServer.entityTracking.NPCs[NPCID].type = netID;
      }
    }

    //self.currentServer.client.socket.write(new Buffer(npcUpdate.data(), 'hex'));
    return false;
  }

  handleNPCStrike(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    let NPCID: number = reader.readInt16();
    let damage: number = reader.readInt16();

    if (this.currentServer.entityTracking.NPCs[NPCID]) {
      if (damage > 0) {
        this.currentServer.entityTracking.NPCs[NPCID].life -= damage;
        if (this.currentServer.entityTracking.NPCs[NPCID].life <= 0) {
          this.currentServer.entityTracking.NPCs[NPCID] = false;
        }
      } else {
        this.currentServer.entityTracking.NPCs[NPCID] = false;
      }
    }
    return false;
  }

  handleUpdateItemDrop(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    let itemID: number = reader.readInt16();
    let position: Point = {
      x: reader.readSingle(),
      y: reader.readSingle()
    };
    let velocity: Point = {
      x: reader.readSingle(),
      y: reader.readSingle()
    };
    let stacks: number = reader.readInt16();
    let prefix: number = reader.readByte();
    let noDelay: number = reader.readByte();
    var netID: number = reader.readInt16();

    if (netID > 0) {
      this.currentServer.entityTracking.items[itemID] = true;
    } else {
      this.currentServer.entityTracking.items[itemID] = false;
    }
    return false;
  }

  handlePlayerActive(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    let playerID: number = reader.readByte();
    let active: boolean = reader.readByte() === 1;
    this.currentServer.entityTracking.players[playerID] = active;

    return false;
  }

  clearPlayers(client: Client): void {
    let playerIDs: string[] = _.keys(this.currentServer.entityTracking.players);
    for (var i = 0, len = playerIDs.length; i < len; i++) {
      if (playerIDs[i] === client.player.id)
        continue;

      this.clearPlayer(client, parseInt(playerIDs[i]));
    }
  }

  clearPlayer(client: Client, playerIndex: number): void {
    let playerActive: string = (new PacketFactory())
      .setType(PacketTypes.PlayerActive)
      .packByte(playerIndex)
      .packByte(0) // Active
      .data();
    client.socket.write(new Buffer(playerActive, 'hex'));
  }

  clearNPCs(client: Client): void {
    let npcIDs: string[] = _.keys(this.currentServer.entityTracking.NPCs);
    for (let i: number = 0, len = npcIDs.length; i < len; i++) {
      if (this.currentServer.entityTracking.NPCs[npcIDs[i]]) {
        this.clearNPC(client, parseInt(npcIDs[i]));
      }
    }
  }

  clearNPC(client: Client, npcIndex: number): void {
    let updateNPC: string = (new PacketFactory())
      .setType(PacketTypes.NPCUpdate)
      .packInt16(npcIndex)
      .packSingle(0) // PositionX
      .packSingle(0) // PositionY
      .packSingle(0) // VelocityX
      .packSingle(0) // VelocityY
      .packByte(0) // Target
      .packByte(0) // Flags
      .packInt16(0) // NPC NetID
      .packByte(4) // Life ByteSize
      .packInt32(0) // Life
      .packByte(0)
      .data();
    client.socket.write(new Buffer(updateNPC, 'hex'));
    client.server.entityTracking.NPCs[npcIndex] = false;
  }

  clearItems(client: Client): void {
    let itemIDs: string[] = _.keys(this.currentServer.entityTracking.items);
    for (let i: number = 0, len = itemIDs.length; i < len; i++) {
      if (this.currentServer.entityTracking.items[itemIDs[i]]) {
        this.clearItem(client, parseInt(itemIDs[i]));
      }
    }
  }

  clearItem(client: Client, itemIndex: number): void {
    let updateItemDrop: string = (new PacketFactory())
      .setType(PacketTypes.UpdateItemDrop)
      .packInt16(itemIndex)
      .packSingle(0) // PositionX
      .packSingle(0) // PositionY
      .packSingle(0) // VelocityX
      .packSingle(0) // VelocityY
      .packInt16(0) // Stacks
      .packByte(0) // Prefix
      .packByte(0) // NoDelay
      .packInt16(0)
      .data();
    client.socket.write(new Buffer(updateItemDrop, 'hex'));
  }

  resetInventory(client: Client): void {
    let slotIDs: string[] = _.keys(this.currentServer.client.inventory);
    for (let i: number = 0, len = slotIDs.length; i < len; i++) {
      if (this.currentServer.client.player.inventory[slotIDs[i]]) {
        this.setItem(client, this.currentServer.client.player.inventory[slotIDs[i]]);
      }
    }
  }

  setItem(client: Client, item: Item): void {
    let playerInventorySlot: string = (new PacketFactory())
      .setType(PacketTypes.PlayerInventorySlot)
      .packByte(client.player.id)
      .packByte(item.slot)
      .packInt16(item.stack)
      .packByte(item.prefix)
      .packInt16(item.netID)
      .data();
    client.socket.write(new Buffer(playerInventorySlot, 'hex'));
  }
};

export default TerrariaServerPacketHandler;