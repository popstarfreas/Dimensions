import PacketTypes from './packettypes.js';
import { getProperIP } from './utils.js';
import NPC from './npc.js';
import TerrariaServer from './terrariaserver.js';
import Client from './client.js';
import RawPacket from './packets/rawpacket.js';
import * as Net from 'net';
import Item from './item.js';
import Player from './player.js';
import ClientState from './clientstate.js';
import ErrorHelper from './errorhelper.js';

import { WorldInfoPacket, PlayerInfoPacket, NpcUpdatePacket, ItemDropUpdatePacket, PlayerSpawnPacket, NetModuleLoadPacket, DisconnectPacket, PlayerActivePacket, PlayerInventorySlotPacket, DimensionsUpdatePacket, Parser, } from "terraria-packet";
import NetworkText from '@popstarfreas/packetfactory/networktext';
import PacketWriter from '@popstarfreas/packetfactory/packetwriter';

// This describes who created this packet. Because when dimensions creates a packet
// to send to the client, it puts it through the terraria server packet handlers
// to make sure extensions can do something with it.
export enum PacketSource {
  TerrariaServer,
  Dimensions
}

/**
 * This handles all packets coming from a Terraria Server, sometimes responding instead of the client
 * to ensure a smooth and successful transition between servers (due to a client state prohibiting a
 * certain response)
 */
class TerrariaServerPacketHandler {
  private currentServer!: TerrariaServer;
  private socket?: Net.Socket;
  //private index = 0;

  /**
   * Checks whether the packet was handled by extensions prior to being processed by this class
   *
   * @param server The server object assigned to a player that is sending a packet
   * @param packet The packet that is being sent
   * @return Whether or not the packet was handled (and should not be sent)
   */
  private runPriorHandlers(server: TerrariaServer, packet: RawPacket, source: PacketSource): boolean {
    let handlers = server.client.globalHandlers.extensions;
    let handled = false;
    for (let key in handlers) {
      let handler = handlers[key];
      if (typeof handler.priorPacketHandlers !== 'undefined' && typeof handler.priorPacketHandlers.serverHandler !== 'undefined') {
        try {
          handled = handler.priorPacketHandlers.serverHandler.handlePacket(server, packet, source);
          if (handled) {
            break;
          }
        } catch (error) {
          if (server.client.options.log.extensionError) {
            const name = handler.name ?? key;
            const logMessage = `[${process.pid}] Extension ${name} Prior Server Packet Handler Error: ${ErrorHelper.toMessage(error)}`;
            server.client.logging.info(logMessage);
          }
        }
      }
    }

    return handled;
  }

  /**
   * Checks whether the packet was handled by extensions after being processed by this class
   *
   * @param server The server object assigned to a player that is sending a packet
   * @param packet The packet that is being sent
   * @return Whether or not the packet was handled (and should not be sent)
   */
  private runPostHandlers(server: TerrariaServer, packet: RawPacket, source: PacketSource): boolean {
    let handlers = server.client.globalHandlers.extensions;
    let handled = false;
    for (let key in handlers) {
      let handler = handlers[key];
      if (typeof handler.postPacketHandlers !== 'undefined' && typeof handler.postPacketHandlers.serverHandler !== 'undefined') {
        try {
          handled = handler.postPacketHandlers.serverHandler.handlePacket(server, packet, source);
          if (handled) {
            break;
          }
        } catch (error) {
          if (server.client.options.log.extensionError) {
            const name = handler.name ?? key;
            const logMessage = `[${process.pid}] Extension ${name} Post Server Packet Handler Error: ${ErrorHelper.toMessage(error)}`;
            server.client.logging.info(logMessage);
          }
        }
      }
    }

    return handled;
  }

