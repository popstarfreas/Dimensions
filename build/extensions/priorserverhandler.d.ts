import TerrariaServerPacketHandler from "dimensions/extension/terrariaserverpackethandler";
import Packet from "dimensions/packet";
import TerrariaServer from "dimensions/terrariaserver";
import Translator from "./";
declare class PriorServerHandler extends TerrariaServerPacketHandler {
    protected _translator: Translator;
    constructor(translator: Translator);
    handlePacket(server: TerrariaServer, packet: Packet): boolean;
    private handleDisconnect;
    private handleWorldInfo;
    private handleStatus;
}
export default PriorServerHandler;
