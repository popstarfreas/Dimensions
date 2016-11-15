import ClientCommandHandler from 'clientcommandhandler';
import ClientPacketHandler from 'clientpackethandler';
import TerrariaServerPacketHandler from 'terrariaserverpackethandler';
import Extension from 'extension';

interface GlobalHandlers {
    command: ClientCommandHandler;
    clientPacketHandler: ClientPacketHandler;
    terrariaServerPacketHandler: TerrariaServerPacketHandler;
    extensions: Extension[];
}

export default GlobalHandlers;