import Client from './client';
import Packet from './packet';

interface ClientType {
    currentClient: Client;
    handlePacket(client: Client, packet: Packet): string;
}

interface PacketHandlerTypes {
    Client: ClientType;
}

export default PacketHandlerTypes;