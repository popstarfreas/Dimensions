import ClientPacketHandler from './clientpackethandler';
import ServerPacketHandler from './serverpackethandler';

interface ExtensionHandlers {
    client: ClientPacketHandler[];
    server: ServerPacketHandler[];
}

export default ExtensionHandlers;