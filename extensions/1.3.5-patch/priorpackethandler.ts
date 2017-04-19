import PriorClientHandler from './priorclienthandler';
import {PacketHandler} from 'dimensions/extension';
import Translator from './';

class PriorPacketHandler implements PacketHandler {
    clientHandler: PriorClientHandler;

    constructor(translator: Translator) {
        this.clientHandler = new PriorClientHandler(translator);
    }
}

export default PriorPacketHandler;