import RoutingServer from './routingserver.js';
import * as Language from './language.js';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const legacyRequire = createRequire(import.meta.url);

export interface ConfigListenServer {
  listenPort: number;
  routingServers: RoutingServer[];
}

export interface ConfigNoListenServer {
  routingServers: RoutingServer[];
}

export interface LogOptions {
  clientTimeouts: boolean;
  clientConnect: boolean;
  clientDisconnect: boolean;
  clientError: boolean;
  checkingClientConnect: boolean;
  checkingClientDisconnect: boolean;
  checkingClientError: boolean;
  checkingClientTimeouts: boolean;
  tServerConnect: boolean;
  tServerDisconnect: boolean;
  tServerError: boolean;
  clientBlocked: boolean;
  extensionLoad: boolean;
  outputToFile: boolean;
  outputToConsole: boolean;
  extensionError: boolean;
  format?: {
    console?: "JSON" | "PlainText";
    file?: "JSON" | "PlainText";
  };
}

export interface FakeVersion {
  enabled: boolean;
  terrariaVersion: number;
}

export interface UnvalidatedBlackList {
  enabled?: boolean;
  hostname?: string;
  path?: string;
  port?: number;
  apiKey?: string;
  errorPolicy?: "AllowJoining" | "DenyJoining";
}

export type EnabledBlackList = {
  enabled: true;
  hostname: string;
  path: string;
  port: number;
  apiKey: string;
  errorPolicy: "AllowJoining" | "DenyJoining";
}

export type BlackList = EnabledBlackList | {
  enabled: false;
}

export interface RestApiResponse {
  name?: string;
  worldName?: string;
  terrariaServerPort?: number;
  hasServerPassword?: boolean;
  maxPlayers?: number;
  version?: string;
}

export interface RestApi {
  enabled: boolean;
  port: number;
  response?: RestApiResponse;
}

export interface UnvalidatedTcpRttOptions {
  enabled?: boolean;
  sampleIntervalMs?: number;
  exportToServers?: boolean;
  restApiEndpoint?: boolean;
  pingCommandPassThrough?: boolean;
}

export interface TcpRttOptions {
  enabled: boolean;
  sampleIntervalMs: number;
  exportToServers: boolean;
  restApiEndpoint: boolean;
  pingCommandPassThrough: boolean;
}

export interface ConnectionLimit {
  enabled: boolean;
  connectionLimitPerIP: number;
  kickReason: string;
}

export interface UnvalidatedConnectionRateLimit {
  enabled: boolean;
  connectionRateLimitPerIP: number;
  connectionRateLimitWindowSeconds?: number;
}

export interface ConnectionRateLimit {
  enabled: boolean;
  connectionRateLimitPerIP: number;
  connectionRateLimitWindowSeconds: number;
}

export interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
}

export interface NameChanges {
  mode: "legacy" | "rewrite";
  exclusions: string[];
}

export type UnvalidatedDebuffOnSwitch = {
  enabled: false;
} | {
  enabled: true;
  buffTypes?: number[];
  debuffTimeInSeconds?: number;
}

export type DebuffOnSwitch = {
  enabled: false;
} | {
  enabled: true;
  buffTypes: number[];
  debuffTimeInSeconds: number;
}

export type DisconnectOnKick = {
  type: "always";
} | {
  type: "never";
} | {
  type: "onKickReasonPrefix";
  kickReasonPrefixes: string[];
}

export interface UnvalidatedConfigOptions {
  socketTimeout: number;
  socketNoDelay: boolean;
  fakeVersion: FakeVersion;
  restApi: RestApi;
  blockInvis: boolean;
  blacklist: UnvalidatedBlackList;
  log: LogOptions;
  connectionLimit: ConnectionLimit;
  connectionRateLimit: UnvalidatedConnectionRateLimit;
  redis: RedisConfig;
  tcpRtt?: UnvalidatedTcpRttOptions;
  nameChanges?: NameChanges;
  language?: string;
  languageOverrides?: Language.LanguagePhrasesOverrides;
  debuffOnSwitch?: UnvalidatedDebuffOnSwitch;
  disconnectOnKick?: DisconnectOnKick;
  hotReload?: boolean;
}

export interface ConfigOptions {
  socketTimeout: number;
  socketNoDelay: boolean;
  fakeVersion: FakeVersion;
  restApi: RestApi;
  blockInvis: boolean | { enabled: boolean, servers: string[] };
  blacklist: BlackList;
  log: LogOptions;
  connectionLimit: ConnectionLimit;
  connectionRateLimit: ConnectionRateLimit;
  redis: RedisConfig;
  tcpRtt: TcpRttOptions;
  nameChanges?: NameChanges;
  language: Language.LanguageDefinition,
  debuffOnSwitch: DebuffOnSwitch;
  disconnectOnKick: DisconnectOnKick;
  hotReload: boolean;
}

