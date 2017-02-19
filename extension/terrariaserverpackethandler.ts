import TerrariaServer from '../terrariaserver';
import Packet from '../packet';

class TerrariaServerPacketHandler {
    protected currentServer: TerrariaServer | null;

    constructor() {
        this.currentServer = null;
    }

    handlePacket(server: TerrariaServer, packet: Packet): boolean {
        this.currentServer = server;
        return false;
    }
}

export default TerrariaServerPacketHandler;