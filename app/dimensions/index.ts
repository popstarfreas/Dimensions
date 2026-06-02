import * as fs from 'fs';
import * as redis from 'redis';
import ErrorHelper from './errorhelper.js';
import RoutingServer from './routingserver.js';
import ListenServerArgs, { ConnectionRateLimitEntry } from './listenserverargs.js';
import ListenServer from './listenserver.js';
import { ConfigSettings, ConfigOptions, reloadConfig, usingOldConfig, oldConfigFilePath, configurationDirectory } from './configloader.js';
import ClientCommandHandler from './clientcommandhandler.js';
import TerrariaServerPacketHandler from './terrariaserverpackethandler.js';
import ServerDetails from './serverdetails.js';
import GlobalHandlers from './globalhandlers.js';
import ReloadTask from './reloadtask.js';
import GlobalTracking from './globaltracking.js';
import Extensions from './extensions.js';
import ClientPacketHandler from './clientpackethandler.js';
import RestApi from './restapi.js';
import Blacklist from './blacklist.js';
import { Dictionary } from './dictionary.js';
import * as winston from 'winston';
import { pathToFileURL } from 'url';

async function importFresh(modulePath: string): Promise<any> {
  const url = pathToFileURL(modulePath).href;
  return import(`${url}?t=${Date.now()}`);
}

/* The core that sets up the listen servers, rest api and handles reloading */
class Dimensions {
  private servers: { [id: string]: RoutingServer } = {};
  private options: ConfigOptions;
  private listenServers: { [id: string]: ListenServer } = {};
  private handlers: GlobalHandlers;
  private redisClient?: redis.RedisClient;
  private serversDetails: { [id: string]: ServerDetails } = {};
  private globalTracking: GlobalTracking;
  private restApi?: RestApi;
  private logging: winston.Logger;
  private blacklist?: Blacklist;
  private connectionsTracker: Map<string, number> = new Map();
  private connectRateTracker: Map<string, ConnectionRateLimitEntry> = new Map();
  private extensionStorage: Map<string, any> = new Map();
  private hotReloadTimeout: NodeJS.Timeout | null = null;

  private constructor(logging: winston.Logger) {
    this.options = ConfigSettings.options;
    this.logging = logging;
    if (this.options.blacklist.enabled) {
      this.blacklist = new Blacklist(
        this.options.blacklist
      );
    }
    this.handlers = {
      command: new ClientCommandHandler(),
      clientPacketHandler: new ClientPacketHandler(),
      terrariaServerPacketHandler: new TerrariaServerPacketHandler(),
      extensions: {}
    };

    this.globalTracking = {
      names: {}
    };
  }

  public static async create(logging: winston.Logger): Promise<Dimensions> {
    const instance = new Dimensions(logging);

    await Extensions.loadExtensions(instance.handlers.extensions, instance.listenServers, instance.options.log, instance.logging, instance.extensionStorage);

    if (typeof instance.options.redis !== "undefined" && instance.options.redis.enabled) {
      instance.setupRedis();
    }

    instance.setupRoutes();

    // Starts a new RestAPI server. This mimics the status output of tShock's RestAPI and puts in the total count and all player names from all Dimensions
    if (instance.options.restApi.enabled) {
      instance.restApi = new RestApi(instance.options.restApi.port, instance.globalTracking, instance.serversDetails, instance.servers, instance.options.restApi.response, instance.logging);
    }

    if (instance.options.hotReload) {
      instance.setupHotReload();
    }

    return instance;
  }

  private setupHotReload(): void {
    let configPath: string;
    if (usingOldConfig) {
      configPath = oldConfigFilePath;
    } else {
      configPath = configurationDirectory;
    }
    try {
      fs.watch(configPath, () => {
        if (this.hotReloadTimeout) {
          clearTimeout(this.hotReloadTimeout);
        }
        this.hotReloadTimeout = setTimeout(() => {
          this.logging.info("Config file changed, reloading servers...");
          this.reloadServers();
        }, 100);
      });
      this.logging.info(`Hot-reloading enabled. Watching for changes to ${configPath}`);
    } catch (e) {
      this.logging.error(`Could not watch config file for changes: ${ErrorHelper.toMessage(e)}`);
    }
  }

  private setupRedis(): void {
    // Start a client listening on the dimensions_cli channel for commands, such as reload
    this.redisClient = redis.createClient({
      host: this.options.redis.host,
      port: this.options.redis.port
    });
    this.redisClient.subscribe('dimensions_cli');
    this.redisClient
      .on('message', (channel: string, message: string) => {
        if (channel === "dimensions_cli") {
          this.handleCommand(message);
        }
      })
      .on('error', (err: Error) => {
        this.logging.error("RedisError: " + ErrorHelper.toMessage(err));
      });
  }

