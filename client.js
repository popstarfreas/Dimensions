define(['player', 'utils', 'terrariaserver', 'net', 'config', 'packettypes', 'underscore'], function(Player, Utils, TerrariaServer, net, Config, PacketTypes, _) {
  var Client = Class.extend({
    init: function(id, socket, server, serverCounts, globalHandlers, servers) {
      this.ID = id;

      // TerrariaServer information available for connecting to
      this.servers = servers;

      // The socket connection to the net server associated with this client
      this.socket = socket;

      // The unformatted ip address for the current socket connection to the net server
      this.ip = socket.remoteAddress;

      // This clients player object which can be used
      // for storing inventory and other player information
      this.player = new Player();

      // Global Handlers object whose contents may be updated (reloaded/refreshed)
      this.globalHandlers = globalHandlers;

      // TerrariaServer socket connection and packet handler
      this.server = new TerrariaServer(null, this);
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

      // A boolean indicating that the socket was closed because the client was booted from the TerrariaServers
      // This is set to false again after the close handler has been run
      this.wasKicked = false;

      // Information to the server about a type of join (gamemode)
      this.routingInformation = null;

      // Whether or not count was incremented
      // this will be turned off when we minus from count
      this.countIncremented = false;

      // The counts of all TerrariaServers available
      this.serverCounts = serverCounts;

      this.preventSpawnOnJoin = false;

      this.ServerHandleError = this.server.handleError.bind(this.server);
      this.ServerHandleData = this.server.handleData.bind(this.server);
      this.ServerHandleClose = this.server.handleClose.bind(this.server);
    },

    setName: function(name) {
      this.player.name = name;
    },

    getName: function() {
      return this.player.name;
    },

    handleDataSend: function(encodedData) {
      try {
        var self = this;

        var incompleteData = Utils.hex2str(encodedData);
        //console.log(entireData);

        // Add Buffer Packet (incomplete packet from last data)
        // to the new data
        var bufferPacket = this.bufferPacket;
        var entireData = bufferPacket + incompleteData;

        // Get the individual packets from the data
        var entireDataInfo = Utils.getPacketsFromHexString(entireData);

        // Update Buffer Packet using the new incomplete packet (if any)
        this.bufferPacket = entireDataInfo.bufferPacket;

        var packets = entireDataInfo.packets;

        // The packets are only handled if the client has already connected
        // to a server for the first time
        if (this.initialConnectionAlreadyCreated) {
          var allowedData = "";
          _.each(packets, function(packet) {
            allowedData += self.handlePacket(packet);
          });

          // Send allowedData to the server if the client is connected to one
          if (allowedData.length > 0 && this.connected) {
            if (this.server.socket) {
              this.server.socket.write(new Buffer(allowedData, 'hex'));
            }
            else {
              this.sendChatMessage("Are you even connected?", "ff0000");
            }
          }
        }
        else {
          // Connect to the server for the first time
          this.initialConnectionAlreadyCreated = true;
          this.server.socket = new net.Socket();

          this.server.socket.connect(self.server.port, self.server.ip, function() {
            self.countIncremented = true;
            self.serverCounts[self.server.name]++;
            self.connected = true;

            // Write the data the client sent us to the now connected server
            self.server.socket.write(encodedData);
          });

          this.server.socket.on('data', this.ServerHandleData);
          this.server.socket.on('close', this.ServerHandleClose);
          this.server.socket.on('error', this.ServerHandleError);
        }
      }
      catch (e) {
        console.log("Client Handle Send Data Error: " + e);
      }
    },

    handlePacket: function(packet) {
      var self = this;
      var packetType = packet.packetType;
      var handled = false;

      switch (packetType) {
        case PacketTypes.PlayerInfo:
          handled = self.handlePlayerInfo(packet);
          break;

          // Either will be sent, but not both
        case PacketTypes.ContinueConnecting2:
        case PacketTypes.Status:
          if (self.state === 0) {
            // Finished sending inventory
            self.state = 1;
          }
          break;

        case PacketTypes.UpdateItemOwner:
          // Prevent this being sent unless state is 1
          // this prevents issues with joining while items
          // are next to the player on the past server
          if (self.state !== 1) {
            handled = true;
          }
          break;

        case PacketTypes.ChatMessage:
          handled = self.handleChatMessage(packet);
          break;

        case PacketTypes.DimensionsUpdate:
          // Client cannot send 67 (It's used by Dimensions to communicate special info)
          handled = true;
          break;

        case PacketTypes.ClientUUID:
          handled = self.handleClientUUID(packet);
          break;
      }

      if (!handled) {
        return packet.data;
      }
    },

    /* Start Packet Handlers */
    handlePlayerInfo: function(packet) {
      var self = this;
      var nameLength = parseInt(packet.data.substr(12, 2), 16);
      if (self.name === null) {
        // Take the appropriate hex chars out of the packet
        // then convert them to ascii
        var name = Utils.hex2a(packet.data.substr(14, nameLength * 2));
        self.setName(name);
      }

      return false;
    },

    handleChatMessage: function(packet) {
      var self = this;
      var handled = false;
      var chatMessage = Utils.hex2a(packet.data.substr(16));

      // If chat message is a commandcommand
      if (chatMessage.length > 1 && chatMessage.substr(0, 1) === "/") {
        var command = self.globalHandlers.command.parseCommand(chatMessage);
        handled = self.globalHandlers.command.handle(command.name.toLowerCase(), command.args, self);
      }

      return handled;
    },

    handleClientUUID: function(packet) {
      var self = this;
      var reader = Utils.ReadPacketFactory(packet.data);
      self.clientUUID = reader.readString();

      return false;
    },

    /* End Packet Handlers */

    sendChatMessage: function(message, color) {
      if (message.length > 0) {
        // Set default color to green if no color specified
        if (typeof color === "undefined") {
          color = "00ff00";
        }

        var packetData = Utils.PacketFactory()
          .setType(PacketTypes.ChatMessage)
          .packByte(255)
          .packHex(color)
          .packString(message)
          .data();
        var msg = new Buffer(packetData, 'hex');
        this.socket.write(msg);
      }
    },

    changeServer: function(server, options) {
      var self = this;

      var ip = server.serverIP;
      var port = server.serverPort;
      var name = server.name;

      if (typeof options !== 'undefined' && options.preventSpawnOnJoin !== 'undefined') {
        self.preventSpawnOnJoin = options.preventSpawnOnJoin;
      }
      else {
        self.preventSpawnOnJoin = false;
      }

      // Client is now not connected to a server
      this.connected = false;

      // Remove data and error listeners on TerrariaServer socket
      self.server.socket.removeListener('data', self.ServerHandleData);
      self.server.socket.removeListener('error', self.ServerHandleError);

      self.server.afterClosed = function(self) {
        self.server.afterClosed = null;
        // Remove close listener now that socket has been closed and event was called
        self.server.socket.removeListener('close', self.ServerHandleClose);

        // Start new socket
        self.server.socket = new net.Socket();

        //console.log("Connecting to " + ip + ":" + port);

        // Update server information
        self.server.ip = ip;
        self.server.port = port;
        self.server.name = name;

        // Create connection
        self.server.socket.connect(parseInt(port), ip, function() {
          // Increment server count
          self.countIncremented = true;
          self.serverCounts[self.server.name]++;

          // Send Packet 1
          // This needs to be changed; it should not be hardcoded data
          self.server.socket.write(new Buffer("0f00010b5465727261726961313639", "hex"));
          if (typeof options !== 'undefined' && typeof options.routingInformation !== 'undefined') {
            self.routingInformation = options.routingInformation;
          }
          self.state = 2;
          self.connected = true;
        });

        self.server.socket.on('data', self.ServerHandleData);
        self.server.socket.on('close', self.ServerHandleClose);
        self.server.socket.on('error', self.ServerHandleError);
      };

      // Close the TerrariaServer socket completely
      if (!self.server.socket.destroyed) {
        self.server.socket.destroy();
      }
      else {
        self.server.afterClosed(self);
      }
    },

    tellSelfToClearPlayers: function() {
      var packet;
      var playerID, firstByte, secondByte, packetLength, prePacketLength;
      for (var i = 0; i < 255; i++) {
        if (i === this.player.id)
          continue;

        playerID = (i).toString(16);
        if (playerID.length % 2 !== 0) {
          playerID = "0" + playerID;
        }

        prePacketLength = ((playerID.length + 4) / 2).toString(16);
        if (prePacketLength.length !== 4) {
          for (var j = prePacketLength.length; j < 4; j++) {
            prePacketLength = "0" + prePacketLength;
          }
        }

        // Assign hex packet length
        packetLength = (prePacketLength.length / 2 + parseInt(prePacketLength, 16)).toString(16);

        // Ensure it takes up 4 hex digits
        if (packetLength.length !== 4) {
          for (var j = packetLength.length; j < 4; j++) {
            packetLength = "0" + packetLength;
          }
        }

        // Reverse byte order
        firstByte = packetLength.substr(0, 2);
        secondByte = packetLength.substr(2, 2);
        packetLength = secondByte + firstByte + packetLength.substr(4);

        packet = packetLength + "0e" + playerID + "00";
        this.socket.write(new Buffer(packet, 'hex'));
      }
    },

    tellSelfToClearNPCs: function() {
      var packet;
      var playerID, firstByte, secondByte, packetLength, prePacketLength;
      for (var i = 0; i < 255; i++) {
        if (i === this.player.id)
          continue;

        playerID = (i).toString(16);
        if (playerID.length % 2 !== 0) {
          playerID = "0" + playerID;
        }

        prePacketLength = ((playerID.length + 4) / 2).toString(16);
        if (prePacketLength.length !== 4) {
          for (var j = prePacketLength.length; j < 4; j++) {
            prePacketLength = "0" + prePacketLength;
          }
        }

        // Assign hex packet length
        packetLength = (prePacketLength.length / 2 + parseInt(prePacketLength, 16)).toString(16);

        // Ensure it takes up 4 hex digits
        if (packetLength.length !== 4) {
          for (var j = packetLength.length; j < 4; j++) {
            packetLength = "0" + packetLength;
          }
        }

        // Reverse byte order
        firstByte = packetLength.substr(0, 2);
        secondByte = packetLength.substr(2, 2);
        packetLength = secondByte + firstByte + packetLength.substr(4);

        packet = packetLength + "0e" + playerID + "00";
        this.socket.write(new Buffer(packet, 'hex'));
      }
    },

    tellSelfToClearItems: function() {
      var packet;
      var playerID, firstByte, secondByte, packetLength, prePacketLength;
      for (var i = 0; i < 400; i++) {
        itemID = (i).toString(16);
        if (itemID.length % 2 !== 0) {
          itemID = "0" + itemID;
        }

        prePacketLength = ((playerID.length + 4) / 2).toString(16);
        if (prePacketLength.length !== 4) {
          for (var j = prePacketLength.length; j < 4; j++) {
            prePacketLength = "0" + prePacketLength;
          }
        }

        // Assign hex packet length
        packetLength = (prePacketLength.length / 2 + parseInt(prePacketLength, 16)).toString(16);

        // Ensure it takes up 4 hex digits
        if (packetLength.length !== 4) {
          for (var j = packetLength.length; j < 4; j++) {
            packetLength = "0" + packetLength;
          }
        }

        // Reverse byte order
        firstByte = packetLength.substr(0, 2);
        secondByte = packetLength.substr(2, 2);
        packetLength = secondByte + firstByte + packetLength.substr(4);

        packet = packetLength + "0e" + playerID + "00";
        this.socket.write(new Buffer(packet, 'hex'));
      }
    },

    handleError: function(err) {
      //console.log("Client Socket Error: " + err);
    },

    handleClose: function() {
      //console.log("Client Socket Closed.");
      if (this.server.socket && typeof this.server.socket.destroy === 'function') {
        this.server.socket.destroy();
        this.server.socket.handleClose = function() {};
      }
    },
  });

  return Client;
});
