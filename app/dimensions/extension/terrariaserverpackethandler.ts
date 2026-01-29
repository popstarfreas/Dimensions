import TerrariaServer from '../terrariaserver.js';
import RawPacket from '../packets/rawpacket.js';
import { PacketSource } from '../terrariaserverpackethandler.js';

class TerrariaServerPacketHandler {
    protected currentServer: TerrariaServer | null;

    constructor() {
        this.currentServer = null;
    }

    public handlePacket(server: TerrariaServer, _packet: RawPacket, _source: PacketSource): boolean {
        this.currentServer = server;
        return false;
    }
}

export default TerrariaServerPacketHandler;