  /**
   * Starts a listen server per port in the config, giving it the routing servers it is responsible for
   */
  private setupRoutes(): void {
    // Goes through each listen server object in the config
    for (let i: number = 0; i < ConfigSettings.servers.length; i++) {
      // Starts up a listen server on the specified port, and assigns the listed routing servers to this listen server
      const server = ConfigSettings.servers[i];

      // Adds each routing server to the shared servers object, used when a client wants to switch Dimension and needs the information for the socket
      for (let j: number = 0; j < ConfigSettings.servers[i].routingServers.length; j++) {
        this.servers[ConfigSettings.servers[i].routingServers[j].name.toLowerCase()] = ConfigSettings.servers[i].routingServers[j];
      }

      if (!("listenPort" in server)) {
        continue;
      }

      const listenKey = server.listenPort;
      const args: ListenServerArgs = {
        blacklist: this.blacklist,
        globalHandlers: this.handlers,
        globalTracking: this.globalTracking,
        info: server,
        logging: this.logging,
        options: this.options,
        servers: this.servers,
        serversDetails: this.serversDetails,
        connectionsTracker: this.connectionsTracker,
        connectRateTracker: this.connectRateTracker
      };
      this.listenServers[listenKey] = new ListenServer(args);
    }
  }

  /* Prints out the names currently used and the number of people on each Dimension */
  private printServerCounts(): void {
    let serverKeys: string[] = Object.keys(this.servers);
    let info = "";
    for (let i: number = 0; i < serverKeys.length; i++) {
      info += "[" + serverKeys[i] + ": " + this.serversDetails[serverKeys[i]].clientCount + "] ";
    }

    console.log(this.globalTracking.names);
    console.log(info);
  }

