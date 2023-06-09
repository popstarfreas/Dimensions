# Maintenance Status (as of 2023-06-09)
The server that I develop and use this for (Dark Gaming) is currently still transitioning to 1.4.4.9. When we finish this transition we will be able to update to the latest version of Dimensions, which means that proper maintenance and new features will resume.

If you are looking for the latest version of Dimensions then look at the [pre-releases](https://github.com/popstarfreas/Dimensions/releases). Alternatively you can build dimensions yourself from the dev branch. The pre-release is marked as such because it is not currently running on Dark Gaming. Once Dark gaming has updated to 1.4.4.9, the latest version will get proper testing and will be marked as a proper release when that happens.

In the meantime, if you find an issue and would like to fix it, make a PR so it can be included for others.

# README #

Dimensions is: A routing service that can also load balance connections. For use with Terraria Servers.

## Installation
### Step 1: Install NodeJS
Follow the link and download either version. Later releases may offer better performance. https://nodejs.org/en/
 
### Step 2: Install the Plugin
Download the plugin and put it in each Terraria Server for use with Dimensions
 * [Download](https://github.com/popstarfreas/Dimensions-TerrariaServer/releases)
 * [Source](https://github.com/popstarfreas/Dimensions-TerrariaServer)

### Step 3: Setting Up and Running
 * Download the latest release and extract it to its own folder
 * Open a cmd prompt/terminal at the folder and execute the command `npm install --only=production` (it may take a bit to finish)
 * Copy the file "config.js.example" and rename it to "config.js" and edit it to your specifications
 * OR follow the quickstart guide in the [Config Wiki](https://github.com/popstarfreas/Dimensions/wiki/Config)
 * To start Dimensions execute `npm run start`

### Step 4 (Optional): Install Redis
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
* run ```npm install```
* There are a few scripts in the package.json
    * to build (and test) ```npm run build``` this will transpile the ts files to js, run the tests and put all output js files into a build directory
    * to build then run ```npm run bstart``` this will build and then run the index.js in the build directory
    * to start without building run `npm run start`

Dimensions uses the latest Typescript with strict checks enabled to help catch bugs. It is recommended that you modify the Typescript code instead of the transpiled javascript code. This will not only provide you with more safety regarding changes, but the original source is likely to be more understandable and you can merge changes from this repo using git.

### Extensions
To build an extension:
 * ``npm init`` in a new folder to initialise it
 * ``npm i dimensions@npm:@popstarfreas/dimensions``, this installs dimensions as a dependency
 * Have a look at [an existing extension](https://github.com/popstarfreas/Kickback/blob/master/index.ts) or [the abstract extension class](https://github.com/popstarfreas/Dimensions/blob/dev/node_modules/dimensions/extension/index.ts) to see a template for where to start
   
# Supporters
Thanks to all who have financially supported development:

 * OFF (Teeria; http://teeria.eu/)
 * Devi (TerraPix)
 * Anzhelika (Novux; http://novux.ru)
 * Ricko (Red Bunny; https://steamcommunity.com/groups/redbunnybr)