  /**
   * Runs the packet through extension handlers and runs any appropriate handlers of this class
   *
   * @param server The server object assigned to a player that is sending a packet
   * @param packet The packet that is being sent
   * @return The packet data (either origin or modified)
   */
  public handlePacket(server: TerrariaServer, packet: RawPacket, source: PacketSource): Buffer | null {
    this.currentServer = server;

    let priorHandled: boolean = this.runPriorHandlers(server, packet, source);
    if (priorHandled) {
      return null;
    }

    // Parse everything except TileSectionSend because that is a big packet
    const parsedResult = Parser.parse(packet.data, true, [
      "TileSectionSend"
    ]);

    let handled: boolean = false;
    if (parsedResult.TAG === "Error") {
      const parseError = parsedResult._0;
      if (typeof parseError === "object") {
        switch (parseError.TAG) {
          case "ReaderError":
            if (parseError._0.error instanceof Error) {
              server.client.logging.error(`Error parsing packet: ${parseError._0.context} ${parseError._0.error.message}\n${packet.data.toString("hex")}`);
            } else {
              server.client.logging.error(`Error parsing packet: ${parseError._0.context}\n${packet.data.toString("hex")}`);
            }
            break;
          default:
            server.client.logging.error(`Error parsing packet: ${PacketTypes[packet.packetType]} ${parseError.TAG}\n${packet.data.toString("hex")}`);
            break;
        }
      } else {
        switch (parseError) {
          case "IgnoredPacket":
            server.client.logging.debug(`Ignoring packet: ${PacketTypes[packet.packetType]}`);
            break;
          default:
            server.client.logging.error(`Error parsing packet: ${PacketTypes[packet.packetType]} ${parseError}\n${packet.data.toString("hex")}`);
            break;
        }
      }
    } else {
      const parsed = parsedResult._0;

      if (!handled) {
        switch (parsed.TAG) {
          case "TileSectionFrame":
            handled = true;
            break;
          case "Disconnect":
            handled = this.handleDisconnect(parsed._0);
            break;
          case "PlayerSlotSet":
            handled = this.handleContinueConnecting(parsed._0.playerSlotId);
            break;
          case "WorldInfo":
            handled = this.handleWorldInfo(parsed._0);
            break;
          case "PlayerSpawnSelf":
            handled = this.handleCompleteConnectionAndSpawn();
            break;
          case "DimensionsUpdate":
            handled = this.handleDimensionsUpdate(parsed._0);
            break;
          case "NpcUpdate":
            handled = this.handleNPCUpdate(parsed._0);
            break;
          case "ItemDropInstancedUpdate":
            handled = this.handleUpdateItemDrop(parsed._0);
            break;
          case "ItemDropUpdate":
            handled = this.handleUpdateItemDrop(parsed._0);
            break;
          case "PlayerActive":
            handled = this.handlePlayerActive(parsed._0);
            break;
          case "PlayerInventorySlot":
            handled = this.handlePlayerInventorySlot(parsed._0, packet);
            break;
          case "PlayerInfo":
            handled = this.handlePlayerInfo(parsed._0, packet);
            break;
          case "NetModuleLoad":
            handled = this.handleLoadNetModule(parsed._0);
            break;
          default:
            break;
        }
      }
    }

    if (handled) {
      return null;
    }

    let postHandled: boolean = this.runPostHandlers(server, packet, source);
    if (postHandled) {
      return null;
    }

    return packet.data;
  }

  /**
   * Passes on the disconnect message as a chat message to the client, unless the client
   * has not fully connected to any Dimension yet.
   *
   * @param packet The disconnect packet
   * @return Whether or not this packet was handled (and should not be sent)
   */
  private handleDisconnect(disconnect: DisconnectPacket.t): boolean {
    const client = this.currentServer.client;

    let reason = new NetworkText(0, "Unknown Reason");
    reason = new NetworkText(disconnect.reason.mode, disconnect.reason.text);

    if (!client.ingame) {
      client.disconnect(reason);
    } else {
      var color = "C8FF00";
      var message = client.options.language.phrases.dimensionDisconnectedYou;
      const disconnectOnKick = client.options.disconnectOnKick;
      switch (disconnectOnKick.type) {
        case "always":
          client.disconnect(reason);
          return true;
        case "never":
          break;
        case "onKickReasonPrefix":
          for (const prefix of disconnectOnKick.kickReasonPrefixes) {
            if (reason.mode === 0 && reason.text.startsWith(prefix)) {
              client.disconnect(reason.text.substring(prefix.length));
              return true;
            }
          }
          break;
      }
      client.sendChatMessage(message, color);
      client.sendChatMessage(new NetworkText(1, client.options.language.phrases.reason + "{0}", [reason]), color);
      client.wasKicked = true;
      client.connected = false;

      if (this.socket) {
        this.socket.destroy();
      }
    }

    return true;
  }

