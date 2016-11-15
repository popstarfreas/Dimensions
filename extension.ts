import Packet from './packet';
import Client from './client';
import TerrariaServer from './terrariaserver';

interface Extension {
    priorPacketHandlers: {
        client: (client: Client, packet: Packet) => boolean;
        server: (server: TerrariaServer, packet: Packet) => boolean;
    },
    postPacketHandlers: {
        client: (client: Client, packet: Packet) => boolean;
        server: (server: TerrariaServer, packet: Packet) => boolean;
    }
}

export default Extension;