define(['net', 'underscore', 'utils', 'client'], function(net, _, Utils, Client) {
  var ListenServer = Class.extend({
    init: function(info, serverCounts, clients) {
      var self = this;
      self.clients = clients;
      self.serverCounts = serverCounts;
      self.port = info.listenPort;
      self.routingServers = info.routingServers;
      self.serversClientCounts = serverCounts;

      // Init counts
      for (var i = 0; i < self.routingServers.length; i++) {
      	self.serversClientCounts[self.routingServers[i].name] = 0;
      }

      // Listen Server
      self.server = net.createServer(self.handleSocket.bind(self));
      self.server.listen(self.port, self.handleStart.bind(self));
      self.server.on('error', self.handleError.bind(self));
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

    handleStart: function() {
      var self = this;
      console.log("\033[32m Server on " + self.port + " started.\033[37m");
    },

    handleSocket: function(socket) {
      var self = this;
      var chosenServer = self.chooseServer();
      if (socket && socket.remoteAddress) {
        console.log("Client: " + Utils.getProperIP(socket.remoteAddress) + " connected [" + chosenServer.name + ": " + self.serversClientCounts[chosenServer.name] + "]");
      }

      var client = new Client(self.id++, socket, chosenServer, self.serversClientCounts);
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
            console.log("Client: " + Utils.getProperIP(socket.remoteAddress) + " disconnected [" + client.currentServer.name + ": " + self.serversClientCounts[client.currentServer.name] + "]");
          } else {
            console.log("Client ["+client.ID+"] with unknown IP closed.");
          }
          client.handleClose();
          self.serversClientCounts[client.currentServer.name]--;
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
