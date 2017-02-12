# README #

A routing service that can also load balance connections. For use with TerrariaServers.

### What is this repository for? ###

* This repo contains all the commits for the Dimensions Project

### Setting up for development ###

* Clone repo
* run ```npm install```
* There are a few scripts in the package.json
    * to build ```npm run build```
    * to build then run ```npm run bstart```

Dimensions uses the latest Typescript (v2) and uses the strict null checking. When editing and building, it is important to use these features to ensure there are no potential problems that are missed.

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
 * For further help contact either:
    * http://steamcommunity.com/id/popstarfreas
    * popstarfreas2@gmail.com
   
# Supporters
Thanks to all who have financially supported development:

 * OFF (Teeria; http://teeria.eu/)
 * Devi (TerraPix)
 * Anzhelika (Novus; http://vk.com/terraria_novus_pc)
 * Ricko (Red Bunny; https://steamcommunity.com/groups/redbunnybr)