import { Socket } from "net";

interface SocketHandler {
    preConnect: (socket: Socket) => Promise<boolean>;
    postConnect: (socket: Socket) => void;
}

export default SocketHandler;