  /* Handles commands received by the subscribed Redis channel */
  private handleCommand(cmd: string): void {
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
        this.logging.info("Reloaded Packet Handlers.");
        break;
      case "reloadcmds":
        this.reloadCommandHandler();
        break;
      case "reloadextensions":
      case "reloadplugins":
        this.reloadExtensions();
        break;
      default:
        this.passOnReloadToExtensions();
        break;
    }
  }

  /* Loads a new instance of ClientCommandHandler using dynamic import */
  private async reloadCommandHandler(): Promise<void> {
    try {
      const modulePath = new URL('./clientcommandhandler.js', import.meta.url).pathname;
      const module = await importFresh(modulePath);
      this.handlers.command = new module.default();
      this.logging.info("Reloaded Command Handler.");
    } catch (e) {
      this.logging.error("Error loading Command Handler: " + ErrorHelper.toMessage(e));
    }
  }

  /* When a command is not directly handled by handleCommand, it comes through here and is
   * passed on to each extension in-case they have it as a command */
  private passOnReloadToExtensions(): void {
    let handlers = this.handlers.extensions;
    for (let key in handlers) {
      let handler = handlers[key];
      if (handler.reloadable && typeof handler.reloadName !== 'undefined') {
        if (typeof handler.reload === 'function') {
          // Note: Extensions need to be updated to support ESM dynamic imports
          // The require parameter is no longer available in ESM
          try {
            handler.reload(undefined as any);
          } catch (error) {
            if (this.options.log.extensionError) {
              const name = handler.name ?? key;
              const logMessage = `[${process.pid}] Extension ${name} Reload Error: ${ErrorHelper.toMessage(error)}`;
              this.logging.info(logMessage);
            }
          }
        }
      }
    }
  }

  /* Loads a new instance of ClientPacketHandler using dynamic import */
  private async reloadClientHandlers(): Promise<void> {
    try {
      const modulePath = new URL('./clientpackethandler.js', import.meta.url).pathname;
      const module = await importFresh(modulePath);
      this.handlers.clientPacketHandler = new module.default();
    } catch (e) {
      this.logging.error("Error loading Client Packet Handler: " + ErrorHelper.toMessage(e));
    }
  }

  /* Loads a new instance of TerrariaServerPacketHandler using dynamic import */
  private async reloadTerrariaServerHandlers(): Promise<void> {
    try {
      const modulePath = new URL('./terrariaserverpackethandler.js', import.meta.url).pathname;
      const module = await importFresh(modulePath);
      this.handlers.terrariaServerPacketHandler = new module.default();
    } catch (e) {
      this.logging.error("Error loading TerrariaServer Packet Handler: " + ErrorHelper.toMessage(e));
    }
  }

  /** Unloads all extensions. */
  private unloadExtensions() {
    for (let key in this.handlers.extensions) {
      let extension = this.handlers.extensions[key];
      if (extension.unload) {
        try {
          const storage = extension.unload();
          if (typeof storage !== "undefined") {
            this.extensionStorage.set(extension.name, storage);
          }
        } catch (error) {
          if (this.options.log.extensionError) {
            const name = extension.name ?? key;
            const logMessage = `[${process.pid}] Extension ${name} Unload Error: ${ErrorHelper.toMessage(error)}`;
            this.logging.info(logMessage);
          }
        }
      }

      if (this.options.log.extensionLoad) {
        this.logging.info(`[Extension] ${extension.name} ${extension.version} unloaded.`);
      }
    }
  }

  /* Unloads and re-loads all extensions directly from their directories */
  private async reloadExtensions(): Promise<void> {
    this.unloadExtensions();

    this.handlers.extensions = {};
    // Note: ESM module cache cannot be cleared like CommonJS require.cache
    // Extensions will be reloaded with cache busting via dynamic imports
    await Extensions.loadExtensions(this.handlers.extensions, this.listenServers, this.options.log, this.logging, this.extensionStorage);
  }

  /* Checks the config servers against the existing listen servers and updates any allocations
   * of each individual dimension to the appropriate listenserver, and will destroy any listenservers
   * that no longer should exist, and starts up new ones on the specified ports from the config */
  private reloadServers(): void {
    try {
      let ConfigSettings = reloadConfig()
      if (ConfigSettings.options.restApi.enabled) {
        this.restApi?.handleReload(ConfigSettings.options.restApi.port);
      }

      let currentRoster: Dictionary<number> = {};
      let runAfterFinished: Array<ReloadTask> = [];

      for (let i: number = 0; i < ConfigSettings.servers.length; i++) {
        const server = ConfigSettings.servers[i];
        if (!("listenPort" in server)) {
          // Adds/updates each routing server (Dimension) to the shared servers object
          for (var j = 0; j < ConfigSettings.servers[i].routingServers.length; j++) {
            this.servers[ConfigSettings.servers[i].routingServers[j].name] = ConfigSettings.servers[i].routingServers[j];
          }
          continue;
        }
        const listenKey: string = server.listenPort.toString();

        // Checks if the listenServer for the specified port exists
        if (this.listenServers[listenKey]) {
          // Ensures the listenServer has all the listed routing servers from the config for load-balancing/routing
          this.listenServers[listenKey].updateInfo(server);

          // Adds/updates each routing server (Dimension) to the shared servers object
          for (var j = 0; j < ConfigSettings.servers[i].routingServers.length; j++) {
            this.servers[ConfigSettings.servers[i].routingServers[j].name] = ConfigSettings.servers[i].routingServers[j];
          }
        } else {
          // If the listen server does not exist, it is added to be created after any existing ones that no longer exist are closed
          runAfterFinished.push({
            key: listenKey,
            server: server,
          });
        }

        currentRoster[listenKey] = 1;
      }

      const currentListenServers: string[] = Object.keys(this.listenServers);
      for (let i: number = 0; i < currentListenServers.length; i++) {
        // If the listen server is not in the config anymore, it is cleanly closed and removed
        if (!currentRoster[currentListenServers[i]]) {
          this.listenServers[currentListenServers[i]].shutdown();
          delete this.listenServers[currentListenServers[i]];
        }
      }

      let args: ListenServerArgs;
      // Sets up any new listen servers and assigns them their routing servers
      for (let i: number = 0; i < runAfterFinished.length; i++) {
        args = {
          blacklist: this.blacklist,
          globalHandlers: this.handlers,
          globalTracking: this.globalTracking,
          info: runAfterFinished[i].server,
          logging: this.logging,
          options: this.options,
          servers: this.servers,
          serversDetails: this.serversDetails,
          connectionsTracker: this.connectionsTracker,
          connectRateTracker: this.connectRateTracker
        };
        this.listenServers[runAfterFinished[i].key] = new ListenServer(args);
        for (let j: number = 0; j < runAfterFinished[i].server.routingServers.length; j++) {
          this.servers[runAfterFinished[i].server.routingServers[j].name] = runAfterFinished[i].server.routingServers[j];
        }
      }

      // Update shared options object with new config options (logging options etc)
      let keys: string[] = Object.keys(this.options);
      for (let i = 0; i < keys.length; i++) {
        (this.options as any)[keys[i]] = (ConfigSettings.options as any)[keys[i]];
      }
    } catch (e) {
      this.logging.error("Error loading Config: " + ErrorHelper.toMessage(e));
    }
    this.logging.info("Reloaded Config.");
  }

  public close(): void {
    if (typeof this.redisClient !== "undefined") {
      this.redisClient.quit();
    }

    if (typeof this.restApi !== "undefined") {
      this.restApi.close();
    }

    this.unloadExtensions();

    Object.values(this.listenServers).forEach(server => server.shutdown());
  }
}

export default Dimensions;
