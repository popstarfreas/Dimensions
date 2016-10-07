import ClientCommandHandler from './clientcommandhandler';
import ClientPacketHandler from './clientpackethandler';
import TerrariaServerPacketHandler from './terrariaserverpackethandler';
import Extensions from './extentions';

interface GlobalHandlers {
    command: ClientCommandHandler;
    clientPacketHandler: ClientPacketHandler;
    terrariaServerPacketHandler: TerrariaServerPacketHandler;
    extensions: Extensions; 
}

export default GlobalHandlers;