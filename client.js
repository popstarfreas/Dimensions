define(['player', 'utils', 'terrariaserver', 'net', 'config', 'packettypes'], function(Player, Utils, TerrariaServer, net, Config, PacketTypes) {
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
    },

    setName: function(name) {
      this.player.name = name;
    },

    getName: function() {
      return this.player.name;
    },

    handleDataSend: function(encodedData) {
      var self = this;
      var data = Utils.hex2str(encodedData); // Hex Data is made into a useable string (still with hex chars)
      var packetType = Utils.getPacketTypeFromHexString(data);
      //console.log("Client Packet [" + packetType + "]: " + (PacketTypes[packetType]));
      if (this.connected) {
        var handled = false;
        switch (packetType) {
          case 4:
            playerInfo = encodedData;
            var nameLength = parseInt(data.substr(12, 2), 16);
            if (this.name === null) {
              // Take the appropriate hex chars out of the packet
              // then convert them to ascii
              name = Utils.hex2a(data.substr(14, nameLength * 2));
              this.setName(name);
              this.interface.broadcastToOthers(name + " has joined the Portal Server.");
            }
            break;
          case 5:
            break;
          case 6:
          case 9:
            if (this.state === 0) {
              // Finished sending inventory
              this.state = 1;
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
              this.sendChatMessage("Told to connect to " + ip + ":" + port, "FF0000");
              this.changeServer(ip, port);
            }


            if (chatMessage.split(' ')[0].toString() === "/main") {
              handled = true;
              ip = "t.dark-gaming.com";
              port = "7777";
              this.sendChatMessage("Told to connect to " + ip + ":" + port, "FF0000");
              this.changeServer(ip, port);
              handled = true;
            }

            if (chatMessage.split(' ')[0].toString() === "/mirror") {
              handled = true;
              ip = "t.dark-gaming.com";
              port = "7778";
              this.sendChatMessage("Told to connect to " + ip + ":" + port, "FF0000");
              handled = true;
              this.changeServer(ip, port);
            }

            if (chatMessage.split(' ')[0].toString() === "/gm") {
              handled = true;
              ip = "gm.dark-gaming.com";
              port = "7777";
              this.sendChatMessage("Told to connect to " + ip + ":" + port, "FF0000");
              this.changeServer(ip, port);
              handled = true;
            }

            if (chatMessage.split(' ')[0].toString() === "/portal") {
              handled = true;
              ip = Config.IP;
              port = Config.PORT;
              this.sendChatMessage("Told to connect to go back to Portal", "FF0000");
              this.changeServer(ip, port);
              handled = true;
            }

            if (chatMessage.split(' ')[0].toString() === "/sr") {
              handled = true;
              ip = "t.shadowrain.net";
              port = "7777";
              this.sendChatMessage("Told to connect to go to ShadowRain", "FF0000");
              this.changeServer(ip, port);
              handled = true;
            }

            if (chatMessage.split(' ')[0].toString() === "/pt") {
              handled = true;
              ip = "gm.dark-gaming.com";
              port = "3000";
              this.sendChatMessage("Told to connect to go to ProjectT", "FF0000");
              this.changeServer(ip, port);
              handled = true;
            }

            if (chatMessage.split(' ')[0].toString() === "/c") {
              handled = true;
              var message = chatMessage.substr(chatMessage.split(' ')[0].length + 1);
              this.interface.broadcastToClients(name + ": " + message, "00ffd0");
            }

            if (chatMessage.split(' ')[0].toString() === "/cw") {
              handled = true;
              var usersList = "Players: ";
              for (var i = 0; i < clients.length; i++) {
                usersList += (clients[i].name + (i != clients.length - 1 ? ", " : ""));
              }

              this.sendChatMessage(usersList, "00ffd0", clientSock);
            }

            if (chatMessage.split(' ')[0].toString() === "/cs") {
              var message = chatMessage.substr(chatMessage.split(' ')[0].length + 1);
              var hexMessage = a2hex(message);
              if (hexMessage.length % 2 !== 0) {
                hexMessage = "0" + hexMessage;
              }
              //clientData = new Buffer(hex.substr(0, 16) + hexMessage, 'hex');
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

            if (chatMessage.split(' ')[0].toString() === "/auth") {
              handled = true;
              var code = chatMessage.substr(chatMessage.split(' ')[0].length + 1);
              if (code === "SFP71BJE0S") {
                myClientDetails.auth = true;
                sendChatMessage("Authorized.", "00ff00", clientSock);
              }
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
          if (this.server.socket) {
            this.server.socket.write(encodedData);
          } else {
            this.sendChatMessage("Are you even connected?", "ff0000", clientSock);
          }
        }
      } else {
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
      this.connected = false;
      this.server.socket.removeListener('data', this.server.handleData);
      this.server.socket.removeListener('error', this.server.handleError);
      this.server.socket.destroy();
      this.server.socket = new net.Socket();

      console.log("Connecting to "+ip+":"+port);
      self.server.ip = ip;
      self.server.port = port;
      this.server.socket.connect(parseInt(port), ip, function() {
        // Send Packet 1
        self.server.socket.write(new Buffer("0f00010b5465727261726961313639", "hex"));
        self.state = 2;

        this.connected = true;
        console.log("Connected to "+ip+":"+port);

        //clientSock.write('HTTP/1.1 200 OK\r\n');
      });

      this.server.socket.on('data', this.server.handleData.bind(this.server));
      this.server.socket.on('error', this.server.handleError.bind(this.server));
    },

    handleError: function(err) {
      console.log("Client Socket Error: " + err);
    },

    handleClose: function() {
      console.log("Client Socket Closed.");
      if (this.server.socket && typeof this.server.socket.destroy === 'function') {
        this.server.socket.destroy();
      }
    }
  });

  return Client;
});
