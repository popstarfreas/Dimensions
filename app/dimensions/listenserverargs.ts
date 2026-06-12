import GlobalHandlers from './globalhandlers.js';
import ServerDetails from './serverdetails.js';
import RoutingServer from './routingserver.js';
import GlobalTracking from './globaltracking.js';
import Blacklist from './blacklist.js';
import { ConfigOptions, ConfigListenServer } from './configloader.js';
import * as winston from 'winston';
import TcpRttMonitor from './tcprtt/tcprttmonitor.js';

export interface ConnectionRateLimitEntry {
  count: number;
  expiresAtMs: number;
}

export interface ListenServerArgs {
  info: ConfigListenServer;
  serversDetails: { [id: string]: ServerDetails };
  globalHandlers: GlobalHandlers;
  servers: { [id: string]: RoutingServer };
  options: ConfigOptions;
  globalTracking: GlobalTracking;
  logging: winston.Logger;
  blacklist?: Blacklist;
  connectionsTracker: Map<string, number>;
  connectRateTracker: Map<string, ConnectionRateLimitEntry>;
  tcpRttMonitor?: TcpRttMonitor;
};

export default ListenServerArgs;
