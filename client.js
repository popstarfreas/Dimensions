define(['player', 'utils', 'terrariaserver', 'net', 'config', 'packettypes', 'underscore'], function(Player, Utils, TerrariaServer, net, Config, PacketTypes, _) {
  var Client = Class.extend({
    init: function(id, socket, server, serverCounts) {
      this.ID = id;
      this.socket = socket;
      this.ip = socket.remoteAddress;
      this.player = new Player();
      this.currentServer = server;
      this.server = new TerrariaServer(null, this);
      this.server.ip = server.serverIP;
      this.server.port = server.serverPort;
      this.server.name = server.name;
      this.connected = false;
      this.auth = false;
      this.state = 0;
      this.bufferPacket = "";
      this.initialConnectionAlreadyCreated = false;
      this.ingame = false;
      this.serverCounts = serverCounts;

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

        // This is the incomplete packet carried over from last time
        var bufferPacket = this.bufferPacket;
        var entireData = bufferPacket + incompleteData;
        var entireDataInfo = Utils.getPacketsFromHexString(entireData);
        this.bufferPacket = entireDataInfo.bufferPacket;
        var packets = entireDataInfo.packets;
        var count = 0;
        if (this.initialConnectionAlreadyCreated) {
          var allowedData = null;
          _.each(packets, function(packet) {
            var packetType = packet.packetType;
            var data = packet.data;
            if (count++ > 0) {
              //console.log("Client Packet [" + packetType + "]: " + (PacketTypes[packetType])+" was previously hidden");
            } else {
              //console.log("Client Packet [" + packetType + "]: " + (PacketTypes[packetType]));
            }
            var handled = false;
            switch (packetType) {
              case 4:
                var nameLength = parseInt(data.substr(12, 2), 16);
                if (self.name === null) {
                  // Take the appropriate hex chars out of the packet
                  // then convert them to ascii
                  name = Utils.hex2a(data.substr(14, nameLength * 2));
                  self.setName(name);
                }
                break;
              case 5:
                break;
              case 6:
              case 9:
                if (self.state === 0) {
                  // Finished sending inventory
                  self.state = 1;
                }
                break;
                // Chat
              case 25:
                var chatMessage = Utils.hex2a(data.substr(16));
                var ip, port, serverName;
                if (chatMessage.split(' ')[0].toString() === "/main") {
                  handled = true;
                  ip = Config.main.IP;
                  port = Config.main.PORT;
                  serverName = Config.main.name;
                  self.sendChatMessage("Shifting to the Main Dimension", "FF0000");
                  self.changeServer(ip, port, serverName);
                  handled = true;
                }

                if (chatMessage.split(' ')[0].toString() === "/mirror") {
                  handled = true;
                  ip = Config.mirror.IP;
                  port = Config.mirror.PORT;
                  serverName = Config.mirror.name;
                  self.sendChatMessage("Shifting to the Mirror Dimension", "FF0000");
                  handled = true;
                  self.changeServer(ip, port, serverName);
                }

                if (chatMessage.split(' ')[0].toString() === "/zombies") {
                  handled = true;
                  ip = Config.zombies.IP;
                  port = Config.zombies.PORT;
                  serverName = Config.zombies.name;
                  self.sendChatMessage("Shifting to the Zombies Dimension", "FF0000");
                  self.changeServer(ip, port, serverName);
                  handled = true;
                }

                if (chatMessage.split(' ')[0].toString() === "/pvp") {
                  handled = true;
                  ip = Config.pvp.IP;
                  port = Config.pvp.PORT;
                  serverName = Config.pvp.name;
                  self.sendChatMessage("Shifting to the PvP Dimension", "FF0000");
                  self.changeServer(ip, port, serverName);
                  handled = true;
                }
                break;

              case 68:
                clientUUID = encodedData;
                break;
            }
            // Send future messages if is connected
            if (!handled) {
              // Hax
              //clientData = new Buffer( String("00"+clientData.toString('hex').substr(2)), 'hex' );
              if (allowedData === null) {
                allowedData = packet.data;
              } else {
                allowedData += packet.data;
              }
            }
          });

          if (allowedData !== null && this.connected) {
            if (this.server.socket) {
              this.server.socket.write(new Buffer(allowedData, 'hex'));
            } else {
              this.sendChatMessage("Are you even connected?", "ff0000");
            }
          }
        } else {
          this.initialConnectionAlreadyCreated = true;
          this.server.socket = new net.Socket();

          self.serverCounts[self.server.name]++;
          this.server.socket.connect(self.server.port, self.server.ip, function() {
            self.connected = true;

            // Write the data the client sent us to the now connected server
            self.server.socket.write(encodedData);
          });

          this.server.socket.on('data', this.ServerHandleData);
          this.server.socket.on('close', this.ServerHandleClose);
          this.server.socket.on('error', this.ServerHandleError);
        }
      } catch (e) {
        console.log("Client Handle Send Data Error: " + e);
      }
    },

    sendChatMessage: function(message, color) {
      if (message.length > 0) {
        if (typeof color === "undefined") {
          color = "00ff00";
        }
        color = color.toLowerCase();

        var messageLength;
        try {
          messageLength = (message.length).toString(16); // In HEX
          if (messageLength.length % 2 !== 0) {
            messageLength = "0" + messageLength;
          }
          packetLength = (("00" + "0019ff" + color + messageLength + Utils.a2hex(message)).toString(16).length / 2).toString(16);
          if (packetLength.length % 2 !== 0) {
            packetLength = "0" + packetLength;
          }

          var msg = new Buffer(packetLength + "0019ff" + color + messageLength + Utils.a2hex(message), 'hex');
          this.socket.write(msg);
        } catch (e) {
          console.log(e);
          console.log(packetLength + "0019ff" + color + messageLength + Utils.a2hex(message));
        }
      }
    },

    changeServer: function(server) {
      var self = this;

      var ip = server.serverIP;
      var port = server.serverPort;
      var name = server.name;

      this.connected = false;
      self.server.socket.removeListener('data', self.ServerHandleData);
      self.server.socket.removeListener('error', self.ServerHandleError);
      self.server.socket.destroy();
      self.server.socket.removeListener('close', self.ServerHandleClose);
      self.server.socket = new net.Socket();

      //console.log("Connecting to " + ip + ":" + port);
      self.server.ip = ip;
      self.server.port = port;
      self.server.name = name;
      self.serverCounts[self.server.name]++;
      self.server.socket.connect(parseInt(port), ip, function() {
        // Send Packet 1
        self.server.socket.write(new Buffer("0f00010b5465727261726961313639", "hex"));
        self.state = 2;
        self.connected = true;
      });

      self.server.socket.on('data', self.ServerHandleData);
      self.server.socket.on('close', self.ServerHandleClose);
      self.server.socket.on('error', self.ServerHandleError);
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

    handleError: function(err) {
      //console.log("Client Socket Error: " + err);
    },

    handleClose: function() {
      console.log("Client Socket Closed.");
      if (this.server.socket && typeof this.server.socket.destroy === 'function') {
        this.server.socket.destroy();
      }
    },
  });

  return Client;
});
