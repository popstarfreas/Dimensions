import ClientCommandHandler from './clientcommandhandler.js';
import ClientPacketHandler from './clientpackethandler.js';
import TerrariaServerPacketHandler from './terrariaserverpackethandler.js';
import Extension from './extension/index.js';
import { Dictionary } from './dictionary.js';

interface GlobalHandlers {
    command: ClientCommandHandler;
    clientPacketHandler: ClientPacketHandler;
    terrariaServerPacketHandler: TerrariaServerPacketHandler;
    extensions: Dictionary<Extension>
}

export default GlobalHandlers;