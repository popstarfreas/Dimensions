import ClientPacketHandler from 'dimensions/extension/clientpackethandler';
import Client from 'dimensions/client';
import Packet from 'dimensions/packet';
import Translator from './';
declare class PriorClientHandler extends ClientPacketHandler {
    protected _translator: Translator;
    constructor(translator: Translator);
    handlePacket(client: Client, packet: Packet): boolean;
    protected handleIncompatiblePacket(client: Client, packet: Packet): boolean;
    protected handleConnectRequest(client: Client, packet: Packet): boolean;
}
export default PriorClientHandler;
