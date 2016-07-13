define(['listenserver', 'config', 'client', 'utils', 'interface', 'underscore'], function(ListenServer, Config, Client, Utils, Interface, _) {
  var Dimensions = Class.extend({
    init: function() {
      var self = this;
      self.id = 0;
      self.clients = [];
      self.servers = {};
      self.serverCounts = [];
      self.handlers = {
        command: new ClientCommandHandler()
      };

      self.interface = new Interface(self.handleCommand.bind(self));

      var listenServers = _.keys(Config.servers);
      for (var i = 0; i < listenServers.length; i++) {
        self.servers[Config.servers[listenServers[i].name]] = new ListenServer(Config.servers[listenServers[i]], self.serverCounts, self.clients, self.handlers, self.servers);
      }
    },

    handleCommand: function(cmd) {
      var self = this;
      switch (cmd) {
        case "reload":
          try {
            Config = require('./config.js');
          } catch (e) {
            console.log("Error loading config: " + e);
          }
          var listenServers = _.keys(Config.servers);
          for (var i = 0; i < listenServers.length; i++) {
            if (self.servers[listenServers[i].name]) {
              self.servers[listenServers[i].name].updateInfo(Config.servers[listenServers[i]]);
            } else {
              self.servers[Config.servers[listenServers[i].name]] = new ListenServer(Config.servers[listenServers[i]], self.serverCounts, self.clients, self.handlers);
            }
          }
          break;
      }
    }
  });

  return Dimensions;
});
