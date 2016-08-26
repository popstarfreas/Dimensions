import RoutingServer from './routingserver';

export interface ConfigServer {
  listenPort: number;
  routingServers: RoutingServer[];
}

export interface ConfigOptions {
  fakeVersion: boolean;
  fakeVersionNum: number;
  blockInvis: boolean;
}

export interface Config {
  servers: ConfigServer[];
  options: ConfigOptions;
}


export const ConfigSettings: Config = {
  servers: [
    {
      listenPort: 3000,
      routingServers: [{
        name: "ExampleServer",
        serverIP: "127.0.0.1",
        serverPort: 7777,
      }]
    },
  ],

  options: {
    fakeVersion: false,
    fakeVersionNum: 169,
    blockInvis: true
  }
};