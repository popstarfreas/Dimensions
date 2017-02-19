# README #

Dimensions is:
A routing service that can also load balance connections. For use with TerrariaServers.

# Installation
Install NodeJS
https://nodejs.org/en/

Install Redis
Windows: https://github.com/MSOpenTech/redis/releases
Linux: https://redis.io/topics/quickstart

Setting up

 * Contents of the .7z should be extracted to a folder. `cd` into this folder.
 * Run `npm install`, it might take longer than expected
 * Copy "config.example.js" to "config.js" and edit to your specifications
 * In the folder run `npm run start`

Notes

 * Redis is used for the Pub/Sub for detached reloading. If you do not care for this, it is possible to remove the Redis requirement
 * To reload changes to the cmd handlers, packet handlers, config or extensions, without restarting Dimensions
    * Run `node dimensions_cli.js`
        * Reload Config: `reload`
        * Reload Command Handlers: `reloadcmds`
        * Reload Packet Handlers: `reloadhandlers`
        * Reload Extensions: `reloadplugins`

### Development ###

If you intend to modify Dimensions in any way, be it for your own use or to make minor changes, it is recommended that you modify the original Typescript. This will not only provide you with more safety regarding changes, but the original source is likely to be more understandable and you can merge changes from this repo using git.

* Clone this repo
* `cd` into the new directory
* run ```npm install```
* There are a few scripts in the package.json
    * to build ```npm run build``` this will put all output js files into a build directory
    * to build then run ```npm run bstart``` this will build and then run the index.js in the build directory
    * to start without building run `npm run start`

Dimensions uses the latest Typescript (v2) and uses the strict null checking. When editing and building, it is important to use these features when developing to avoid issues that would otherwise have been caught by the transpiler.
   
# Supporters
Thanks to all who have financially supported development:

 * OFF (Teeria; http://teeria.eu/)
 * Devi (TerraPix)
 * Anzhelika (Novus; http://vk.com/terraria_novus_pc)
 * Ricko (Red Bunny; https://steamcommunity.com/groups/redbunnybr)
