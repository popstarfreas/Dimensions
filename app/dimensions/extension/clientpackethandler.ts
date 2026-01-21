import Client from '../client.js';
import RawPacket from '../packets/rawpacket.js';

class ClientPacketHandler {
    protected currentClient: Client | null;

    constructor() {
        this.currentClient = null;
    }

    handlePacket(client: Client, _packet: RawPacket): boolean {
        this.currentClient = client;
        return false;
    }
}

export default ClientPacketHandler;
