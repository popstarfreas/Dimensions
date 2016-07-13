define([], function() {
  var ClientCommandHandler = Class.extend({
    init: function() {

    },

    parseCommand: function(message) {
      var preargs = message.split(' ');
      preargs.shift();
      var args = preargs;
      var name = message.substr(1, message.split(' ')[0].length - 1);
      return { name: command, args: args };
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
          case "join":
            handled = self.handleJoin(args, client);
            break;
        }
      }

      return handled;
    },

    handleJoin: function(args, client) {
      var handled = false;
      switch (args[0].toLowerCase()) {
        case "ctg":
        case "ffa":
        case "tdm":
        case "lms":
          if (client.currentServer.name !== "pvp") {
            if (client.servers.pvp) {
              routingInformation = {
                type: "gametype",
                gametype: args[0].toLowerCase()
              };
              client.sendChatMessage("Joining a " + args[0].toUpperCase() + " game.", "FF0000");
              client.changeServer(client.servers.pvp, routingInformation);
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
                type: "gametype",
                gametype: "zombies"
              };
              client.sendChatMessage("Joining the survivors in the Zombies Dimension.", "FF0000");
              client.changeServer(client.servers.pvp, routingInformation);
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
  });

  return ClientCommandHandler;
});
