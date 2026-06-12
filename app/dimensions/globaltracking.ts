import { TcpRttTracking } from './tcprtt/types.js';

interface GlobalTracking {
    names: { [name: string]: boolean };
    tcpRtt: TcpRttTracking;
}

export default GlobalTracking;
