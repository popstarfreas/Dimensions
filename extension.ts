import Packet from 'packet';
import Client from 'client';
import TerrariaServer from 'terrariaserver';

type ClientPacketHandler = (client: Client, packet: Packet) => boolean;
type ServerPacketHandler = (server: TerrariaServer, packet: Packet) => boolean;

export interface PacketHandlers {
    client?: ClientPacketHandler;
    server?: ServerPacketHandler;
}

export interface Extension {
    name: string;
    version: string;
    author: string;
    priorPacketHandlers: PacketHandlers,
    postPacketHandlers: PacketHandlers
}

export default Extension;