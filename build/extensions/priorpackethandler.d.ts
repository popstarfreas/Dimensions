import { PacketHandler } from "dimensions/extension";
import Translator from "./";
import PriorClientHandler from "./priorclienthandler";
declare class PriorPacketHandler implements PacketHandler {
    clientHandler: PriorClientHandler;
    constructor(translator: Translator);
}
export default PriorPacketHandler;