export interface UnvalidatedConfig {
  servers: (ConfigListenServer | ConfigNoListenServer)[];
  options: UnvalidatedConfigOptions;
}

export interface Config {
  servers: (ConfigListenServer | ConfigNoListenServer)[];
  options: ConfigOptions;
}

// Hot reload in a k8s context means we need to be able to mount a configmap
// to a directory to receive propogated config changes. The old config file
// made this impossible and the reload function also resolved the file to where the soft
// link pointed at. In order to avoid these problems, we now also support a configuration directory
// that uses a yaml file. This means we can use fs to read that file avoiding the module cache and
// soft link issue, as well as properly support hot reloading when dimensions is deployed in k8s.
// Legacy config.js remains supported for compatibility.
export const oldConfigFilePath = path.resolve(__dirname, '../../config.js');
export const configurationDirectory = path.resolve(__dirname, '../../configuration');

export let usingOldConfig = false
function loadLegacyConfigSync(fresh: boolean): UnvalidatedConfig {
  const resolvedPath = legacyRequire.resolve(oldConfigFilePath);
  if (fresh && legacyRequire.cache[resolvedPath]) {
    delete legacyRequire.cache[resolvedPath];
  }
  const legacyModule = legacyRequire(resolvedPath);
  const config = legacyModule?.ConfigSettings ?? legacyModule?.default ?? legacyModule;
  if (!config || typeof config !== "object") {
    throw new Error("Legacy config.js did not export ConfigSettings");
  }
  return config as UnvalidatedConfig;
}

function loadConfigSync(): UnvalidatedConfig {
  // For initial load, we prefer YAML config if it exists (ESM-compatible)
  if (fs.existsSync(path.resolve(configurationDirectory, 'config.yaml'))) {
    usingOldConfig = false;
    return yaml.parse(fs.readFileSync(path.resolve(configurationDirectory, 'config.yaml'), 'utf8'));
  } else if (fs.existsSync(oldConfigFilePath)) {
    usingOldConfig = true;
    return loadLegacyConfigSync(false);
  } else {
    throw new Error("No config file found. Please create configuration/config.yaml or if using a legacy config make sure config.js is present");
  }
}