  /**
   * Passes on the real IP of the client to the server
   *
   * @param packet The continue connecting packet
   * @return Whether or not this packet was handled (and should not be sent)
   */
  private handleContinueConnecting(playerId: number): boolean {
    this.currentServer.client.player.id = playerId;

    // Send IP Address
    if (!this.currentServer.isVanilla) {
      let ip: string = getProperIP(this.currentServer.client.socket.remoteAddress as string) as string;
      const packetData = new PacketWriter()
        .setType(PacketTypes.DimensionsUpdate)
        .packInt16(0) // Type
        .packString(ip)
        .data;

      this.currentServer.sendDirect(packetData);
    }

    return false;
  }

  /**
   * Restores player data and updates the SSC tracking
   *
   * @param packet The world info packet
   * @return Whether or not this packet was handled (and should not be sent)
   */
  private handleWorldInfo(worldInfo: WorldInfoPacket.t): boolean {
    this.currentServer.isSSC = worldInfo.eventInfo.serverSidedCharacters;

    if (this.currentServer.client.waitingCharacterRestore && !this.currentServer.isSSC) {
      this.restoreInventory(this.currentServer.client);
      this.restoreLife(this.currentServer.client);
      this.restoreMana(this.currentServer.client);
      this.restoreVisuals(this.currentServer.client);
    }
    this.currentServer.client.waitingCharacterRestore = false;

    if (this.currentServer.client.state === ClientState.ConnectionSwitchEstablished) {
      this.currentServer.spawn.x = worldInfo.spawnX;
      this.currentServer.spawn.y = worldInfo.spawnY;

      // In future it would be better to check if they used a warpplate
      // so the tile section is where they came through instead of spawn
      let getSection = new PacketWriter()
        .setType(PacketTypes.GetSectionOrRequestSync)
        .packSingle(-1)
        .packSingle(-1)
        .data;
      this.currentServer.sendDirect(getSection);

      this.currentServer.client.state = ClientState.FinalisingSwitch;

      // Routing Information for Warpplate entry
      if (this.currentServer.client.routingInformation !== null) {
        let dimensionsUpdate = new PacketWriter()
          .setType(PacketTypes.DimensionsUpdate)
          .packInt16(this.currentServer.client.routingInformation.type)
          .packString(this.currentServer.client.routingInformation.info)
          .data;
        this.currentServer.sendDirect(dimensionsUpdate);
        this.currentServer.client.routingInformation = null;
      }
    }

    return false;
  }

  /**
   * Ensures the player spawns correctly by sending the SpawnPlayer packet
   * that forces them to spawn if they're already in-game (on the world
   *
   * @param _packet The complete connection and spawn packet
   * @return Whether or not the packet has been handled (and is not to be sent)
   */
  private handleCompleteConnectionAndSpawn(): boolean {
    let server: TerrariaServer = this.currentServer;
    if (this.currentServer.client.state === ClientState.FinalisingSwitch) {
      this.currentServer.client.state = ClientState.FinishinedSendingInventory;
      let spawnPlayer = PlayerSpawnPacket.toBuffer({
        playerId: this.currentServer.client.player.id,
        x: this.currentServer.spawn.x,
        y: this.currentServer.spawn.y,
        context: "SpawningIntoWorld",
        timeRemaining: 0,
        numberOfDeathsPve: 0,
        numberOfDeathsPvp: 0,
        team: 0,
      })

      if (spawnPlayer.TAG === "Error") {
        this.currentServer.client.logging.error(`Error creating spawn player packet: ${spawnPlayer._0}`);
        return true;
      }

      if (typeof server.client !== 'undefined' && typeof server.client.socket !== 'undefined') {
        server.sendDirect(spawnPlayer._0);

        if (!server.client.preventSpawnOnJoin) {
          server.client.sendDirect(spawnPlayer._0);
        }
      }
    }


    if (server.client.state === ClientState.FinishinedSendingInventory) {
      server.client.state = ClientState.FullyConnected;
      server.client.sendWaitingPackets();
      server.sendWaitingPackets();
      server.client.sendExtraInformation();

      for (let key in server.client.globalHandlers.extensions) {
        const e = server.client.globalHandlers.extensions[key];
        if (e.clientFullyConnectedHandler) {
          try {
            e.clientFullyConnectedHandler(server.client);
          } catch (error) {
            if (server.client.options.log.extensionError) {
              const name = e.name ?? key;
              const logMessage = `[${process.pid}] Extension ${name} Client Fully Connected Handler Error: ${ErrorHelper.toMessage(error)}`;
              server.client.logging.info(logMessage);
            }
          }
        }
      }
    }

    this.currentServer.client.ingame = true;
    return false;
  }

