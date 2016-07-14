define(['net', 'underscore', 'utils', 'client'], function(net, _, Utils, Client) {
  var ListenServer = Class.extend({
    init: function(info, serverCounts, globalHandlers, servers) {
      var self = this;
      self.clients = [];
      self.servers = servers;
      self.serverCounts = serverCounts;
      self.port = info.listenPort;
      self.routingServers = info.routingServers;
      self.serversClientCounts = serverCounts;
      self.globalHandlers = globalHandlers;

      // Init counts
      for (var i = 0; i < self.routingServers.length; i++) {
        self.serversClientCounts[self.routingServers[i].name] = 0;
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
      var currentServerCount = null;
      for (var i = 0; i < self.routingServers.length; i++) {
        if (currentServerCount === null || currentServerCount < self.serversClientCounts[self.routingServers[i].name]) {
          chosenServer = self.routingServers[i];
          currentServerCount = self.serversClientCounts[self.routingServers[i].name];
        }
      }

      return chosenServer;
    },

    updateInfo: function(info) {
      var self = this;
      self.port = info.listenPort;
      self.routingServers = info.routingServers;

      // Reset counts
      for (var i = 0; i < self.routingServers.length; i++) {
        self.serversClientCounts[self.routingServers[i].name] = 0;
      }
    },

    shutdown: function() {
      var self = this;
      console.log("\033[33mServer on " + self.port + " is now shutting down.\033[37m");
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
    },

    handleStart: function() {
      var self = this;
      console.log("\033[32mServer on " + self.port + " started.\033[37m");
    },

    handleSocket: function(socket) {
      var self = this;
      var chosenServer = self.chooseServer();
      if (socket && socket.remoteAddress) {
        console.log("Client: " + Utils.getProperIP(socket.remoteAddress) + " connected [" + chosenServer.name + ": " + (self.serversClientCounts[chosenServer.name] + 1) + "]");
      } else {
        console.log("Unknown client");
      }

      var client = new Client(self.id++, socket, chosenServer, self.serversClientCounts, self.globalHandlers, self.servers);
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
            console.log("Client: " + Utils.getProperIP(socket.remoteAddress) + " disconnected [" + client.currentServer.name + ": " + (self.serversClientCounts[client.currentServer.name]) + "]");
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
