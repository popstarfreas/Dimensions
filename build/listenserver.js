"use strict";
///<reference path="./typings/index.d.ts"/>
var Net = require('net');
var utils_1 = require('./utils');
var client_1 = require('./client');
var ListenServer = (function () {
    function ListenServer(info, serversDetails, globalHandlers, servers, options) {
        this.idCounter = 0;
        this.clients = [];
        this.servers = servers;
        this.options = options;
        this.port = info.listenPort;
        this.routingServers = info.routingServers;
        this.serversDetails = serversDetails;
        this.globalHandlers = globalHandlers;
        // Init counts
        var details;
        for (var i = 0; i < this.routingServers.length; i++) {
            this.serversDetails[this.routingServers[i].name] = {
                clientCount: 0,
                disabled: false,
                failedConnAttempts: 0
            };
        }
        this.ServerHandleError = this.handleError.bind(this);
        this.ServerHandleSocket = this.handleSocket.bind(this);
        this.ServerHandleStart = this.handleStart.bind(this);
        // Listen Server
        this.server = Net.createServer(this.ServerHandleSocket);
        this.server.listen(this.port, this.ServerHandleStart);
        this.server.on('error', this.ServerHandleError);
    }
    // Finds server with lowest client count
    ListenServer.prototype.chooseServer = function () {
        var chosenServer = null;
        var currentClientCount = null;
        var details;
        for (var i = 0; i < this.routingServers.length; i++) {
            details = this.serversDetails[this.routingServers[i].name];
            // Even if the server has been disabled, if we have no current choice, we must use it
            if (!details.disabled || currentClientCount === null) {
                // Favour either lower player count or non-disability
                if (currentClientCount === null || details.clientCount < currentClientCount || this.serversDetails[chosenServer.name].disabled) {
                    chosenServer = this.routingServers[i];
                    currentClientCount = details.clientCount;
                }
            }
        }
        return chosenServer;
    };
    ListenServer.prototype.updateInfo = function (info) {
        this.port = info.listenPort;
        this.routingServers = info.routingServers;
        // Reset counts
        var details;
        for (var i = 0; i < this.routingServers.length; i++) {
            details = this.serversDetails[this.routingServers[i].name];
            details.disabled = false;
            details.failedConnAttempts = 0;
        }
    };
    ListenServer.prototype.shutdown = function () {
        console.log("\033[33m[" + process.pid + "] Server on " + this.port + " is now shutting down.\033[37m");
        for (var i_1 = 0; i_1 < this.clients.length; i_1++) {
            this.clients[i_1].server.socket.removeListener('data', this.clients[i_1].ServerHandleData);
            this.clients[i_1].server.socket.removeListener('error', this.clients[i_1].ServerHandleError);
            this.clients[i_1].server.socket.removeListener('close', this.clients[i_1].ServerHandleClose);
            this.clients[i_1].handleClose = function () { };
            this.clients[i_1].socket.destroy();
        }
        this.clients = [];
        this.server.removeListener('error', this.ServerHandleError);
        this.server.close();
        // Reset counts
        var details;
        for (var i = 0; i < this.routingServers.length; i++) {
            details = this.serversDetails[this.routingServers[i].name];
            details.clientCount = 0;
        }
    };
    ListenServer.prototype.handleStart = function () {
        console.log("\033[32m[" + process.pid + "] Server on " + this.port + " started.\033[37m");
    };
    ListenServer.prototype.handleSocket = function (socket) {
        var _this = this;
        var chosenServer = this.chooseServer();
        if (socket && socket.remoteAddress) {
            console.log("[" + process.pid + "] Client: " + utils_1.getProperIP(socket.remoteAddress) + " connected [" + chosenServer.name + ": " + (this.serversDetails[chosenServer.name].clientCount + 1) + "]");
        }
        else {
            console.log("Unknown client");
        }
        var client = new client_1["default"](this.idCounter++, socket, chosenServer, this.serversDetails, this.globalHandlers, this.servers, this.options);
        this.clients.push(client);
        socket.on('data', function (data) {
            try {
                client.handleDataSend(data);
            }
            catch (e) {
                console.log("HandleDataSend ERROR: " + e);
            }
        });
        socket.on('error', function (e) {
            try {
                client.handleError(e);
            }
            catch (error) {
                console.log("handleError ERROR: " + e);
            }
        });
        socket.on('close', function () {
            try {
                if (socket && socket.remoteAddress) {
                    console.log("[" + process.pid + "] Client: " + utils_1.getProperIP(socket.remoteAddress) + " disconnected [" + client.server.name + ": " + (_this.serversDetails[client.server.name].clientCount) + "]");
                }
                else {
                    console.log("Client [" + client.ID + "] with unknown IP closed.");
                }
                client.handleClose();
                for (var i = 0; i < _this.clients.length; i++) {
                    if (_this.clients[i].ID === client.ID) {
                        _this.clients.splice(i, 1);
                        break;
                    }
                }
            }
            catch (e) {
                console.log("SocketCloseEvent ERROR: " + e);
            }
        });
    };
    ListenServer.prototype.handleError = function (error) {
        console.log("\033[31m Server on " + this.port + " encountered an error: " + error + ".\033[37m");
    };
    return ListenServer;
}());
exports.__esModule = true;
exports["default"] = ListenServer;
