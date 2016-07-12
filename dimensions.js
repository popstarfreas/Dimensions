define(['listenserver', 'config', 'client', 'utils', 'interface', 'underscore'], function(ListenServer, Config, Client, Utils, Interface, _) {
  var Dimensions = Class.extend({
    init: function() {
      var self = this;
      self.id = 0;
      self.clients = [];
      self.servers = [];
      self.serverCounts = [];

      self.interface = new Interface(self.handleCommand.bind(self));

      var listenServers = _.keys(Config.servers);
      for (var i = 0; i < listenServers.length; i++) {
        self.servers.push(new ListenServer(Config.servers[listenServers[i]], self.serverCounts));
      }
    },

    handleCommand: function(cmd) {
      switch (cmd) {
        case "reload":
          Config = require('./config.js');
          break;
      }
    }
  });

  return Dimensions;
});
