/// <reference types="node" />
import ListenServer from "dimensions/listenserver";
import Extension from "dimensions/extension";
import PriorPacketHandler from "./priorpackethandler";
import Client from "dimensions/client";
import { Socket } from "net";
import PostPacketHandler from "./postpackethandler";
declare class MobileTranslator implements Extension {
    name: string;
    version: string;
    author: string;
    reloadable: boolean;
    priorPacketHandlers: PriorPacketHandler;
    postPacketHandlers: PostPacketHandler;
    listenServers: {
        [name: string]: ListenServer;
    };
    clients: Set<Client>;
    constructor();
    setListenServers(listenServers: {
        [name: string]: ListenServer;
    }): void;
    socketClosePostHandler(socket: Socket, client: Client): void;
}
export default MobileTranslator;
