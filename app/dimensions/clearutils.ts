import Client from "./client.js";
import PacketTypes from "./packettypes.js";

import { PlayerActivePacket, NpcUpdatePacket, ItemDropUpdatePacket, NetModuleLoadPacket } from 'terraria-packet';

class ClearUtils {
  public static clearPlayers(client: Client): void {
    const playerIDs: string[] = Object.keys(client.server.entityTracking.players);
    for (var i = 0, len = playerIDs.length; i < len; i++) {
      if (parseInt(playerIDs[i]) === client.player.id)
        continue;

      ClearUtils.clearPlayer(client, parseInt(playerIDs[i]));
    }
  }

  public static clearPlayer(client: Client, playerIndex: number): void {
    const data = PlayerActivePacket.toBuffer({ playerId: playerIndex, active: false });
    if (data.TAG === "Error") {
      client.logging.error(`Error creating player active packet: ${data._0}`);
      return;
    }
    const playerActive = { packetType: PacketTypes.PlayerActive, data: data._0 };
    const playerActivePacket = client.server.getPacketHandler().handlePacket(client.server, playerActive);
    if (playerActivePacket !== null) {
      client.sendDirect(playerActivePacket);
    }
  }

  public static clearNPCs(client: Client): void {
    for (const npc of client.server.entityTracking.NPCs) {
      if (typeof npc !== "undefined") {
        ClearUtils.clearNPC(client, npc.index);
      }
    }
  }

  public static clearNPC(client: Client, npcIndex: number): void {
    const npc: NpcUpdatePacket.t = {
      npcSlotId: npcIndex,
      npcTypeId: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      target: 0,
      directionX: false,
      directionY: false,
      ai: [undefined, undefined, undefined, undefined],
      spriteDirection: false,
      life: {
        TAG: "Byte",
        _0: 0
      },
      releaseOwner: undefined,
      playerCountScale: undefined,
      strengthMultiplier: undefined,
      spawnedFromStatue: false
    }
    const data = NpcUpdatePacket.toBuffer(npc);
    if (data.TAG === "Ok") {
      const packet = { packetType: PacketTypes.NPCUpdate, data: data._0 };
      const finalPacket = client.server.getPacketHandler().handlePacket(client.server, packet);
      if (finalPacket !== null) {
        client.sendDirect(packet.data);
      }
    }
    client.server.entityTracking.NPCs[npcIndex] = undefined;
  }

  public static clearItems(client: Client): void {
    for (const item of client.server.entityTracking.items) {
      if (typeof item !== "undefined") {
        ClearUtils.clearItem(client, item.slot);
      }
    }
  }

  public static clearItem(client: Client, itemIndex: number): void {
    const data = ItemDropUpdatePacket.toBuffer({
      itemDropId: itemIndex,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      stack: 0,
      prefix: 0,
      noDelay: 0,
      itemId: 0
    });
    if (data.TAG === "Error") {
      client.logging.error(`Error creating item drop update packet: ${data._0}`);
      return;
    }
    const updateItemDrop = {
      data: data._0,
      packetType: PacketTypes.UpdateItemDrop,
    };
    const updateItemDropPacket = client.server.getPacketHandler().handlePacket(client.server, updateItemDrop);
    if (updateItemDropPacket !== null) {
      client.sendDirect(updateItemDropPacket);
    }
  }

  public static clearPylons(client: Client): void {
    for (const pylon of client.server.entityTracking.pylons) {
      if (typeof pylon !== "undefined") {
        ClearUtils.clearPylon(client, pylon.x, pylon.y, pylon.type);
      }
    }
  }

  public static clearPylon(client: Client, x: number, y: number, type: number): void {
    const data = NetModuleLoadPacket.toBuffer({
      TAG: "TeleportPylon",
      _0: {
        pylonAction: "Removed",
        x,
        y,
        pylonType: type
      }
    });
    if (data.TAG === "Ok") {
      const loadNetModule = {
        data: data._0,
        packetType: PacketTypes.LoadNetModule
      };
      const loadNetModulePacket = client.server.getPacketHandler().handlePacket(client.server, loadNetModule);
      if (loadNetModulePacket !== null) {
        client.sendDirect(loadNetModulePacket);
      }
    }
  }

  private static _godmodePowerDefault = false;
  private static _farPlacementRangePowerDefault = true;
  private static _spawnRateSliderDefault = 0.5;

  // These packets don't change and only need to be created once
  private static _journeyClearPackets = [
    // Per player powers activate before the destination server syncs them
    // when switching dimensions. Therefore, there is a brief moment when
    // they are active. To avoid this situation, they must be set to their
    // default values when switching dimensions
    NetModuleLoadPacket.toBuffer({
      TAG: "CreativePower",
      _0: {
        TAG: "GodmodePower",
        _0: {
          TAG: "Everyone",
          _0: Array(255).fill(this._godmodePowerDefault),
        },
      },
    }),
    NetModuleLoadPacket.toBuffer({
      TAG: "CreativePower",
      _0: {
        TAG: "FarPlacementRangePower",
        _0: {
          TAG: "Everyone",
          _0: Array(255).fill(this._farPlacementRangePowerDefault),
        },
      },
    }),
    ...Array.from({ length: 255 }, (_, i) => (
      NetModuleLoadPacket.toBuffer({
        TAG: "CreativePower",
        _0: {
          TAG: "SpawnRateSliderPerPlayerPower",
          _0: {
            playerId: i,
            value: this._spawnRateSliderDefault,
          },
        },
      })
    )),
  ];

  public static clearJourneyPowers(client: Client): void {
    const packets = [
      ...this._journeyClearPackets,
      NetModuleLoadPacket.toBuffer({
        TAG: "CreativePower",
        _0: {
          TAG: "GodmodePower",
          _0: {
            TAG: "Player",
            _0: client.player.id,
            _1: this._godmodePowerDefault
          }
        }
      }),
      NetModuleLoadPacket.toBuffer({
        TAG: "CreativePower",
        _0: {
          TAG: "FarPlacementRangePower",
          _0: {
            TAG: "Player",
            _0: client.player.id,
            _1: this._farPlacementRangePowerDefault
          }
        }
      })
    ];
    for (const buffer of packets) {
      if (buffer.TAG === "Ok") {
        const packet = {
          data: buffer._0,
          packetType: PacketTypes.LoadNetModule,
        };
        const processedData = client.server.getPacketHandler().handlePacket(client.server, packet);
        if (processedData !== null) {
          client.sendDirect(processedData);
        }
      }
    }
  }
}

export default ClearUtils;
