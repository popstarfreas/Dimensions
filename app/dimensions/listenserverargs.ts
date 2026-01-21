import GlobalHandlers from './globalhandlers.js';
import ServerDetails from './serverdetails.js';
import RoutingServer from './routingserver.js';
import GlobalTracking from './globaltracking.js';
import Blacklist from './blacklist.js';
import { ConfigOptions, ConfigListenServer } from './configloader.js';
import * as winston from 'winston';

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
  connectRateTracker: Map<string, number>;
};

export default ListenServerArgs;
