import Client from './client';
import Packet from './packet';

interface ClientHandlerExtension {
    handlePacket: (client: Client, packet: Packet) => boolean;
}

export default ClientHandlerExtension;