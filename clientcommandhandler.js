  define(['lib/class', 'packettypes', 'utils', 'underscore'], function(Class, PacketTypes, Utils, _) {
    var ClientCommandHandler = {
      init: function() {

      },

      parseCommand: function(message) {
        var preargs = message.split(' ');
        preargs.shift();
        var args = preargs;
        var name = message.substr(1, message.split(' ')[0].length - 1);
        return { name: name, args: args };
      },

      handle: function(command, args, client) {
        var self = this;
        var handled = false;
        if (client.servers[command]) {
          client.sendChatMessage("Shifting to the " + command.substr(0, 1).toUpperCase() + command.substr(1) + " Dimension", "FF0000");
          client.changeServer(client.servers[command]);
          handled = true;
        } else {
          switch (command) {
            case "void":
              handled = self.handleVoid(args, client);
              break;
            case "join":
              handled = self.handleJoin(args, client);
              break;
          }
        }

        return handled;
      },

      handleVoid: function(args, client) {
        // Client is now not connected to a server
        client.connected = false;

        // Remove data and error listeners on TerrariaServer socket
        client.server.socket.removeListener('data', client.ServerHandleData);
        client.server.socket.removeListener('error', client.ServerHandleError);
        client.server.socket.removeListener('close', client.ServerHandleClose);
        client.server.socket.destroy();
        client.sendChatMessage("You have entered the Void. It will soon close.");
      },

      handleJoin: function(args, client) {
        var handled = false;
        switch (args[0].toLowerCase()) {
          case "ctg":
          case "ffa":
          case "tdm":
            if (client.currentServer.name !== "pvp") {
              if (client.servers.pvp) {
                routingInformation = {
                  type: 1,
                  info: args[0].toUpperCase()
                };
                client.sendChatMessage("Joining a " + args[0].toUpperCase() + " game.", "FF0000");
                client.changeServer(client.servers.pvp, { routingInformation: routingInformation });
              } else {
                client.sendChatMessage(args[0].toUpperCase() + " is currently in an inaccessible Dimension. Maybe try later.", "FF0000");
              }
              handled = true;
            }
            break;
          case "zombies":
            if (client.currentServer.name !== "zombies") {
              if (client.servers.zombies) {
                routingInformation = {
                  type: 1,
                  info: "ZombieSurvival"
                };
                client.sendChatMessage("Joining the survivors in the Zombies Dimension.", "FF0000");
                client.changeServer(client.servers.pvp, { routingInformation: routingInformation });
              } else {
                client.sendChatMessage("Zombies is currently in an inaccessible Dimension. Maybe try later.", "FF0000");
              }
            }
            break;
          default:
            if (client.currentServer.name !== "pvp" && client.currentServer.name !== "zombies") {
              client.sendChatMessage("Unknown gametype to join.", "FF0000");
              handled = true;
            }
            break;
        }

        return handled;
      }
    };
    return Class.extend(ClientCommandHandler);
  });
