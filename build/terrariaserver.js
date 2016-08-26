"use strict";
var utils_1 = require('./utils');
var _ = require('lodash');
var TerrariaServer = (function () {
    function TerrariaServer(socket, client) {
        this.socket = socket;
        this.client = client;
        this.reset();
    }
    TerrariaServer.prototype.reset = function () {
        this.ip = null;
        this.port = null;
        this.name = "";
        this.spawn = {
            x: 0,
            y: 0
        };
        this.bufferPacket = "";
        this.afterClosed = null;
        this.entityTracking = {
            items: [],
            NPCs: [],
            players: []
        };
        this.isSSC = false;
    };
    TerrariaServer.prototype.getPacketHandler = function () {
        return this.client.globalHandlers.terrariaServerPacketHandler;
    };
    TerrariaServer.prototype.handleData = function (encodedData) {
        var _this = this;
        try {
            var incompleteData = utils_1.hex2str(encodedData);
            // This is the incomplete packet carried over from last time
            var bufferPacket = this.bufferPacket;
            // The combined packet info using buffer
            var entireData = bufferPacket + incompleteData;
            // Get an array of packets from the entireData
            var entireDataInfo = utils_1.getPacketsFromHexString(entireData);
            // Update buffer packet to the new incomplete packet (if any)
            this.bufferPacket = entireDataInfo.bufferPacket;
            // The hex string of the allowed packets to send to the client
            var allowedPackets_1 = "";
            // Inspect and handle each packet
            var packets = entireDataInfo.packets;
            _.each(packets, function (packet) {
                allowedPackets_1 += _this.getPacketHandler().handlePacket(_this, packet);
            });
            if (allowedPackets_1.length > 0) {
                this.client.socket.write(new Buffer(allowedPackets_1, "hex"));
            }
        }
        catch (e) {
            console.log("TS Handle Data Error: " + e.stack);
        }
    };
    TerrariaServer.prototype.handleClose = function () {
        //console.log("TerrariaServer socket closed. [" + self.name + "]");
        try {
            if (this.client.countIncremented) {
                this.client.serverDetails[self.name].clientCounts--;
                this.client.countIncremented = false;
            }
        }
        catch (e) {
            console.log("handleClose Err: " + e);
        }
        if (this.afterClosed !== null) {
            this.afterClosed(this.client);
        }
        else {
            var dimensionsList = "";
            var dimensionNames = _.keys(this.client.servers);
            for (var i = 0; i < dimensionNames.length; i++) {
                dimensionsList += (i > 0 ? ", " : " ") + "/" + dimensionNames[i];
            }
            if (!this.client.wasKicked) {
                this.client.sendChatMessage("The timeline you were in has collapsed.", "00BFFF");
                this.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
            }
            else {
                this.client.sendChatMessage("Specify a [c/FF00CC:Dimension] to travel to: " + dimensionsList, "00BFFF");
                this.client.wasKicked = false;
            }
        }
    };
    TerrariaServer.prototype.handleError = function (error) {
        //console.log(this.ip + ":" + this.port + " " + this.name);
        //this.client.changeServer(Config.IP, Config.PORT);
        var matches = /ECONN([A-z]*?) /.exec(error.message);
        var type = matches.length > 1 ? matches[1] : "";
        if (type === "REFUSED") {
            if (!this.client.serverDetails[self.name].disabled && ++this.client.serverDetails[self.name].failedConnAttempts >= 3) {
                this.client.serverDetails[self.name].disabled = true;
                setTimeout(function () {
                    this.client.serverDetails[self.name].failedConnAttempts = 0;
                    this.client.serverDetails[self.name].disabled = false;
                }, 20000);
            }
        }
        console.log("TerrariaServer Socket Error: " + error.message);
        this.socket.destroy();
        this.client.connected = false;
    };
    return TerrariaServer;
}());
exports.__esModule = true;
exports["default"] = TerrariaServer;
