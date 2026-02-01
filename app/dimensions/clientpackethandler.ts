import Item from './item.js';
import Client from './client.js';
import RawPacket from './packets/rawpacket.js';
import { Command } from './clientcommandhandler.js';
import ClientState from './clientstate.js';
import ErrorHelper from './errorhelper.js';

import { ConnectRequestPacket, PlayerInfoPacket, PlayerBuffsSetPacket, PlayerBuffAddPacket, PlayerInventorySlotPacket, PlayerManaPacket, PlayerHealthPacket, PlayerUpdatePacket, ClientUuidPacket, NetModuleLoadPacket, ItemDropUpdatePacket, ItemOwnerPacket, PlayerSpawnPacket, Parser, } from "terraria-packet";

class ClientPacketHandler {
  private currentClient!: Client;

  /* Checks whether the packet was handled by extensions prior to being processed by this class */
  private runPriorHandlers(client: Client, packet: RawPacket): boolean {
    let handlers = client.globalHandlers.extensions;
    let handled = false;
    for (let key in handlers) {
      let handler = handlers[key];
      if (typeof handler.priorPacketHandlers !== 'undefined' && typeof handler.priorPacketHandlers.clientHandler !== 'undefined') {
        try {
          handled = handler.priorPacketHandlers.clientHandler.handlePacket(client, packet);
          if (handled) {
            break;
          }
        } catch (error) {
          if (client.options.log.extensionError) {
            const name = handler.name ?? key;
            const logMessage = `[${process.pid}] Extension ${name} Prior Client Packet Handler Error: ${ErrorHelper.toMessage(error)}`;
            client.logging.info(logMessage);
          }
        }
      }
    }

    return handled;
  }

  /* Checks whether the packet was handled by extensions after being processed by this class */
  private runPostHandlers(client: Client, packet: RawPacket): boolean {
    let handlers = client.globalHandlers.extensions;
    let handled = false;
    for (let key in handlers) {
      let handler = handlers[key];
      if (typeof handler.postPacketHandlers !== 'undefined' && typeof handler.postPacketHandlers.clientHandler !== 'undefined') {
        try {
          handled = handler.postPacketHandlers.clientHandler.handlePacket(client, packet);
          if (handled) {
            break;
          }
        } catch (error) {
          if (client.options.log.extensionError) {
            const name = handler.name ?? key;
            const logMessage = `[${process.pid}] Extension ${name} Post Client Packet Handler Error: ${ErrorHelper.toMessage(error)}`;
            client.logging.info(logMessage);
          }
        }
      }
    }

    return handled;
  }

  /* Runs the packet through extension handlers and runs any appropriate handlers of this class */
  public handlePacket(client: Client, rawPacket: RawPacket): Buffer | null {
    let priorHandled: boolean = this.runPriorHandlers(client, rawPacket);
    if (priorHandled) {
      return null;
    }

    let handled: boolean = false;

    const parsedResult = Parser.parse(rawPacket.data, false);
    if (parsedResult.TAG === "Error") {
      const parsed = parsedResult._0;
      if (typeof parsed === "object") {
        switch (parsed.TAG) {
          case "ReaderError":
            if (parsed._0.error instanceof Error) {
              client.logging.error(`Error parsing packet: ${parsed._0.context} ${parsed._0.error.message}\n${rawPacket.data.toString("hex")}`);
            } else {
              client.logging.error(`Error parsing packet: ${parsed._0.context}\n${rawPacket.data.toString("hex")}`);
            }
            break;
          default:
            client.logging.error(`Error parsing packet: ${parsed.TAG}\n${rawPacket.data.toString("hex")}`);
            break;
        }
        return null
      } else {
        switch (parsed) {
          case "IgnoredPacket":
            client.logging.debug(`Ignoring packet: ${rawPacket.packetType}`);
            break;
          default:
            client.logging.error(`Error parsing packet: ${rawPacket.packetType} ${parsed}\n${rawPacket.data.toString("hex")}`);
            return null
        }
      }
    } else {
      // Set current client while we handle this packet
      this.currentClient = client;
      const parsed = parsedResult._0;
      switch (parsed.TAG) {
        case "ConnectRequest":
          handled = this.handleConnectRequest(parsed._0);
          break;
        case "PlayerInfo":
          handled = this.handlePlayerInfo(parsed._0, rawPacket);
          break;
        case "PlayerBuffsSet":
          handled = this.handleUpdatePlayerBuff(parsed._0, rawPacket);
          break;
        case "PlayerBuffAdd":
          handled = this.handleAddPlayerBuff(parsed._0);
          break;
        case "PlayerInventorySlot":
          handled = this.handlePlayerInventorySlot(parsed._0);
          break;
        case "PlayerMana":
          handled = this.handlePlayerMana(parsed._0);
          break;
        case "PlayerHealth":
          handled = this.handlePlayerHP(parsed._0, rawPacket);
          break;
        case "PlayerUpdate":
          handled = this.handleUpdatePlayer(parsed._0, rawPacket);
          break;
        case "ItemDropUpdate":
          handled = this.handleUpdateItemDrop(parsed._0, rawPacket);
          break;
        case "ItemOwner":
          handled = this.handleUpdateItemOwner(parsed._0, rawPacket);
          break;
        case "WorldDataRequest":
          if (this.currentClient.state === ClientState.FreshConnection) {
            // Finished sending inventory
            this.currentClient.state = ClientState.FinishinedSendingInventory;
          }
          break;
        case "PlayerSpawn":
          handled = this.handleSpawnPlayer(parsed._0);
          break;
        case "NetModuleLoad":
          handled = this.handleLoadNetModule(parsed._0);
          break;
        case "DimensionsUpdate":
          // Client cannot send 67 (It's used by Dimensions to communicate special info)
          handled = true;
          break;
        case "ClientUuid":
          handled = this.handleClientUUID(parsed._0);
          break;
        case "PlayerStealth":
        case "PlayerDamage":
        case "Zones":
        case "NpcTalk":
        case "NpcNameUpdate":
          handled = this.handlePotentialEarlyPacket(rawPacket);
          break;
      }
    }

    if (handled) {
      return null;
    }

    let postHandled: boolean = this.runPostHandlers(client, rawPacket);
    if (postHandled) {
      return null;
    }

    return rawPacket.data;
  }

