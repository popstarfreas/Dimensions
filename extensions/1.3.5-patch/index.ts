import PacketTypes from 'dimensions/packettypes';
import * as Net from 'net';
import TerrariaServer from 'dimensions/terrariaserver';
import Packet from 'dimensions/packet';
import Client from 'dimensions/client';
import Extension from 'dimensions/extension';
import PriorPacketHandler from './priorpackethandler';
import PostPacketHandler from './postpackethandler';

class Translator implements Extension {
    name: string;
    version: string;
    author: string;
    reloadable: boolean;
    priorPacketHandlers: PriorPacketHandler;
    postPacketHandlers: PostPacketHandler;

    constructor() {
        this.name = "Packet Translator for 1.3.4.4 -> 1.3.5";
        this.version = "v1.0";
        this.author = "popstarfreas";
        this.reloadable = false;
        this.priorPacketHandlers = new PriorPacketHandler(this);
        this.postPacketHandlers = new PostPacketHandler(this);
    }
}

export default Translator;