  /**
   * Handles the event that a warpplate requests switch of Dimension
   *
   * @param packet The dimensions update packet
   * @return Whether or not the packet has been handled (and is not to be sent)
   */
  private handleDimensionsUpdate(dimensionsUpdate: DimensionsUpdatePacket.t): boolean {
    switch (dimensionsUpdate) {
      case "GamemodesJoinMode":
        return true;
      default:
        switch (dimensionsUpdate.TAG) {
          case "RealIpAddress":
            return true;
          case "SwitchServer":
            if (this.currentServer.client.servers[dimensionsUpdate._0.toLowerCase()]) {
              const phrases = this.currentServer.client.options.language.phrases;
              this.currentServer.client.sendChatMessage(phrases.shiftingToDimension.replace("${name}", dimensionsUpdate._0), "FF0000");
              this.currentServer.client.changeServer(this.currentServer.client.servers[dimensionsUpdate._0.toLowerCase()], {
                preventSpawnOnJoin: false
              });
            }
            return true;
          case "SwitchServerManual":
            const currentServerIp = this.currentServer.socket.remoteAddress;
            let ip = dimensionsUpdate._0;
            const port: number = dimensionsUpdate._1;
            if (ip === "127.0.0.1" && typeof currentServerIp !== "undefined") {
              ip = currentServerIp;
            }
            this.currentServer.client.changeServer({
              name: `${ip}:${port}`,
              serverIP: ip,
              serverPort: port,
              hidden: false,
              isVanilla: false,
            }, {
              preventSpawnOnJoin: false
            });
            return true;
          default:
            return true;
        }
    }
  }

  /**
   * Tracks whether an NPC is alive or not, so it can be cleared when the player switches Dimensions
   *
   * @param packet The NPC Update
   * @return Whether or not the packet has been handled (and is not to be sent)
   */
  private handleNPCUpdate(npcUpdate: NpcUpdatePacket.t): boolean {
    const { npcSlotId, npcTypeId, life } = npcUpdate;

    let zeroLife = false;
    if (life != "Max") {
      zeroLife = life._0 === 0;
    }
    if (npcTypeId === 0 || zeroLife) {
      this.currentServer.entityTracking.NPCs[npcSlotId] = undefined;
    } else {
      let npc: NPC | undefined = this.currentServer.entityTracking.NPCs[npcSlotId]
      if (npc === undefined) {
        this.currentServer.entityTracking.NPCs[npcSlotId] = new NPC(npcSlotId, npcTypeId, life === "Max" ? 1 : life._0);
      } else {
        npc.life = life === "Max" ? 1 : life._0;
        npc.type = npcTypeId;
      }
    }

    return false;
  }

  /**
   * Tracks item drops so they can be cleared when the player switches Dimensions
   *
   * @param packet The update item drop packet
   * @return Whether or not this packet was handled (and should not be sent)
   */
  private handleUpdateItemDrop(itemDropUpdate: ItemDropUpdatePacket.t): boolean {
    const { itemDropId, stack, prefix, itemId } = itemDropUpdate;
    if (itemDropId > 0) {
      this.currentServer.entityTracking.items[itemDropId] = new Item(itemDropId, stack, prefix, itemId);
    } else {
      this.currentServer.entityTracking.items[itemDropId] = undefined;
    }
    return false;
  }

