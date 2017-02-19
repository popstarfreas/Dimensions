import Packet from '../packet';
import Client from '../client';
import TerrariaServer from '../terrariaserver';
import ClientPacketHandler from '../extension/clientpackethandler';
import TerrariaServerPacketHandler from '../extension/terrariaserverpackethandler';

export interface PacketHandlers {
    clientHandler?: ClientPacketHandler;
    serverHandler?: TerrariaServerPacketHandler;
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