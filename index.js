var net = require('net');
require('./lib/class');
var requirejs = require('requirejs');
String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
};
requirejs.config({
  baseUrl: __dirname,
  //Pass the top-level main.js/index.js require
  //function to requirejs so that node modules
  //are loaded relative to the top-level JS file.
  nodeRequire: require
});


function LogClientPacket(clientData) {
  var hex = clientData.toString("hex");
  var packetType = parseInt(hex.substr(4, 2), 16);
  //console.log("Client Packet [" + packetType + "]: " + (packetTypes[packetType]));
  //console.log(hex);
}


requirejs(['config', 'client', 'utils'], function(Config, Client, Utils) {
  var id = 0;
  var clients = [];
  var serverCounts = {
    main: 0,
    mirror: 0,
    zombies: 0,
    pvp: 0
  };

  var interface = {
    broadcastToClients: function(message, color) {
        for (var i = 0; i < clients.length; i++) {
          clients[i].sendChatMessage(message, color ? color : "00ffd0");
        }
      },

      broadcastToOthers: function(client, message, color) {
        for (var i = 0; i < clients.length; i++) {
          if (clients[i].ID !== client.ID) {
            clients[i].sendChatMessage(message, color ? color : "00ffd0");
          }
        }
      }
  };

  function HandleSocket(socket, server) {
    if (socket && socket.remoteAddress)
     console.log("Client: " + Utils.getProperIP(socket.remoteAddress) + " connected ["+server.name+"]; ["+serverCounts.main+", "+serverCounts.mirror+", "+serverCounts.zombies+", "+serverCounts.pvp+"]");
    var client = new Client(id++, socket, server, serverCounts);
    clients.push(client);

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
        console.log("HandleError ERROR: " + e);
      }
    });

    socket.on('close', function() {
      try {
        if (socket && socket.remoteAddress)
          console.log("Client: " + Utils.getProperIP(socket.remoteAddress) + " disconnected; ["+serverCounts.main+", "+serverCounts.mirror+", "+serverCounts.zombies+", "+serverCounts.pvp+"]");
        client.handleClose();
        for (var i = 0; i < clients.length; i++) {
          if (clients[i].ID === client.ID) {
            clients.splice(i, 1);
            break;
          }
        }
      } catch (e) {
        console.log("SocketCloseEvent ERROR: " + e);
      }
    });
  }

  var main = net.createServer(function(socket) {
    var server;
    if (serverCounts.main > serverCounts.mirror) {
      server = Config.mirror;
    } else {
      server = Config.main;
    }
    HandleSocket(socket, server);
  });


  var mirror = net.createServer(function(socket) {
    var server;
    if (serverCounts.main > serverCounts.mirror) {
      server = Config.mirror;
    } else {
      server = Config.main;
    }
    HandleSocket(socket, server);
  });

  var zombies = net.createServer(function(socket) {
    HandleSocket(socket, Config.zombies);
  });

  var pvp = net.createServer(function(socket) {
    HandleSocket(socket, Config.pvp);
  });


  main.on('error', function(e) {
    console.log("Main Server Error: " + e);
  });

  main.listen(7777, function() {
    console.log('Main Routing Server Bound');
  });

  mirror.listen(7778, function() {
    console.log('Main (alt) Routing Server Bound');
  });

  zombies.on('error', function(e) {
    console.log("Zombies Server Error: " + e);
  });

  zombies.listen(7779, function() {
    console.log('Zombies Routing Server Bound');
  });

  pvp.on('error', function(e) {
    console.log("PvP Server Error: " + e);
  });

  pvp.listen(7776, function() {
    console.log('PvP Routing Server Bound');
  });
});
