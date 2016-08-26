import ClientCommandHandler from './clientcommandhandler';
import ClientPacketHandler from './clientpackethandler';
import TerrariaServerPacketHandler from './terrariaserverpackethandler';

interface GlobalHandlers {
    command: ClientCommandHandler;
    clientPacketHandler: ClientPacketHandler;
    terrariaServerPacketHandler: TerrariaServerPacketHandler;
}

export default GlobalHandlers;