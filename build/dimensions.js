"use strict";
///<reference path="./typings/index.d.ts"/>
var redis = require("redis");
var listenserver_1 = require("./listenserver");
var config_1 = require("./config");
var _ = require("lodash");
var clientcommandhandler_1 = require("./clientcommandhandler");
var clientpackethandler_1 = require("./clientpackethandler");
var terrariaserverpackethandler_1 = require("./terrariaserverpackethandler");
var Dimensions = (function () {
    function Dimensions() {
        var _this = this;
        this.id = 0;
        this.options = config_1.ConfigSettings.options;
        this.handlers = {
            command: new clientcommandhandler_1["default"](),
            clientPacketHandler: new clientpackethandler_1["default"](),
            terrariaServerPacketHandler: new terrariaserverpackethandler_1["default"]()
        };
        this.redisClient = redis.createClient();
        this.redisClient.subscribe('dimensions_cli');
        this.redisClient
            .on('message', function (channel, message) {
            if (channel === "dimensions_cli") {
                _this.handleCommand(message);
            }
        })
            .on('error', function (err) {
            console.log("RedisError: " + err);
        });
        //self.interface = new Interface(self.handleCommand.bind(self));
        for (var i = 0; i < config_1.ConfigSettings.servers.length; i++) {
            var listenKey = config_1.ConfigSettings.servers[i].listenPort;
            this.listenServers[listenKey] = new listenserver_1["default"](config_1.ConfigSettings.servers[i], this.serversDetails, this.handlers, this.servers, this.options);
            for (var j = 0; j < config_1.ConfigSettings.servers[i].routingServers.length; j++) {
                this.servers[config_1.ConfigSettings.servers[i].routingServers[j].name] = config_1.ConfigSettings.servers[i].routingServers[j];
            }
        }
        /*setInterval(function() {
          self.printServerCounts();
        }, 5000);*/
    }
    Dimensions.prototype.printServerCounts = function () {
        var serverKeys = _.keys(this.servers);
        var info = "";
        for (var i = 0; i < serverKeys.length; i++) {
            info += "[" + serverKeys[i] + ": " + this.serversDetails[serverKeys[i]].clientCount + "] ";
        }
        console.log(info);
    };
    Dimensions.prototype.handleCommand = function (cmd) {
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
                console.log("\033[33mReloaded Packet Handlers.\033[37m");
                break;
            case "reloadcmds":
                try {
                    var ClientCommandHandler_1 = require('./clientcommandhandler');
                    this.handlers.command = new ClientCommandHandler_1();
                }
                catch (e) {
                    console.log("Error loading Command Handler: " + e);
                }
                console.log("\033[33mReloaded Command Handler.\033[37m");
                break;
        }
    };
    Dimensions.prototype.reloadClientHandlers = function () {
        try {
            var ClientPacketHandler_1 = require('./clientpackethandler');
            this.handlers.clientPacketHandler = new ClientPacketHandler_1();
        }
        catch (e) {
            console.log("Error loading Client Packet Handler: " + e);
        }
    };
    Dimensions.prototype.reloadTerrariaServerHandlers = function () {
        try {
            var TerrariaServerPacketHandler_1 = require('./terrariaserverpackethandler');
            this.handlers.terrariaServerPacketHandler = new TerrariaServerPacketHandler_1();
        }
        catch (e) {
            console.log("Error loading TerrariaServer Packet Handler: " + e);
        }
    };
    Dimensions.prototype.reloadServers = function () {
        try {
            var ConfigSettings_1 = require('./config').ConfigSettings;
            var currentRoster = {};
            var runAfterFinished = [];
            for (var i = 0; i < ConfigSettings_1.servers.length; i++) {
                var listenKey = ConfigSettings_1.servers[i].listenPort;
                if (this.listenServers[listenKey]) {
                    this.listenServers[listenKey].updateInfo(ConfigSettings_1.servers[i]);
                    for (var j = 0; j < ConfigSettings_1.servers[i].routingServers.length; j++) {
                        this.servers[ConfigSettings_1.servers[i].routingServers[j].name] = ConfigSettings_1.servers[i].routingServers[j];
                    }
                }
                else {
                    runAfterFinished.push({
                        key: listenKey,
                        index: i
                    });
                }
                currentRoster[listenKey] = 1;
            }
            var currentListenServers = _.keys(this.listenServers);
            for (var i = 0; i < currentListenServers.length; i++) {
                if (!currentRoster[currentListenServers[i]]) {
                    // Close down
                    this.listenServers[currentListenServers[i]].shutdown();
                    delete this.listenServers[currentListenServers[i]];
                }
            }
            for (var i = 0; i < runAfterFinished.length; i++) {
                var serversIndex = runAfterFinished[i].index;
                this.listenServers[runAfterFinished[i].key] = new listenserver_1["default"](ConfigSettings_1.servers[serversIndex], this.serversDetails, this.handlers, this.servers, this.options);
                for (var j_1 = 0; j_1 < ConfigSettings_1.servers[serversIndex].routingServers.length; j_1++) {
                    this.servers[ConfigSettings_1.servers[serversIndex].routingServers[j_1].name] = ConfigSettings_1.servers[serversIndex].routingServers[j_1];
                }
            }
            // Update options
            var keys = _.keys(this.options);
            for (var i = 0; i < keys.length; i++) {
                this.options[keys[i]] = ConfigSettings_1.options[keys[i]];
            }
        }
        catch (e) {
            console.log("Error loading Config: " + e);
        }
        console.log("\033[33mReloaded Config.\033[37m");
    };
    return Dimensions;
}());
exports.__esModule = true;
exports["default"] = Dimensions;
