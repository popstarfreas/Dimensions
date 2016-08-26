"use strict";
var player_1 = require('./player');
var terrariaserver_1 = require('./terrariaserver');
var Net = require('net');
var packettypes_1 = require('./packettypes');
var _ = require('lodash');
var utils_1 = require('./utils');
var Client = (function () {
    function Client(id, socket, server, serversDetails, globalHandlers, servers, options) {
        this.ID = id;
        // Options from the config
        this.options = options;
        // TerrariaServer information available for connecting to
        this.servers = servers;
        // The socket connection to the net server associated with this client
        this.socket = socket;
        // The unformatted ip address for the current socket connection to the net server
        this.ip = socket.remoteAddress;
        // This clients player object which can be used
        // for storing inventory and other player information
        this.player = new player_1["default"]();
        // Global Handlers object whose contents may be updated (reloaded/refreshed)
        this.globalHandlers = globalHandlers;
        // TerrariaServer socket connection and packet handler
        this.server = new terrariaserver_1["default"](null, this);
        this.server.ip = server.serverIP;
        this.server.port = server.serverPort;
        this.server.name = server.name;
        // Current connection state to TerrariaServer
        this.connected = false;
        // Connection State
        // 0 => Fresh Connection
        // 1 => Finished Sending Inventory / Completed Server switch
        // 2 => Connection to new server established (extra packet help required because of the actual clients state
        //      being incapable of sending certain packets)
        // 3 => Packet Help sent  Get Section/Request Sync [8] packet in response to world info [7], now waiting on Update Shield Strengths [101]
        this.state = 0;
        // Incomplete packet from last data received. This is used because all packets are inspected
        this.bufferPacket = "";
        // This is used to make the first connection to a TerrariaServer after receiving data
        this.initialConnectionAlreadyCreated = false;
        // A boolean of whether the current client has made it in-game (they can see minimap, world, tiles, their inventory)
        this.ingame = false;
        // UUID of client
        this.UUID = "";
        this.waitingInventoryReset = false;
        // A boolean indicating that the socket was closed because the client was booted from the TerrariaServers
        // This is set to false again after the close handler has been run
        this.wasKicked = false;
        // Information to the server about a type of join (gamemode)
        this.routingInformation = null;
        // Whether or not count was incremented
        // this will be turned off when we minus from count
        this.countIncremented = false;
        // The counts of all TerrariaServers available
        this.serversDetails = serversDetails;
        this.preventSpawnOnJoin = false;
        this.ServerHandleError = this.server.handleError.bind(this.server);
        this.ServerHandleData = this.server.handleData.bind(this.server);
        this.ServerHandleClose = this.server.handleClose.bind(this.server);
    }
    Client.prototype.getPacketHandler = function () {
        return this.globalHandlers.clientPacketHandler;
    };
    Client.prototype.setName = function (name) {
        this.player.name = name;
    };
    Client.prototype.getName = function () {
        return this.player.name;
    };
    Client.prototype.handleDataSend = function (encodedData) {
        var _this = this;
        try {
            var incompleteData = utils_1.hex2str(encodedData);
            //console.log(entireData);
            // Add Buffer Packet (incomplete packet from last data)
            // to the new data
            var bufferPacket = this.bufferPacket;
            var entireData = bufferPacket + incompleteData;
            // Get the individual packets from the data
            var entireDataInfo = utils_1.getPacketsFromHexString(entireData);
            // Update Buffer Packet using the new incomplete packet (if any)
            this.bufferPacket = entireDataInfo.bufferPacket;
            var packets = entireDataInfo.packets;
            // The packets are only handled if the client has already connected
            // to a server for the first time
            if (this.initialConnectionAlreadyCreated) {
                var allowedData_1 = "";
                _.each(packets, function (packet) {
                    allowedData_1 += _this.getPacketHandler().handlePacket(_this, packet);
                });
                // Send allowedData to the server if the client is connected to one
                if (allowedData_1.length > 0 && this.connected) {
                    if (this.server.socket) {
                        this.server.socket.write(new Buffer(allowedData_1, 'hex'));
                    }
                    else {
                        this.sendChatMessage("Are you even connected?", "ff0000");
                    }
                }
            }
            else {
                // Connect to the server for the first time
                this.initialConnectionAlreadyCreated = true;
                this.server.socket = new Net.Socket();
                this.server.socket.connect(this.server.port, this.server.ip, function () {
                    this.countIncremented = true;
                    this.serverDetails[this.server.name].clientCounts++;
                    this.serverDetails[this.server.name].failedConnAttempts = 0;
                    this.connected = true;
                    // Write the data the client sent us to the now connected server
                    if (this.options.fakeVersion) {
                        var packet = (new utils_1.PacketFactory())
                            .setType(1)
                            .packString("Terraria" + this.options.fakeVersionNum)
                            .data();
                        this.server.socket.write(new Buffer(packet, "hex"));
                    }
                    else {
                        this.server.socket.write(encodedData);
                    }
                });
                this.server.socket.on('data', this.ServerHandleData);
                this.server.socket.on('close', this.ServerHandleClose);
                this.server.socket.on('error', this.ServerHandleError);
            }
        }
        catch (e) {
            console.log("Client Handle Send Data Error: " + e);
        }
    };
    Client.prototype.sendChatMessage = function (message, color) {
        if (message.length > 0) {
            // Set default color to green if no color specified
            if (typeof color === "undefined") {
                color = "00ff00";
            }
            var packetData = (new utils_1.PacketFactory())
                .setType(packettypes_1["default"].ChatMessage)
                .packByte(255)
                .packHex(color)
                .packString(message)
                .data();
            var msg = new Buffer(packetData, 'hex');
            this.socket.write(msg);
        }
    };
    Client.prototype.changeServer = function (server, options) {
        var _this = this;
        var ip = server.serverIP;
        var port = server.serverPort;
        var name = server.name;
        if (typeof options !== 'undefined' && typeof options.preventSpawnOnJoin !== 'undefined') {
            this.preventSpawnOnJoin = options.preventSpawnOnJoin;
        }
        else {
            this.preventSpawnOnJoin = false;
        }
        // Client is now not connected to a server
        this.connected = false;
        // Remove data and error listeners on TerrariaServer socket
        this.server.socket.removeListener('data', this.ServerHandleData);
        this.server.socket.removeListener('error', this.ServerHandleError);
        this.server.afterClosed = function () {
            _this.server.afterClosed = null;
            // Remove close listener now that socket has been closed and event was called
            _this.server.socket.removeListener('close', _this.ServerHandleClose);
            // Start new socket
            _this.server.socket = new Net.Socket();
            if (_this.server.isSSC) {
                _this.waitingInventoryReset = true;
            }
            _this.server.reset();
            //console.log("Connecting to " + ip + ":" + port);
            // Update server information
            _this.server.ip = ip;
            _this.server.port = port;
            _this.server.name = name;
            // Create connection
            _this.server.socket.connect(port, ip, function () {
                // Increment server count
                this.countIncremented = true;
                this.serverDetails[this.server.name].clientCounts++;
                this.serverDetails[this.server.name].failedConnAttempts = 0;
                // Send Packet 1
                // This needs to be changed; it should not be hardcoded data
                var connectPacket = (new utils_1.PacketFactory())
                    .setType(1)
                    .packString("Terraria173")
                    .data();
                this.server.socket.write(new Buffer(connectPacket, "hex"));
                if (typeof options !== 'undefined' && typeof options.routingInformation !== 'undefined') {
                    this.routingInformation = options.routingInformation;
                }
                this.state = 2;
                this.connected = true;
            });
            _this.server.socket.on('data', _this.ServerHandleData);
            _this.server.socket.on('close', _this.ServerHandleClose);
            _this.server.socket.on('error', _this.ServerHandleError);
        };
        // Close the TerrariaServer socket completely
        if (!this.server.socket.destroyed) {
            this.server.socket.destroy();
        }
        else {
            this.server.afterClosed(this);
        }
    };
    Client.prototype.handleError = function (err) {
        //console.log("Client Socket Error: " + err);
    };
    Client.prototype.handleClose = function () {
        //console.log("Client Socket Closed.");
        if (this.server.socket && typeof this.server.socket.destroy === 'function') {
            this.server.socket.destroy();
        }
    };
    return Client;
}());
exports.__esModule = true;
exports["default"] = Client;
