import Packet from 'packet';
import Client from 'client';
import TerrariaServer from 'terrariaserver';

type ClientPacketHandler = (client: Client, packet: Packet) => boolean;
type ServerPacketHandler = (server: TerrariaServer, packet: Packet) => boolean;

export interface PacketHandlers {
    client?: ClientPacketHandler;
    server?: ServerPacketHandler;
}

type ClientErrorHandler = (client: Client, error: Error) => boolean;
type ServerErrorHandler = (server: TerrariaServer, error: Error) => boolean;
type ClientDisconnectHandler = (client: Client) => boolean;
type ServerDisconnectHandler = (server: TerrariaServer) => boolean;

export interface Extension {
    name: string;
    version: string;
    author: string;
    reloadable: boolean;
    reloadName?: string;

    // Reloading
    reload?: (require: any) => void;

    // Packet Handling
    priorPacketHandlers: PacketHandlers,
    postPacketHandlers: PacketHandlers

    // Error Handling
    clientErrorHandler?: ClientErrorHandler,
    serverErrorHandler?: ServerErrorHandler

    // Socket close Handling
    clientDisconnectPreHandler?: ClientDisconnectHandler,
    clientDisconnectHandler?: ClientDisconnectHandler,
    serverDisconnectPreHandler?: ServerDisconnectHandler
    serverDisconnectHandler?: ServerDisconnectHandler
}

export default Extension;