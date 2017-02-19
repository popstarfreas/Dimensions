import Client from '../client';
import Packet from '../packet';

class ClientPacketHandler {
    protected currentClient: Client | null;

    constructor() {
        this.currentClient = null;
    }

    handlePacket(client: Client, packet: Packet): boolean {
        this.currentClient = client;
        return false;
    }
}

export default ClientPacketHandler;