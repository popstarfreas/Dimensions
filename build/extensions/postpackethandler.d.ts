import { PacketHandler } from "dimensions/extension";
import Translator from "./";
import PostServerHandler from "./priorserverhandler";
declare class PostPacketHandler implements PacketHandler {
    serverHandler: PostServerHandler;
    constructor(translator: Translator);
}
export default PostPacketHandler;
