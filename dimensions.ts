///<reference path="./typings/index.d.ts"/>
import * as redis from "redis";
import RoutingServer from "./routingserver";
import ListenServer from "./listenserver";
import {ConfigSettings, Config, ConfigOptions} from "./configloader";
import Client from "./client";
import {requireNoCache} from "./utils";
import * as _ from "lodash";
import ClientCommandHandler from "./clientcommandhandler";
import ClientPacketHandler from "./clientpackethandler";
import TerrariaServerPacketHandler from "./terrariaserverpackethandler";
import ServerDetails from "./serverdetails";
import GlobalHandlers from "./globalhandlers";
import ReloadTask from "./reloadtask";
import GlobalTracking from "./globaltracking";

class Dimensions {
  servers: { [id: string]: RoutingServer };
  options: ConfigOptions;
  listenServers: { [id: number]: ListenServer };
  handlers: GlobalHandlers;
  redisClient: redis.RedisClient;
  serversDetails: { [id: string]: ServerDetails };
  globalTracking: GlobalTracking;

  constructor() {
    this.options = ConfigSettings.options;
    this.handlers = {
      command: new ClientCommandHandler(),
      clientPacketHandler: new ClientPacketHandler(),
      terrariaServerPacketHandler: new TerrariaServerPacketHandler()
    };

    this.redisClient = redis.createClient();
    this.redisClient.subscribe('dimensions_cli');
    this.redisClient
      .on('message', (channel: string, message: string) => {
        if (channel === "dimensions_cli") {
          this.handleCommand(message);
        }
      })
      .on('error', (err: Error) => {
        console.log("RedisError: " + err);
      });

    this.serversDetails = {};
    this.listenServers = {};
    this.servers = {};
    this.globalTracking = {};


    //self.interface = new Interface(self.handleCommand.bind(self));

    for (let i: number = 0; i < ConfigSettings.servers.length; i++) {
      let listenKey = ConfigSettings.servers[i].listenPort;
      this.listenServers[listenKey] = new ListenServer(ConfigSettings.servers[i], this.serversDetails, this.handlers, this.servers, this.options, this.globalTracking);

      for (let j: number = 0; j < ConfigSettings.servers[i].routingServers.length; j++) {
        this.servers[ConfigSettings.servers[i].routingServers[j].name] = ConfigSettings.servers[i].routingServers[j];
      }
    }

    /*setInterval(function() {
      self.printServerCounts();
    }, 5000);*/
  }

  printServerCounts(): void {
    let serverKeys: string[] = _.keys(this.servers);
    let info = "";
    for (let i: number = 0; i < serverKeys.length; i++) {
      info += "[" + serverKeys[i] + ": " + this.serversDetails[serverKeys[i]].clientCount + "] ";
    }
    console.log(info);
  }

  handleCommand(cmd: string): void {
    switch (cmd) {
      case "players":
        this.printServerCounts();
        break;
      case "reload":
        this.reloadServers();
        break;
      case "reloadhandlers":
        this.reloadClientHandlers();
        this.reloadTerrariaServerHandlers();
        console.log("\u001b[33mReloaded Packet Handlers.\u001b[37m");
        break;
      case "reloadcmds":
          try {
            let ClientCommandHandler = requireNoCache('./clientcommandhandler.js', require).default;
            this.handlers.command = new ClientCommandHandler();
          } catch (e) {
            console.log("Error loading Command Handler: " + e);
          }
        
        console.log("\u001b[33mReloaded Command Handler.\u001b[37m");
        break;
    }
  }

  reloadClientHandlers(): void {
      try {
        let ClientPacketHandler = requireNoCache('./clientpackethandler.js', require).default;
        this.handlers.clientPacketHandler = new ClientPacketHandler();
      } catch (e) {
        console.log("Error loading Client Packet Handler: " + e);
      }
  }

  reloadTerrariaServerHandlers(): void {
      try {
        let TerrariaServerPacketHandler = requireNoCache('./terrariaserverpackethandler.js', require).default;
        this.handlers.terrariaServerPacketHandler = new TerrariaServerPacketHandler();
      } catch (e) {
        console.log("Error loading TerrariaServer Packet Handler: " + e);
      }
  }

  reloadServers(): void {
      try {
        let ConfigSettings = requireNoCache('./config.js', require).ConfigSettings;
        let currentRoster = {};
        let runAfterFinished: Array<ReloadTask> = [];
        for (let i: number = 0; i < ConfigSettings.servers.length; i++) {
          let listenKey: number = ConfigSettings.servers[i].listenPort;
          if (this.listenServers[listenKey]) {
            this.listenServers[listenKey].updateInfo(ConfigSettings.servers[i]);
            for (var j = 0; j < ConfigSettings.servers[i].routingServers.length; j++) {
              this.servers[ConfigSettings.servers[i].routingServers[j].name] = ConfigSettings.servers[i].routingServers[j];
            }
          } else {
            runAfterFinished.push({
              key: listenKey,
              index: i
            });
          }

          currentRoster[listenKey] = 1;
        }

        let currentListenServers: string[] = _.keys(this.listenServers);
        for (let i: number = 0; i < currentListenServers.length; i++) {
          if (!currentRoster[currentListenServers[i]]) {
            // Close down
            this.listenServers[currentListenServers[i]].shutdown();
            delete this.listenServers[currentListenServers[i]];
          }
        }

        for (let i: number = 0; i < runAfterFinished.length; i++) {
          var serversIndex = runAfterFinished[i].index;
          this.listenServers[runAfterFinished[i].key] = new ListenServer(ConfigSettings.servers[serversIndex], this.serversDetails, this.handlers, this.servers, this.options);
          for (let j: number = 0; j < ConfigSettings.servers[serversIndex].routingServers.length; j++) {
            this.servers[ConfigSettings.servers[serversIndex].routingServers[j].name] = ConfigSettings.servers[serversIndex].routingServers[j];
          }
        }

        // Update options
        let keys: string[] = _.keys(this.options);
        for (let i = 0; i < keys.length; i++) {
          this.options[keys[i]] = ConfigSettings.options[keys[i]];
        }
      } catch (e) {
        console.log("Error loading Config: " + e);
      }
      console.log("\u001b[33mReloaded Config.\u001b[37m");
      console.log(ConfigSettings);
  }
}

export default Dimensions;