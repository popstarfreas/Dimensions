import PostServerHandler from './postserverhandler';
import {PacketHandler} from 'dimensions/extension';
import Translator from './';

class PostPacketHandlers implements PacketHandler {
    serverHandler: PostServerHandler;

    constructor(translator: Translator) {
        this.serverHandler = new PostServerHandler(translator);
    }
}

export default PostPacketHandlers;