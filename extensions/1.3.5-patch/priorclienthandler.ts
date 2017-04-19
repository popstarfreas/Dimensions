import ClientPacketHandler from 'dimensions/extension/clientpackethandler';
import Client from 'dimensions/client';
import Packet from 'dimensions/packet';
import PacketTypes from 'dimensions/packettypes';
import PacketWriter from 'dimensions/packets/packetwriter';
import PacketReader from 'dimensions/packets/packetreader';
import Translator from './';
import Utils from './utils';
import PlayerDeathReason from './playerdeathreason';
import BitsByte from './bitsbyte';
import NetworkText from 'dimensions/packets/networktext';

class PriorClientHandler extends ClientPacketHandler {
    protected _translator: Translator;

    constructor(translator: Translator) {
        super();
        this._translator = translator;
    }

    public handlePacket(client: Client, packet: Packet): boolean {
        let handled = false;
        handled = this.handleIncompatiblePacket(client, packet);

        return handled;
    }

    protected handleIncompatiblePacket(client: Client, packet: Packet): boolean {
        let handled = false;
        switch (packet.packetType) {
            case PacketTypes.SmartChatMessage:
                this.handleSmartChatMessage(client, packet);
                break;
            case PacketTypes.LoadNetModule:
                this.handleLoadNetModule(client, packet);
                break;
        }

        return handled;    
    }

    protected handleSmartChatMessage(client: Client, packet: Packet): boolean {
        let reader = new PacketReader(packet.data);
        let messageColor = reader.readColor();
        let message = NetworkText.Deserialize(reader).ToString();
        let messageLength = reader.readInt16();

        let smartChatMessage = new PacketWriter()
            .setType(PacketTypes.SmartChatMessage)
            .packByte(0)
            .packColor(messageColor)
            .packString(message)
            .packInt16(messageLength)
            .data;

        packet.data = smartChatMessage;
        return false;
    }

    protected handleLoadNetModule(client: Client, packet: Packet): boolean {
        let reader = new PacketReader(packet.data);
        let key = reader.readUInt16();
        let commandId = reader.readString();
        let text = reader.readString();

        let chatMessage = new PacketWriter()
            .setType(PacketTypes.ChatMessage)
            .packByte(0)
            .packColor({R: 0, G: 0, B: 0})
            .packString(text)
            .data;
        
        client.handleDataSend(new Buffer(chatMessage, 'hex'));
        return true;
    }
}

export default PriorClientHandler;