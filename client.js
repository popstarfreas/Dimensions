define(['player', 'utils', 'terrariaserver', 'net', 'config', 'packettypes', 'underscore'], function(Player, Utils, TerrariaServer, net, Config, PacketTypes, _) {
  var Client = Class.extend({
    init: function(id, socket, server, interface) {
      this.ID = id;
      this.socket = socket;
      this.ip = socket.remoteAddress;
      this.player = new Player();
      this.server = new TerrariaServer(null, this);
      this.connected = false;
      this.auth = false;
      this.state = 0;
      this.interface = interface;
      this.bufferPacket = "";
      this.initialConnectionAlreadyCreated = false;
    },

    setName: function(name) {
      this.player.name = name;
    },

    getName: function() {
      return this.player.name;
    },

    handleDataSend: function(encodedData) {
      var self = this;

      var incompleteData = Utils.hex2str(encodedData);
      //console.log(entireData);

      if (this.bufferPacket.length > 0) {
        console.log("Used bufferPacket");
      }

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
                self.interface.broadcastToOthers(name + " has joined the 5th Dimension.");
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
              var ip, port;
              if (chatMessage.split(' ')[0].toString() === "/connect") {
                handled = true;
                ip = chatMessage.split(' ')[1];
                port = chatMessage.split(' ')[2];
                self.sendChatMessage("Shifting Dimension to  " + ip + ":" + port, "FF0000");
                self.changeServer(ip, port);
              }


              if (chatMessage.split(' ')[0].toString() === "/main") {
                handled = true;
                ip = "t.dark-gaming.com";
                port = "7777";
                self.sendChatMessage("Shifting Dimension to Main", "FF0000");
                self.changeServer(ip, port);
                handled = true;
              }

              if (chatMessage.split(' ')[0].toString() === "/mirror") {
                handled = true;
                ip = "t.dark-gaming.com";
                port = "7778";
                self.sendChatMessage("Shifting Dimension to Mirror", "FF0000");
                handled = true;
                self.changeServer(ip, port);
              }

              if (chatMessage.split(' ')[0].toString() === "/gm") {
                handled = true;
                ip = "gm.dark-gaming.com";
                port = "7777";
                self.sendChatMessage("Shifting Dimension to GameModes", "FF0000");
                self.changeServer(ip, port);
                handled = true;
              }

              if (chatMessage.split(' ')[0].toString() === "/portal") {
                handled = true;
                ip = Config.IP;
                port = Config.PORT;
                self.sendChatMessage("Shifting Dimension to DimensionX", "FF0000");
                self.changeServer(ip, port);
                handled = true;
              }

              if (chatMessage.split(' ')[0].toString() === "/sr") {
                handled = true;
                ip = "t.shadowrain.net";
                port = "7777";
                self.sendChatMessage("Shifting Dimension to ShadowRain", "FF0000");
                self.changeServer(ip, port);
                handled = true;
              }

              if (chatMessage.split(' ')[0].toString() === "/pt") {
                handled = true;
                ip = "gm.dark-gaming.com";
                port = "3000";
                self.sendChatMessage("Shifting Dimension to ProjectT", "FF0000");
                self.changeServer(ip, port);
                handled = true;
              }

              if (chatMessage.split(' ')[0].toString() === "/c") {
                handled = true;
                var message = chatMessage.substr(chatMessage.split(' ')[0].length + 1);
                self.interface.broadcastToClients(name + ": " + message, "00ffd0");
              }

              if (chatMessage.split(' ')[0].toString() === "/cw") {
                handled = true;
                var usersList = "Players: ";
                /*for (var i = 0; i < clients.length; i++) {
                  usersList += (clients[i].name + (i != clients.length - 1 ? ", " : ""));
                }*/

                self.sendChatMessage(usersList, "00ffd0", clientSock);
              }

              if (chatMessage.split(' ')[0].toString() === "/cs") {
                var message = chatMessage.substr(chatMessage.split(' ')[0].length + 1);
                var hexMessage = Utils.a2hex(message);
                if (hexMessage.length % 2 !== 0) {
                  hexMessage = "0" + hexMessage;
                }

                //encodedData = new Buffer(data.substr(0, 16) + hexMessage, 'hex');
              }


              if (chatMessage.split(' ')[0].toString() === "/crash") {
                //encodedData = new Buffer("0000010000", 'hex');
              }

              if (chatMessage.split(' ')[0].toString() === "/crash2") {
                //encodedData = new Buffer("0000020000", 'hex');
              }

              if (chatMessage.split(' ')[0].toString() === "/join") {
                var username = chatMessage.substr(chatMessage.split(' ')[0].length + 1);
                /*for (var i = 0; i < clients.length; i++) {
                  if (clients[i].ID !== clientID) {
                    if (clients[i].name.toLowerCase() === username.toLowerCase()) {
                      sendChatMessage("Joining " + clients[i].name);
                      changeServer(clients[i].server.ip, clients[i].server.port);
                      break;
                    }
                  }
                }*/
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

        this.server.socket.connect(Config.PORT, Config.IP, function() {
          self.server.ip = Config.IP;
          self.server.port = Config.PORT;
          self.connected = true;

          // Write the data the client sent us to the now connected server
          self.server.socket.write(encodedData);
        });

        this.server.socket.on('data', this.server.handleData.bind(this.server));
        this.server.socket.on('error', this.server.handleError.bind(this.server));
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

    changeServer: function(ip, port) {
      var self = this;

      ip = ip || "localhost";
      port = port || 7777;

      this.connected = false;
      this.server.socket.removeListener('data', this.server.handleData);
      this.server.socket.removeListener('error', this.server.handleError);
      this.server.socket.destroy();
      self.server.socket = new net.Socket();

      console.log("Connecting to " + ip + ":" + port);
      self.server.ip = ip;
      self.server.port = port;
      self.server.socket.connect(parseInt(port), ip, function() {
        // Send Packet 1
        self.server.socket.write(new Buffer("0f00010b5465727261726961313639", "hex"));
        self.state = 2;

        self.connected = true;
        console.log("Connected to " + ip + ":" + port);

        //clientSock.write('HTTP/1.1 200 OK\r\n');
      });

      self.server.socket.on('data', self.server.handleData.bind(self.server));
      self.server.socket.on('error', self.server.handleError.bind(self.server));
    },

    tellSelfToClearPlayers: function() {
      console.log("Telling self to clear players");
      var packet;
      var playerID, firstByte, secondByte, packetLength, prePacketLength;
      for (var i = 0; i < 255; i++) {
        console.log(i);
        if (i === this.player.id)
          continue;

        playerID = (i).toString(16);
        if (playerID.length % 2 !== 0) {
          playerID = "0" + playerID;
        }

        console.log(playerID);
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
      console.log("Client Socket Error: " + err);
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
