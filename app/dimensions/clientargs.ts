import * as Net from 'net';
import RoutingServer from './routingserver.js';
import ServerDetails from './serverdetails.js';
import GlobalHandlers from './globalhandlers.js';
import { ConfigOptions } from './configloader.js';
import GlobalTracking from './globaltracking.js';
import * as winston from 'winston';

export interface ClientArgs {
    id: string,
    socket: Net.Socket,
    server: RoutingServer,
    serversDetails: { [id: string]: ServerDetails },
    globalHandlers: GlobalHandlers,
    servers: { [id: string]: RoutingServer },
    options: ConfigOptions,
    globalTracking: GlobalTracking,
    logging: winston.Logger
}

export default ClientArgs;
