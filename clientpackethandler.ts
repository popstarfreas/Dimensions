import PacketTypes from './packettypes';
import {PacketFactory, ReadPacketFactory, hex2a} from './utils';
import NPC from './npc';
import Item from './item';
import Client from './client';
import Packet from './packet';
import {Command} from './clientcommandhandler';

class ClientPacketHandler {
  currentClient: Client;
  
  handlePacket(client: Client, packet: Packet): string {
    let packetType: number = packet.packetType;
    let handled: boolean = false;

    // Set current client while we handle this packet
    this.currentClient = client;
    switch (packetType) {
      case PacketTypes.PlayerInfo:
        handled = this.handlePlayerInfo(packet);
        break;

      case PacketTypes.UpdatePlayerBuff:
        handled = this.handleUpdatePlayerBuff(packet);
        break;

      case PacketTypes.AddPlayerBuff:
        handled = this.handleAddPlayerBuff(packet);
        break;

      case PacketTypes.PlayerInventorySlot:
        handled = this.handlePlayerInventorySlot(packet);
        break;

      // Either will be sent, but not both
      case PacketTypes.ContinueConnecting2:
      case PacketTypes.Status:
        if (this.currentClient.state === 0) {
          // Finished sending inventory
          this.currentClient.state = 1;
        }
        break;

      case PacketTypes.UpdateItemOwner:
        // Prevent this being sent unless state is 1
        // this prevents issues with joining while items
        // are next to the player on the past server
        if (this.currentClient.state !== 1) {
          handled = true;
        }
        break;

      case PacketTypes.ChatMessage:
        handled = this.handleChatMessage(packet);
        break;

      case PacketTypes.DimensionsUpdate:
        // Client cannot send 67 (It's used by Dimensions to communicate special info)
        handled = true;
        break;

      case PacketTypes.ClientUUID:
        handled = this.handleClientUUID(packet);
        break;
    }

    return !handled ? packet.data : "";
  }

  handlePlayerInfo(packet: Packet): boolean {
    let nameLength: number = parseInt(packet.data.substr(12, 2), 16);
    if (this.currentClient.player.name === null) {
      // Take the appropriate hex chars out of the packet
      // then convert them to ascii
      let name: string = hex2a(packet.data.substr(14, nameLength * 2));
      this.currentClient.setName(name);
    }

    return false;
  }

  handleUpdatePlayerBuff(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    let playerID: number = reader.readByte();
    if (!this.currentClient.options.blockInvis) {
      var updatePlayerBuff: PacketFactory = (new PacketFactory())
        .setType(PacketTypes.UpdatePlayerBuff)
        .packByte(playerID);

      for (let i: number = 0; i < 22; i++) {
        if (reader.packetData.length !== 0) {
          let buffType: number = reader.readByte();
          if (buffType !== 10) {
            updatePlayerBuff.packByte(buffType);
          } else {
            updatePlayerBuff.packByte(0);
          }
        }
      }

      this.currentClient.server.socket.write(new Buffer(updatePlayerBuff.data(), 'hex'));
      return true;
    } else {
      return false;
    }
  }

  handleAddPlayerBuff(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    let playerID: number = reader.readByte();
    let buffID: number = reader.readByte();

    if (this.currentClient.options.blockInvis) {
      return buffID === 10;
    } else {
      return false;
    }
  }

  handlePlayerInventorySlot(packet: Packet): boolean {
    if ((this.currentClient.state === 0 || this.currentClient.state === 2) && !this.currentClient.waitingInventoryReset) {
      let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
      let playerID: number = reader.readByte();
      let slotID: number = reader.readByte();
      let stack: number = reader.readInt16();
      let prefix: number = reader.readByte();
      let netID: number = reader.readInt16();
      this.currentClient.player.inventory[slotID] = new Item(slotID, stack, prefix, netID);
    }

    return false;
  }

  handleChatMessage(packet: Packet): boolean {
    let handled: boolean = false;
    let chatMessage: string = hex2a(packet.data.substr(16));

    // If chat message is a command
    if (chatMessage.length > 1 && chatMessage.substr(0, 1) === "/") {
      let command: Command = this.currentClient.globalHandlers.command.parseCommand(chatMessage);
      handled = this.currentClient.globalHandlers.command.handle(command, this.currentClient);
    }

    return handled;
  }

  handleClientUUID(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    this.currentClient.UUID = reader.readString();

    return false;
  }
}

export default ClientPacketHandler;