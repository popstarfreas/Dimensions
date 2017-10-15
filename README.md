[![Build Status](https://travis-ci.org/popstarfreas/Dimensions.svg?branch=master)](https://travis-ci.org/popstarfreas/Dimensions)

# README #

Dimensions is:
A routing service that can also load balance connections. For use with TerrariaServers.

# Installation
1. Install NodeJS
https://nodejs.org/en/

2. Install Redis
 * Windows: https://github.com/MSOpenTech/redis/releases
 * Linux: https://redis.io/topics/quickstart
 
3. Download the plugin and put it in each Terraria Server for use with Dimensions
 * [Download](https://bitbucket.org/popstarfreas/dimensions-plugin/downloads/Dimensions.v1.4.0.zip)
 * [Source](https://bitbucket.org/popstarfreas/dimensions-plugin)

4. Setting up

 * Download the latest release and extract it to its own folder
 * Open a cmd prompt/terminal and execute the command `npm install --only=production` (it may take a bit to finish)
 * Copy the file "config.example.js" and rename it to "config.js" and edit it to your specifications [Config Wiki](https://github.com/popstarfreas/Dimensions/wiki/Config)
 * To start Dimensions, then execute `npm run start`

Notes

 * Redis is used for the Pub/Sub for detached reloading. If you do not care for this, it is possible to remove the Redis requirement
 * To reload changes to the cmd handlers, packet handlers, config or extensions, without restarting Dimensions
    * Run `node dimensions_cli.js`
        * Reload Config: `reload`
        * Reload Command Handlers: `reloadcmds`
        * Reload Packet Handlers: `reloadhandlers`
        * Reload Extensions: `reloadplugins`
    * The responses for each command currently are only output by each Dimensions instance rather than in the CLI

### Development ###

If you intend to modify Dimensions in any way, be it for your own use or to make minor changes, it is recommended that you modify the original Typescript. This will not only provide you with more safety regarding changes, but the original source is likely to be more understandable and you can merge changes from this repo using git.

* Clone this repo
* `cd` into the new directory
* run ```npm install```
* There are a few scripts in the package.json
    * to build (and test) ```npm run build``` this will transpile the ts files to js, run the tests and put all output js files into a build directory
    * to build then run ```npm run bstart``` this will build and then run the index.js in the build directory
    * to start without building run `npm run start`

Dimensions uses the latest Typescript (v2) and uses the strict null checking. When editing and building, it is important to use these features when developing to avoid issues that would otherwise have been caught by the transpiler.
   
# Supporters
Thanks to all who have financially supported development:

 * OFF (Teeria; http://teeria.eu/)
 * Devi (TerraPix)
 * Anzhelika (Novux; http://novux.ru)
 * Ricko (Red Bunny; https://steamcommunity.com/groups/redbunnybr)
