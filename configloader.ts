import RoutingServer from './routingserver';

export interface ConfigServer {
  listenPort: number;
  routingServers: RoutingServer[];
}

export interface LogOptions {
  clientTimeouts: boolean;
  clientConnect: boolean;
  clientDisconnect: boolean;
  clientError: boolean;
  tServerConnect: boolean;
  tServerDisconnect: boolean;
  tServerError: boolean;
  clientBlocked: boolean;
}

export interface ConfigOptions {
  clientTimeout: number;
  currentVersion: number;
  fakeVersion: boolean;
  fakeVersionNum: number;
  blockInvis: boolean;
  useBlacklist: boolean;
  blacklistAPIKey: string;
  log: LogOptions;
}

export interface Config {
  servers: ConfigServer[];
  options: ConfigOptions;
}


export const ConfigSettings: Config = require(`../config.js`).ConfigSettings;