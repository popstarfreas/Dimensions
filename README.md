# README #

Dimensions is a routing service that can also load balance connections. For use with Terraria Servers (Vanilla / TShock).

It is intended to sit in the middle as a proxy. The typical non-proxy setup is:
 * Client -> Terraria Server

Dimensions sits in the middle like so:
 * Client -> Dimensions -> Terraria Server(s)

With the use case that it can connect to different Terraria Servers without disconnecting the client. This allows multi-world servers to work with just one ip/port to join, as you can swap between them mid session.

## Version Compatibility
Dimensions aims to only support the latest Terraria version. Currently this is Terraria v1.4.5.6 (319)

We usually provide support for new game versions within 7 days. For patch releases, this is usually same day.

## Installation
### Step 1: Install NodeJS
Follow the link and download either version. Later releases may offer better performance. https://nodejs.org/en/

### Step 2: Install Git
Follow the link and download and install git: https://git-scm.com/downloads

This is needed to install one of the dependencies.

### Step 3: Install the Plugin
Download the plugin and put it in each Terraria Server for use with Dimensions
 * [Download](https://github.com/popstarfreas/Dimensions-TerrariaServer/releases)
 * [Source](https://github.com/popstarfreas/Dimensions-TerrariaServer)

The plugin is necessary to fix IP addresses of players connecting through Dimensions.

### Step 4: Setting Up and Running
 * Download the latest release and extract it to its own folder
 * Open a cmd prompt/terminal at the folder and execute the command `pnpm install --production` (it may take a bit to finish)
 * Copy `configuration/config.yaml.example` to `configuration/config.yaml` and edit it to your specifications
 * OR follow the quickstart guide in the [Config Wiki](https://github.com/popstarfreas/Dimensions/wiki/Config)
 * To start Dimensions execute `npm run start`

**Note:** Legacy `config.js` in the root directory is still supported for backwards compatibility, but YAML configuration is recommended for new installations.

### Step 5 (Optional): Install Redis
**If you do not need to have live reloading of modules / the configuration file then you do not need to do this step.**

Redis is used to communicate with the dimensions process via the `dimensions_cli.js` file. It will allow you to reload the config and/or reload things like extensions or modules without the need to manually restart dimensions, reducing downtime.

Download and install Redis for your OS
 * Windows: https://github.com/MSOpenTech/redis/releases
 * Linux: https://redis.io/topics/quickstart
 

 * Set enabled to true in the config for the redis option
 * To reload changes to the cmd handlers, packet handlers, config or extensions, without restarting Dimensions
    * Run `node dimensions_cli.js`
        * Reload Config: `reload`
        * Reload Command Handlers: `reloadcmds`
        * Reload Packet Handlers: `reloadhandlers`
        * Reload Extensions: `reloadplugins`
    * The responses for each command currently are only output by each Dimensions instance rather than in the CLI

## Development

* Clone this repo
* `cd` into the new directory
* run ```pnpm install```
* There are a few scripts in the package.json
    * to build (and test) ```npm run build``` this will transpile the ts files to js, run the tests and put all output js files into a build directory
    * to build then run ```npm run bstart``` this will build and then run the index.js in the build directory
    * to start without building run `npm run start`

Dimensions uses the latest Typescript with strict checks enabled to help catch bugs. It is recommended that you modify the Typescript code instead of the transpiled javascript code. This will not only provide you with more safety regarding changes, but the original source is likely to be more understandable and you can merge changes from this repo using git.

### Project Structure

The project uses ES modules (ESM) and has the following structure:

```
app/
├── dimensions/          # Core library source code
│   ├── extension/       # Extension base classes
│   ├── datatypes/       # Data type definitions
│   └── packets/         # Packet handling
├── spec/                # Test files
└── index.ts             # Entry point
configuration/
├── config.yaml.example  # Full configuration example
└── config.yaml.quickstart # Minimal quickstart template
```

### Extensions
To build an extension:
 * ``npm init`` in a new folder to initialise it
 * ``npm i dimensions@npm:@popstarfreas/dimensions``, this installs dimensions as a dependency
 * Have a look at [an existing extension](https://github.com/popstarfreas/Kickback/blob/master/index.ts) or [the abstract extension class](https://github.com/popstarfreas/Dimensions/blob/dev/app/dimensions/extension/index.ts) to see a template for where to start
 * Extensions must use ESM syntax (`import`/`export`) rather than CommonJS (`require`/`module.exports`)

A list of extensions for dimensions is available at the wiki here: https://github.com/popstarfreas/Dimensions/wiki/Extensions

## Additional Features

Dimensions has several optional features you may want to use. See `configuration/config.yaml.example` for the full option shapes and `configuration/config.yaml.quickstart` for a smaller starting point.

### Server Visibility and Command-Only Dimensions
Routing servers can be marked `hidden` so they do not show in the `/dimensions` list while still being reachable by command. A server group can also omit `listenPort`, which makes its routing servers available only through command-based switching instead of direct joins.

When multiple routing servers are configured under the same `listenPort`, Dimensions routes new clients to the server with the lowest tracked player count.

### Fake Version
For patch updates to Terraria that break the Terraria Server version check but are otherwise compatible, you can configure Dimensions to overwrite the version the client sends to the server. See `fakeVersion`.

### REST API
For servers that use TShock's REST API for things like terraria-servers.com to expose player counts, Dimensions provides a `restApi` option. It serves a `/v2/status`-like response with tracked Dimensions player counts and supports configurable server metadata through `restApi.response`.

### TCP RTT Tracking
Dimensions can measure proxy-to-client TCP RTT with `tcpRtt`. When enabled, RTT samples can be exposed to servers, included in the REST API, and used by Dimensions' `/ping` command. This requires a supported native addon build for the platform running Dimensions.

### Blacklist API
The `blacklist` option lets Dimensions check connecting clients against an external HTTPS service before allowing them through. The check includes available client information such as name, IP address, and UUID, and `errorPolicy` controls whether clients are allowed or denied when the blacklist service fails.

For servers that require it, you can use this to check for things such as VPN/Proxy users. The service is not provided, you must provide one yourself.

### Connection Limits
`connectionLimit` limits how many active connections a single IP address can have at once. `connectionRateLimit` limits how many new connections an IP address can create within a configured time window. Both options are useful for reducing reconnect spam and simple connection floods.

### Invisibility Blocking
`blockInvis` can remove the Terraria invisibility buff before it reaches a backend server. It can be enabled globally or scoped to specific routing server names.

### Hot Reloading
Redis-based reload commands are described in the installation section above. In addition, `hotReload` can watch the configuration file or configuration directory and automatically reload server routing changes when the config changes.

### Name Change Handling
`nameChanges` controls how Dimensions handles backend servers that try to change a client's name. The default `legacy` mode preserves old behavior, while `rewrite` keeps the Dimensions-side name stable and rewrites mismatched player info packets unless the current dimension is listed in `exclusions`.

### Language and Message Overrides
`language` selects the built-in message language for chat and disconnect messages. `languageOverrides` can replace individual messages such as blacklist failures, connection rate-limit warnings, dimension switching text, and TCP RTT responses.

### Switch Debuffs
`debuffOnSwitch` controls whether Dimensions applies debuffs after a player switches dimensions. It is enabled by default and can be disabled or customized with specific buff IDs and duration. These debuffs are used to counter client behaviour that enables exploits such as usetime cheating with a vanilla client.

### Backend Kick Handling
`disconnectOnKick` controls what happens when a backend Terraria server kicks a player. Dimensions can keep the client connected to the proxy, always disconnect the client, or disconnect only when the kick reason matches a configured prefix.

# Supporters
Thanks to all who have financially supported development:

 * OFF (Teeria; http://teeria.eu/)
 * Devi (TerraPix)
 * Anzhelika (Novux; http://novux.ru)
 * Ricko (Red Bunny; https://steamcommunity.com/groups/redbunnybr)
