import Client from '../client.js';
import ClientPacketHandler from './clientpackethandler.js';
import TerrariaServerPacketHandler from './terrariaserverpackethandler.js';
import ListenServer from '../listenserver.js';
import TerrariaServer from '../terrariaserver.js';
import { Socket } from 'net';
import RawPacket from '../packets/rawpacket.js';
import ClientArgs from '../clientargs.js';
import { TcpRttSample } from '../tcprtt/types.js';
export { PacketSource } from '../terrariaserverpackethandler.js';

export interface PacketHandler {
    clientHandler?: ClientPacketHandler;
    serverHandler?: TerrariaServerPacketHandler;
}

export type ClientConnectedEvent = (client: Client) => void;
export type ClientDisconnectEvent = (client: Client) => void;
export type ClientErrorHandler = (client: Client, error: Error) => boolean;
export type SendPacketToClientEvent = (client: Client, packet: Buffer) => void;
export type ServerErrorHandler = (server: TerrariaServer, error: Error) => boolean;
export type ServerDisconnectHandler = (server: TerrariaServer) => boolean;
export type SendPacketToServerEvent = (server: TerrariaServer, packet: Buffer) => void;
export type SocketConnectPreHandler = (socket: Socket) => Promise<boolean>;
export type SocketConnectPostHandler = (socket: Socket) => void;
export type ClientFullyConnectedHandler = (client: Client) => void;
export type ClientTcpRttUpdateEvent = (client: Client, sample: TcpRttSample) => void;
export type SocketClosePreHandler = (socket: Socket, client: Client) => boolean;
export type SocketClosePostHandler = (socket: Socket, client: Client) => void;

// BlacklistCheckClient packet hooks
export enum BlacklistCheckState {
    AssignedClientId = 'AssignedClientId',
    SentPlayerInfo = 'SentPlayerInfo',
    SentUuid = 'SentUuid',
}

export interface BlacklistCheckContext {
    socket: Socket;
    clientArgs: ClientArgs;
    state: BlacklistCheckState;
}

export type BlacklistCheckPacketPreHandler = (
    context: BlacklistCheckContext,
    packet: RawPacket
) => boolean;

export type BlacklistCheckPacketPostHandler = (
    context: BlacklistCheckContext,
    packet: RawPacket
) => boolean;

// Raw socket write hooks (for writes before Client exists)
export enum RawSocketWriteReason {
    BlacklistCheck = 'blacklistCheck',
    ConnectionLimitExceeded = 'connectionLimitExceeded',
    BlacklistCheckClientSetup = 'blacklistCheckClientSetup',
    Other = 'other',
}

export interface RawSocketWriteContext {
    socket: Socket;
    remoteAddress?: string;
    reason: RawSocketWriteReason;
    clientArgs?: ClientArgs;
}

export interface RawSocketWritePacket {
    packet: Buffer;
}

export type RawSocketWritePreHandler = (
    context: RawSocketWriteContext,
    packet: RawSocketWritePacket
) => boolean;

export type RawSocketWritePostHandler = (
    context: RawSocketWriteContext,
    packet: RawSocketWritePacket
) => void;

export interface Extension<T = undefined> {
    name: string;
    version: string;
    author: string;
    reloadable: boolean;
    reloadName?: string;
    setListenServers?: (listenServers: { [name: string]: ListenServer }) => void;

    // Unload is called before the Extension is considered not part of the application
    // The extension is responsible for cleaning up resources
    unload?: () => T;

    // Load is called when the Extension is considered to be part of the application
    load?: (storage: T) => void;

    // Reloading
    reload?: (require: any) => void;

    // Packet Handling
    priorPacketHandlers?: PacketHandler;
    postPacketHandlers?: PacketHandler;

    // Error Handling
    clientErrorHandler?: ClientErrorHandler;
    serverErrorHandler?: ServerErrorHandler;

    socketConnectPreHandler?: SocketConnectPreHandler;
    socketConnectPostHandler?: SocketConnectPostHandler;

    clientFullyConnectedHandler?: ClientFullyConnectedHandler;
    clientTcpRttUpdateEvent?: ClientTcpRttUpdateEvent;

    sendPacketToClientEvent?: SendPacketToClientEvent;
    sendPacketToServerEvent?: SendPacketToServerEvent;

    clientConnectEvent?: ClientConnectedEvent;
    clientDisconnectEvent?: ClientDisconnectEvent;

    // Socket close Handling
    socketClosePreHandler?: SocketClosePreHandler;
    socketClosePostHandler?: SocketClosePostHandler;
    serverDisconnectPreHandler?: ServerDisconnectHandler;
    serverDisconnectHandler?: ServerDisconnectHandler;

    // BlacklistCheckClient packet hooks
    blacklistCheckPacketPreHandler?: BlacklistCheckPacketPreHandler;
    blacklistCheckPacketPostHandler?: BlacklistCheckPacketPostHandler;

    // Raw socket write hooks (for writes before Client exists)
    rawSocketWritePreHandler?: RawSocketWritePreHandler;
    rawSocketWritePostHandler?: RawSocketWritePostHandler;
}

export default Extension;
