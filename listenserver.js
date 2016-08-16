define(['net', 'underscore', 'utils', 'client'], function(net, _, Utils, Client) {
  var ListenServer = Class.extend({
    init: function(info, serverDetails, globalHandlers, servers, options) {
      var self = this;
      self.clients = [];
      self.servers = servers;
      self.options = options;
      self.port = info.listenPort;
      self.routingServers = info.routingServers;
      self.serverDetails = serverDetails;
      self.globalHandlers = globalHandlers;

      // Init counts
      var details;
      for (var i = 0; i < self.routingServers.length; i++) {
        self.serverDetails[self.routingServers[i].name] = {};
        details = self.serverDetails[self.routingServers[i].name];
        details.clientCount = 0;
        details.disabled = false;
        details.failedConnAttempts = 0;
      }


      self.ServerHandleError = self.handleError.bind(self);
      self.ServerHandleSocket = self.handleSocket.bind(self);
      self.ServerHandleStart = self.handleStart.bind(self);

      // Listen Server
      self.server = net.createServer(self.ServerHandleSocket);
      self.server.listen(parseInt(self.port), self.ServerHandleStart);
      self.server.on('error', self.ServerHandleError);
    },

    // Finds server with lowest client count
    chooseServer: function() {
      var self = this;
      var chosenServer = null;
      var currentClientCount = null;
      var details;
      for (var i = 0; i < self.routingServers.length; i++) {
        details = self.serverDetails[self.routingServers[i].name];

        // Even if the server has been disabled, if we have no current choice, we must use it
        if (!details.disabled || currentClientCount === null) {
          // Favour either lower player count or non-disability
          if (currentClientCount === null || details.clientCount < currentClientCount || self.serverDetails[chosenServer.name].disabled) {
            chosenServer = self.routingServers[i];
            currentClientCount = details.clientCount;
          }
        }
      }

      return chosenServer;
    },

    updateInfo: function(info) {
      var self = this;
      self.port = info.listenPort;
      self.routingServers = info.routingServers;

      // Reset counts
      var details;
      for (var i = 0; i < self.routingServers.length; i++) {
        details = self.serverDetails[self.routingServers[i].name];
        details.disabled = false;
        details.failedConnAttempts = 0;
      }
    },

    shutdown: function() {
      var self = this;
      console.log("\033[33m[" + process.pid + "] Server on " + self.port + " is now shutting down.\033[37m");
      for (var i = 0; i < self.clients.length; i++) {
        self.clients[i].server.socket.removeListener('data', self.clients[i].ServerHandleData);
        self.clients[i].server.socket.removeListener('error', self.clients[i].ServerHandleError);
        self.clients[i].server.socket.removeListener('close', self.clients[i].ServerHandleClose);
        self.clients[i].handleClose = function() {};
        self.clients[i].socket.destroy();
      }
      self.clients = [];
      self.server.removeListener('error', self.ServerHandleError);
      self.server.close();

      // Reset counts
      var details;
      for (var i = 0; i < self.routingServers.length; i++) {
        details = self.serverDetails[self.routingServers[i].name];
        details.clientCount = 0;
      }
    },

    handleStart: function() {
      var self = this;
      console.log("\033[32m[" + process.pid + "] Server on " + self.port + " started.\033[37m");
    },

    handleSocket: function(socket) {
      var self = this;
      var chosenServer = self.chooseServer();
      if (socket && socket.remoteAddress) {
        console.log("[" + process.pid + "] Client: " + Utils.getProperIP(socket.remoteAddress) + " connected [" + chosenServer.name + ": " + (self.serverDetails[chosenServer.name].clientCount + 1) + "]");
      } else {
        console.log("Unknown client");
      }

      var client = new Client(self.id++, socket, chosenServer, self.serverDetails, self.globalHandlers, self.servers, self.options);
      self.clients.push(client);

      socket.on('data', function(data) {
        try {
          client.handleDataSend(data);
        } catch (e) {
          console.log("HandleDataSend ERROR: " + e);
        }
      });

      socket.on('error', function(e) {
        try {
          client.handleError(e);
        } catch (error) {
          console.log("handleError ERROR: " + e);
        }
      });

      socket.on('close', function() {
        try {
          if (socket && socket.remoteAddress) {
            console.log("[" + process.pid + "] Client: " + Utils.getProperIP(socket.remoteAddress) + " disconnected [" + client.server.name + ": " + (self.serverDetails[client.server.name].clientCount) + "]");
          } else {
            console.log("Client [" + client.ID + "] with unknown IP closed.");
          }
          client.handleClose();
          for (var i = 0; i < self.clients.length; i++) {
            if (self.clients[i].ID === client.ID) {
              self.clients.splice(i, 1);
              break;
            }
          }
        } catch (e) {
          console.log("SocketCloseEvent ERROR: " + e);
        }
      });
    },

    handleError: function(error) {
      var self = this;
      console.log("\033[31m Server on " + self.port + " encountered an error: " + error + ".\033[37m");
    },
  });

  return ListenServer;
});
