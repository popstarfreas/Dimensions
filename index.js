var net = require('net');
require('./lib/class');
var requirejs = require('requirejs');

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


requirejs(['config', 'client'], function(Config, Client) {
  var id = 0;
  var clients = [];
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

  var server = net.createServer(function(socket) {
    console.log("New client");
    var server = { ip: Config.IP, port: Config.PORT };
    var client = new Client(id++, socket, server, interface);
    clients.push(client);

    socket.on('data', function(data) {
      client.handleDataSend(data);
    });

    socket.on('error', function(e) {
      client.handleError(e);
    });

    socket.on('close', function() {
      client.handleClose();
      var i;
      for (i = 0; i < clients.length; i++) {
        if (clients[i].ID !== client.ID) {
          sendChatMessage(name + " has left us.", "00ffd0", clients[i].socket);
        }
      }

      for (i = 0; i < clients.length; i++) {
        if (clients[i].ID === client.ID) {
          clients.splice(i, 1);
          break;
        }
      }
    });
  });

  server.on('error', function(e) {
    console.log(e);
  });
  server.listen(3002, function() {
    console.log('server bound');
  });

});
