import * as Net from 'net';
import { TcpRttSample } from './types.js';

export interface TcpRttProvider {
  sample(socket: Net.Socket): TcpRttSample;
}

export default TcpRttProvider;