  private handleConnectRequest(connectRequest: ConnectRequestPacket.t): boolean {
    if (this.currentClient.version === "unknown") {
      this.currentClient.version = connectRequest?.version ?? "unknown";
    }

    return false;
  }

  /* Updates tracked visuals for player to restore them when they switch from
   * an SSC to a non-SSC server */
  private handlePlayerInfo(playerInfo: PlayerInfoPacket.t, rawPacket: RawPacket): boolean {
    const player = this.currentClient.player;
    if (player.name !== playerInfo.name) {
      if (player.allowedNameChange) {
        this.currentClient.setName(playerInfo.name);
      } else if (this.currentClient.options.nameChanges?.mode === "rewrite") {
        const data = PlayerInfoPacket.toBuffer({ ...playerInfo, playerId: this.currentClient.player.id, name: player.name });
        if (data.TAG === "Ok") {
          rawPacket.data = data._0;
        }
      }
    }

    if (player.allowedCharacterChange) {
      player.skinVariant = playerInfo.skinVariant;
      player.hair = playerInfo.hair;
      player.hairDye = playerInfo.hairDye;
      player.hideVisuals = playerInfo.hideVisuals;
      player.hideVisuals2 = playerInfo.hideVisuals2;
      player.hideMisc = playerInfo.hideMisc;
      player.hairColor = playerInfo.hairColor;
      player.skinColor = playerInfo.skinColor;
      player.eyeColor = playerInfo.eyeColor;
      player.shirtColor = playerInfo.shirtColor;
      player.underShirtColor = playerInfo.underShirtColor;
      player.pantsColor = playerInfo.pantsColor;
      player.shoeColor = playerInfo.shoeColor;
      player.difficulty = playerInfo.difficulty;
      player.voiceVariant = playerInfo.voiceVariant;
      player.voicePitchOffset = playerInfo.voicePitchOffset;

      player.allowedCharacterChange = false;
    }

    return false;
  }

  /* Used to prevent invisibility buff from being sent to the server
   * for used when the config is set to blockInvis = true */
  private handleUpdatePlayerBuff(playerBuffsSet: PlayerBuffsSetPacket.t, rawPacket: RawPacket): boolean {
    let shouldBlockInvis = false;
    const blockInvis = this.currentClient.options.blockInvis;
    switch (blockInvis) {
      case true:
        shouldBlockInvis = true;
        break;
      case false:
        break;
      default:
        shouldBlockInvis = blockInvis.enabled && blockInvis.servers.some(server => server.toLowerCase() === this.currentClient.server.name.toLowerCase())
        break;
    }

    if (shouldBlockInvis) {
      const buffs = playerBuffsSet.buffs.map((buff) => {
        if (buff === 10) {
          return 0;
        }
        return buff;
      });

      const buf = PlayerBuffsSetPacket.toBuffer({ playerId: this.currentClient.player.id, buffs })
      if (buf.TAG === "Error") {
        this.currentClient.logging.error(`Error creating player buffs set: ${buf._0}`);
        return true;
      }
      rawPacket.data = buf._0;
    }

    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientState.FullyConnected) {
      this.currentClient.packetQueue.push({ rawPacket });
      return true;
    }