function validateConfig(unvalidatedConfig: UnvalidatedConfig): Config {
  const debuffOnSwitch = { enabled: true, buffTypes: [ /* Webbed */ 149, /* Stoned */ 156], debuffTimeInSeconds: 5 }
  const disconnectOnKick: DisconnectOnKick = { type: "never" };
  const blacklist: BlackList = { enabled: false };
  const tcpRtt: TcpRttOptions = {
    enabled: unvalidatedConfig.options.tcpRtt?.enabled ?? false,
    sampleIntervalMs: unvalidatedConfig.options.tcpRtt?.sampleIntervalMs ?? 2000,
    exportToServers: unvalidatedConfig.options.tcpRtt?.exportToServers ?? true,
    restApiEndpoint: unvalidatedConfig.options.tcpRtt?.restApiEndpoint ?? true,
    pingCommandPassThrough: unvalidatedConfig.options.tcpRtt?.pingCommandPassThrough ?? false,
  };
  const connectionRateLimit: ConnectionRateLimit = {
    ...unvalidatedConfig.options.connectionRateLimit,
    connectionRateLimitWindowSeconds: unvalidatedConfig.options.connectionRateLimit.connectionRateLimitWindowSeconds ?? 1,
  };
  let validatedConfig: Config = {
    servers: unvalidatedConfig.servers,
    options: {
      ...unvalidatedConfig.options,
      blacklist,
      connectionRateLimit,
      tcpRtt,
      debuffOnSwitch,
      disconnectOnKick,
      language: Language.english,
      hotReload: unvalidatedConfig.options.hotReload ?? false,
    },
  };

  try {
    if (typeof unvalidatedConfig.options.nameChanges !== "undefined") {
      assert.ok(unvalidatedConfig.options.nameChanges.mode === "legacy" || unvalidatedConfig.options.nameChanges.mode === "rewrite", "nameChanges.mode must be either 'legacy' or 'rewrite'");
      assert.ok(Array.isArray(unvalidatedConfig.options.nameChanges.exclusions), "nameChanges.exclusions must be an array");
    }

    assert.ok(
      Number.isFinite(connectionRateLimit.connectionRateLimitWindowSeconds) && connectionRateLimit.connectionRateLimitWindowSeconds > 0,
      "connectionRateLimit.connectionRateLimitWindowSeconds must be greater than 0"
    );

    assert.ok(
      Number.isFinite(tcpRtt.sampleIntervalMs) && tcpRtt.sampleIntervalMs > 0,
      "tcpRtt.sampleIntervalMs must be greater than 0"
    );

    if (typeof unvalidatedConfig.options.debuffOnSwitch !== "undefined") {
      if (!unvalidatedConfig.options.debuffOnSwitch.enabled) {
        debuffOnSwitch.enabled = false;
      } else {
        if (typeof unvalidatedConfig.options.debuffOnSwitch.buffTypes !== "undefined") {
          debuffOnSwitch.buffTypes = unvalidatedConfig.options.debuffOnSwitch.buffTypes;
        }
        if (typeof unvalidatedConfig.options.debuffOnSwitch.debuffTimeInSeconds !== "undefined")
          debuffOnSwitch.debuffTimeInSeconds = unvalidatedConfig.options.debuffOnSwitch.debuffTimeInSeconds;
      }
    }

    if (typeof unvalidatedConfig.options.disconnectOnKick !== "undefined") {
      if (unvalidatedConfig.options.disconnectOnKick.type === "onKickReasonPrefix") {
        assert.ok(Array.isArray(unvalidatedConfig.options.disconnectOnKick.kickReasonPrefixes), "disconnectOnKick.kickReasonPrefixes must be an array");
        validatedConfig.options.disconnectOnKick = {
          type: "onKickReasonPrefix",
          kickReasonPrefixes: unvalidatedConfig.options.disconnectOnKick.kickReasonPrefixes,
        }
      } else {
        unvalidatedConfig.options.disconnectOnKick.type = unvalidatedConfig.options.disconnectOnKick.type;
      }
    }

    if (typeof unvalidatedConfig.options.language !== "undefined") {
      switch (unvalidatedConfig.options.language.toLowerCase()) {
        case Language.english.isoCode.toLowerCase():
        case Language.english.name.toLowerCase():
        case Language.english.englishName.toLowerCase():
          break;
        case Language.chinese.isoCode.toLowerCase():
        case Language.chinese.name.toLowerCase():
        case Language.chinese.englishName.toLowerCase():
          validatedConfig.options.language = Language.chinese;
          break;
        default:
          console.log("Unrecognised language:", unvalidatedConfig.options.language);
          process.exit(1);
      }
    }

    if (typeof unvalidatedConfig.options.languageOverrides !== "undefined") {
      validatedConfig.options.language.phrases = {
        ...validatedConfig.options.language.phrases,
        ...unvalidatedConfig.options.languageOverrides,
      };
    }

    validatedConfig.options.blacklist.enabled = unvalidatedConfig.options.blacklist.enabled ?? false;
    if (validatedConfig.options.blacklist.enabled) {
      assert.ok(typeof unvalidatedConfig.options.blacklist.hostname !== "undefined", "Blacklist enabled but no hostname provided");
      assert.ok(typeof unvalidatedConfig.options.blacklist.path !== "undefined", "Blacklist enabled but no path provided");
      assert.ok(typeof unvalidatedConfig.options.blacklist.port !== "undefined", "Blacklist enabled but no port provided");
      assert.ok(typeof unvalidatedConfig.options.blacklist.apiKey !== "undefined", "Blacklist enabled but no api key provided");
      assert.ok(unvalidatedConfig.options.blacklist.errorPolicy === "AllowJoining" || unvalidatedConfig.options.blacklist.errorPolicy === "DenyJoining", "Blacklist errorPolicy must be either 'AllowJoining' or 'DenyJoining'");

      validatedConfig.options.blacklist.hostname = unvalidatedConfig.options.blacklist.hostname!;
      validatedConfig.options.blacklist.path = unvalidatedConfig.options.blacklist.path!;
      validatedConfig.options.blacklist.port = unvalidatedConfig.options.blacklist.port!;
      validatedConfig.options.blacklist.apiKey = unvalidatedConfig.options.blacklist.apiKey!;
      validatedConfig.options.blacklist.errorPolicy = unvalidatedConfig.options.blacklist.errorPolicy!;
    }
  } catch (e) {
    console.log("Error validating config:");
    throw e
  }

  return validatedConfig;
}

export function reloadConfig(): Config {
  if (fs.existsSync(path.resolve(configurationDirectory, 'config.yaml'))) {
    usingOldConfig = false;
    return validateConfig(yaml.parse(fs.readFileSync(path.resolve(configurationDirectory, 'config.yaml'), 'utf8')));
  } else if (fs.existsSync(oldConfigFilePath)) {
    usingOldConfig = true;
    return validateConfig(loadLegacyConfigSync(true));
  } else {
    throw new Error("No config file found. Please use configuration/config.yaml or config.js");
  }
}

export const ConfigSettings: Config = validateConfig(loadConfigSync());
