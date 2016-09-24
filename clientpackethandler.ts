import PacketTypes from './packettypes';
import {PacketFactory, ReadPacketFactory, hex2a} from './utils';
import NPC from './npc';
import Item from './item';
import Client from './client';
import Packet from './packet';
import {Command} from './clientcommandhandler';
import ClientStates from './clientstates';
import Color from './color';

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

      case PacketTypes.GetSectionOrRequestSync:
        handled = this.handleGetSectionOrRequestSync(packet);
        break;

      case PacketTypes.PlayerMana:
        handled = this.handlePlayerMana(packet);
        break;

      case PacketTypes.PlayerHP:
        handled = this.handlePlayerHP(packet);
        break;

      case PacketTypes.UpdateItemDrop:
        handled = this.handleUpdateItemDrop(packet);
        break;

      case PacketTypes.UpdateItemOwner:
        handled = this.handleUpdateItemOwner(packet);
        break;

      // Either will be sent, but not both
      case PacketTypes.ContinueConnecting2:
      case PacketTypes.Status:
        if (this.currentClient.state === ClientStates.FreshConnection) {
          // Finished sending inventory
          this.currentClient.state = ClientStates.FinishinedSendingInventory;
        }
        break;

      case PacketTypes.SpawnPlayer:
        handled = this.handleSpawnPlayer(packet);
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
    let reader = new ReadPacketFactory(packet.data);
    reader.readByte(); // Player ID
    let skinVariant = reader.readByte();
    let hair = reader.readByte();
    if (hair > 134) {
      hair = 0;
    }
    let name = reader.readString();
    let hairDye = reader.readByte();
    let hideVisuals = reader.readByte();
    let hideVisuals2 = reader.readByte();
    let hideMisc = reader.readByte();
    let hairColor = reader.readColor();
    let skinColor = reader.readColor();
    let eyeColor = reader.readColor();
    let shirtColor = reader.readColor();
    let underShirtColor = reader.readColor();
    let pantsColor = reader.readColor();
    let shoeColor = reader.readColor();
    let difficulty = reader.readByte();

    let player = this.currentClient.player;
    if (player.allowedNameChange) {
      this.currentClient.setName(name);
    }

    if (player.allowedCharacterChange) {
      player.skinVariant = skinVariant;
      player.hair = hair;
      player.hairDye = hairDye;
      player.hideVisuals = hideVisuals;
      player.hideVisuals2 = hideVisuals2;
      player.hideMisc = hideMisc;
      player.hairColor = hairColor;
      player.skinColor = skinColor;
      player.eyeColor = eyeColor;
      player.shirtColor = shirtColor;
      player.underShirtColor = underShirtColor;
      player.pantsColor = pantsColor;
      player.shoeColor = shoeColor;
      player.difficulty = difficulty;
      player.allowedCharacterChange = false;
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
    if ((this.currentClient.state === ClientStates.FreshConnection || this.currentClient.state === ClientStates.ConnectionSwitchEstablished) && !this.currentClient.waitingCharacterRestore) {
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

  handleGetSectionOrRequestSync(packet: Packet): boolean {
    // Avoids it being blocked by handleDefault

    return false;
  }

  handlePlayerMana(packet: Packet): boolean {
    if (!this.currentClient.player.allowedManaChange)
      return false;

    // Read mana sent and then set the player object mana
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    reader.readByte();
    reader.readInt16();
    let mana: number = reader.readInt16();
    this.currentClient.player.mana = mana;
    this.currentClient.player.allowedManaChange = false;

    return false;
  }

  handlePlayerHP(packet: Packet): boolean {
    if (!this.currentClient.player.allowedLifeChange)
      return false;

    // Read life sent and then set the player object life
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    reader.readByte();
    reader.readInt16();
    let life: number = reader.readInt16();
    this.currentClient.player.life = life;
    this.currentClient.player.allowedLifeChange = false;

    return false;
  }

  handleUpdateItemDrop(packet: Packet): boolean {
    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientStates.FullyConnected) {
      this.currentClient.packetQueue += packet.data;
      return true;
    }

    return false;
  }

  handleUpdateItemOwner(packet: Packet): boolean {
    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientStates.FullyConnected) {
      this.currentClient.packetQueue += packet.data;
      return true;
    }

    return false;
  }

  handleSpawnPlayer(packet: Packet): boolean {
    if (this.currentClient.state === ClientStates.FinishinedSendingInventory) {
        this.currentClient.state = ClientStates.FullyConnected;
    }
    
    this.currentClient.sendWaitingPackets();

    return false;
  }

  handleChatMessage(packet: Packet): boolean {
    let handled: boolean = false;
    let chatMessage: string = hex2a(packet.data.substr(16));

    // If chat message is a command
    if (chatMessage.length > 1 && chatMessage.substr(0, 1) === "/") {
      let command: Command = this.currentClient.globalHandlers.command.parseCommand(chatMessage);
      handled = this.currentClient.globalHandlers.command.handle(command, this.currentClient);
      /*if (!handled && command.name.toLowerCase() === 'selfname') {
        let properChat: RegExp = /\[c(.*?)\:(.*?)\]/g;
        if (!properChat.test(chatMessage)) {
          chatMessage = chatMessage.replace(/\[/g, '(');
          let chatPacket: PacketFactory = (new PacketFactory())
            .setType(PacketTypes.ChatMessage)
            .packByte(0)
            .packColor({
              R: 0,
              G: 0,
              B: 0
            })
            .packString(chatMessage);
          this.currentClient.server.socket.write(new Buffer(chatPacket.data(), 'hex'));
          handled = true;
        }
      }*/
    } /*else {
      let colorTag: RegExp = /\[c(.*?)\:(.*?)\]/g;
      chatMessage = chatMessage.replace(colorTag, "$2");
      chatMessage = chatMessage.replace("1.3.2.1", "the current Terraria version");
      let chatPacket: PacketFactory = (new PacketFactory())
        .setType(PacketTypes.ChatMessage)
        .packByte(0)
        .packColor({
          R: 0,
          G: 0,
          B: 0
        })
        .packString(chatMessage);
      this.currentClient.server.socket.write(new Buffer(chatPacket.data(), 'hex'));
      handled = true;
    }*/

    return handled;
  }

  handleClientUUID(packet: Packet): boolean {
    let reader: ReadPacketFactory = new ReadPacketFactory(packet.data);
    this.currentClient.UUID = reader.readString();

    return false;
  }
}

export default ClientPacketHandler;