  /**
   * Tracks which players are active so they can be cleared when a player switches Dimensions
   *
   * @param packet The player active packet
   * @return Whether or not this packet was handled (and should not be sent)
   */
  private handlePlayerActive(playerActive: PlayerActivePacket.t): boolean {
    let player: Player | undefined = undefined;
    if (playerActive.active) {
      player = new Player(null);
    }
    this.currentServer.entityTracking.players[playerActive.playerId] = player;

    return false;
  }

  /**
   * Holds back slot updates until player is ready to spawn for the first time
   * on the current Dimension
   *
   * @param packet The player inventory slot packet
   */
  private handlePlayerInventorySlot(inventorySlot: PlayerInventorySlotPacket.t, rawPacket: RawPacket): boolean {
    let handled = false;
    const { playerId } = inventorySlot;
    if (playerId === this.currentServer.client.player.id) {
      if (this.currentServer.client.state !== ClientState.FullyConnected) {
        this.currentServer.packetQueue.push({
          rawPacket: {
            data: rawPacket.data,
            packetType: rawPacket.packetType
          }
        });
        handled = true;
      }
    }

    return handled;
  }

  private handlePlayerInfo(playerInfo: PlayerInfoPacket.t, rawPacket: RawPacket): boolean {
    const nameMismatchesRequireRewrite = this.currentServer.client.options.nameChanges?.mode === "rewrite";
    const isAboutCurrentClient = playerInfo.playerId === this.currentServer.client.player.id;
    const isMismatchedName = this.currentServer.client.player.name !== playerInfo.name;
    const isAllowedToRename = (this.currentServer.client.options.nameChanges?.exclusions.indexOf(this.currentServer.name) ?? -1) > -1;
    if (nameMismatchesRequireRewrite && isAboutCurrentClient && isMismatchedName) {
      if (!isAllowedToRename) {
        const playerInfoPacket = PlayerInfoPacket.toBuffer({ ...playerInfo, name: this.currentServer.client.player.name });
        if (playerInfoPacket.TAG === "Ok") {
          rawPacket.data = playerInfoPacket._0;
        }
      } else {
        this.currentServer.client.setName(playerInfo.name);
      }
    }

    return false;
  }

  private handleLoadNetModule(loadNetModule: NetModuleLoadPacket.t): boolean {
    switch (loadNetModule.TAG) {
      case "TeleportPylon":
        const value = loadNetModule;
        const { pylonAction, x, y, pylonType } = value._0;
        switch (pylonAction) {
          case "Added":
            this.currentServer.entityTracking.pylons.push({
              x: x,
              y: y,
              type: pylonType
            });
            break;
          case "Removed":
            this.currentServer.entityTracking.pylons = this.currentServer.entityTracking.pylons.filter(pylon => {
              pylon.x !== x || pylon.y !== y || pylon.type !== pylonType;
            });
            break;
          case "RequestTeleport":
            break;
        }
        break;

      default:
        break;
    }
    return false;
  }

  /**
   * Sets the players slots back to what they were before they joined the SSC server.
   * Used when a player switches from an SSC server to a non-SSC server
   *
   * @param client Which client is getting its inventory restored
   */
  private restoreInventory(client: Client): void {
    for (const item of this.currentServer.client.player.inventory) {
      if (typeof item !== "undefined") {
        client.player.setItem(item);
      }
    }
  }

  /**
   * Sets the players life back to what they were before they joined the SSC server.
   * Used when a player switches from an SSC server to a non-SSC server
   *
   * @param client Which client is getting its life restored
   */
  private restoreLife(client: Client): void {
    client.player.restoreSavedMaxHealth();
  }

  /**
   * Sets the players mana back to what they were before they joined the SSC server.
   * Used when a player switches from an SSC server to a non-SSC server
   *
   * @param client Which client is getting its mana restored
   */
  private restoreMana(client: Client): void {
    client.player.restoreSavedMaxMana();
  }

  /**
   * Sets the players visuals back to what they were before they joined the SSC server.
   * Used when a player switches from an SSC server to a non-SSC server
   *
   * @param client Which client is getting its visuals restored
   */
  private restoreVisuals(client: Client): void {
    client.player.setVisuals();
  }
};

export default TerrariaServerPacketHandler;