    return false;
  }

  /* Used to prevent invisibility buff from being sent to the server
   * for used when the config is set to blockInvis = true */
  private handleAddPlayerBuff(playerBuffAdd: PlayerBuffAddPacket.t): boolean {
    let shouldBlockInvis = false;
    const blockInvis = this.currentClient.options.blockInvis;
    switch (blockInvis) {
      case true:
        shouldBlockInvis = true;
        break;
      case false:
        break;
      default:
        shouldBlockInvis = blockInvis.enabled && blockInvis.servers.some(server => server.toLowerCase() === this.currentClient.server.name.toLowerCase())
        break;
    }

    if (shouldBlockInvis) {
      return playerBuffAdd.buff === 10;
    } else {
      return false;
    }
  }

  /* Tracks the players inventory slots to restore them when they switch
   * from an SSC server to a Non-SSC server */
  private handlePlayerInventorySlot(playerInventorySlot: PlayerInventorySlotPacket.t): boolean {
    if ((this.currentClient.state === ClientState.FreshConnection || this.currentClient.state === ClientState.ConnectionSwitchEstablished) && !this.currentClient.waitingCharacterRestore) {
      const { slot, stack, prefix, itemType } = playerInventorySlot;
      this.currentClient.player.inventory[slot] = new Item(slot, stack, prefix, itemType);
    }

    return false;
  }

  /* Tracks the player mana to restore it when they switch from an
   * SSC server to a Non-SSC server */
  private handlePlayerMana(playerMana: PlayerManaPacket.t): boolean {
    if (!this.currentClient.player.allowedManaChange)
      return false;

    const { maxMana } = playerMana;
    this.currentClient.player.mana = maxMana;
    this.currentClient.player.allowedManaChange = false;

    return false;
  }

  /* Tracks the player HP to restore it when they switch from an
   * SSC server to a Non-SSC server */
  private handlePlayerHP(playerHealth: PlayerHealthPacket.t, rawPacket: RawPacket): boolean {
    if (!this.currentClient.player.allowedLifeChange) {
      return false;
    }

    const { maxHealth } = playerHealth;
    this.currentClient.player.life = maxHealth;
    this.currentClient.player.allowedLifeChange = false;

    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientState.FullyConnected) {
      this.currentClient.packetQueue.push({ rawPacket });
      return true;
    }

    return false;
  }

  private handleUpdatePlayer(_playerUpdate: PlayerUpdatePacket.t, rawPacket: RawPacket): boolean {
    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientState.FullyConnected) {
      this.currentClient.packetQueue.push({ rawPacket });
      return true;
    }

    return false;
  }

  /* Prevents the player sending the item drop packet too early
   * which causes them to be kicked. It also adds it to the packet queue
   * so that it may be sent when the client has fully connected (and wont
   * get kicked for sending it) */
  private handleUpdateItemDrop(_itemDropUpdate: ItemDropUpdatePacket.t, rawPacket: RawPacket): boolean {
    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientState.FullyConnected) {
      this.currentClient.packetQueue.push({ rawPacket });
      return true;
    }

    return false;
  }

  /* Prevents the player sending the item owner packet too early
   * which causes them to be kicked. It also adds it to the packet queue
   * so that it may be sent when the client has fully connected (and wont
   * get kicked for sending it)
   *
   * Note: This packet is important for tShock SSC to work. If this was
   *       prevented outright, SSC would be broken (inventory would be unchangable) */
  private handleUpdateItemOwner(_itemOwner: ItemOwnerPacket.t, rawPacket: RawPacket): boolean {
    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientState.FullyConnected) {
      this.currentClient.packetQueue.push({ rawPacket });
      return true;
    }

    return false;
  }

  private handleSpawnPlayer(_playerSpawn: PlayerSpawnPacket.t): boolean {
    if (this.currentClient.state === ClientState.FinishinedSendingInventory) {
      this.currentClient.state = ClientState.FullyConnected;
    }

    return false;
  }

  /* Handles when a net module update is sent from the client (used only for chat at this time) */
  private handleLoadNetModule(netModuleLoad: NetModuleLoadPacket.t): boolean {
    let handled = false;

    switch (netModuleLoad?.TAG) {
      case "ClientText":
        handled = this.handleChatMessage(netModuleLoad._1);
        break;
    }

    return handled;
  }

  /* Handles any commands sent by the client given they start with "/" */
  private handleChatMessage(chatMessage: string): boolean {
    let handled = false;

    // If chat message is a command
    if (chatMessage.length > 1 && chatMessage.substr(0, 1) === "/") {
      let command: Command = this.currentClient.globalHandlers.command.parseCommand(chatMessage);
      handled = this.currentClient.globalHandlers.command.handle(command, this.currentClient);
    }

    return handled;
  }

  /* Updates the clients current tracked UUID */
  private handleClientUUID(clientUuid: ClientUuidPacket.t): boolean {
    this.currentClient.UUID = clientUuid.uuid;

    return false;
  }

  /* Some packets should not be sent early to avoid kick for invalid operation at this state */
  private handlePotentialEarlyPacket(packet: RawPacket): boolean {
    // Prevent this being sent too early (causing kicked for invalid operation)
    if (this.currentClient.state !== ClientState.FullyConnected) {
      this.currentClient.packetQueue.push({
        rawPacket: {
          data: packet.data,
          packetType: packet.packetType
        }
      });
      return true;
    }

    return false;
  }

}

export default ClientPacketHandler;
