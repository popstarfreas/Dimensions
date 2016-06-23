var net = require('net');

var packetTypes = {
  1: "Connect Request",
  2: "Disconnect",
  3: "Continue Connecting",
  4: "Player Info",
  //5: "Player Inventory Slot",
  6: "Continue Connecting 2",
  7: "World Info",
  8: "Get Section/Request Sync",
  9: "Status",
  10: "Send Section",
  11: "Section Tile Frame",
  12: "Spawn Player",
  13: "Update Player",
  14: "Player Active",
  15: "Null",
  16: "Player HP",
  17: "Modify Tile",
  18: "Time",
  19: "Door Toggle",
  20: "Send Tile Square",
  21: "Update Item Drop",
  22: "Update Item Owner",
  23: "NPC Update",
  24: "Strike NPC with Held Item",
  25: "Chat Message",
  26: "Player Damage",
};

function hex2a(hexx) {
  var hex = hexx.toString(); //force conversion
  var str = '';
  for (var i = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}
var server = net.createServer(function(clientSock) {
  console.log('client connected');
  var connected = false;
  var serverSock = false;
  var state = 0;



  var initialData;
  clientSock.on('data', function(clientData) {
    var hex = clientData.toString("hex");
    var packetType = parseInt(hex.substr(4, 2), 16);
    if (packetTypes[packetType]) {
      console.log("Client Packet [" + packetType + "]: " + (packetTypes[packetType]));
      console.log(hex);
    }
    //console.log(clientData.toString("hex"));
    if (connected) {
      var handled = false;
      switch (packetType) {

          // Chat
        case 25:
          var chatMessage = hex2a(hex.substr(16));
          if (chatMessage.split(' ')[0].toString() === "/connect") {
            var ip = chatMessage.split(' ')[1];
            var port = chatMessage.split(' ')[2];
            console.log("Told to connect to " + ip + ":" + port);
            handled = true;

            connected = false;
            serverSock.removeListener('data', handleServerData);
            serverSock.removeListener('error', handleServerError);
            serverSock.end();
            serverSock.destroy();
            serverSock = new net.Socket();
            serverSock.connect(parseInt(port), ip, function() {
              console.log("Connected to server " + ip + ":" + port);
              // Send the CONNECT request (Client Hello)
              serverSock.write(new Buffer("0f00010b5465727261726961313639", "hex"));
              var packetType = parseInt("0f00010b5465727261726961313639".substr(4, 2), 16);
              if (packetTypes[packetType]) {
                console.log("Client Packet [" + packetType + "]: " + (packetTypes[packetType]));
                console.log(hex);
              }
              state = 1;

              connected = true;

              //clientSock.write('HTTP/1.1 200 OK\r\n');
            });

            serverSock.on('data', handleServerData);
            serverSock.on('error', handleServerError);
          }
          break;
      }
      // Send future messages if is connected
      if (!handled) {
        // Hax
        //clientData = new Buffer( String("00"+clientData.toString('hex').substr(2)), 'hex' );
        serverSock.write(clientData);
      } else {
        console.log("Blocked Packet [" + packetType + "]: " + (packetTypes[packetType]));
      }
    } else {
      initialData = clientData;
      // Create a new socket to server
      if (!serverSock) {
        serverSock = new net.Socket();

        serverSock.connect(7777, "localhost", function() {
          console.log("Connected to server");
          // Send the CONNECT request (Client Hello)
          serverSock.write(clientData);

          connected = true;

          //clientSock.write('HTTP/1.1 200 OK\r\n');
        });

        serverSock.on('data', handleServerData);
        serverSock.on('error', handleServerError);
      }
    }

    function handleServerData(serverData) {
      var handled = false;
      var hex = serverData.toString("hex");
      var packetType = parseInt(hex.substr(4, 2), 16);
      if (packetTypes[packetType]) {
        console.log("Server Packet [" + packetType + "]: " + (packetTypes[packetType]));
      }

      var pT;
      if (packetType == 7 && state == 1) {
        state = 2;
        console.log("Sent update");
        clientData = new Buffer("0b0008ffffffffffffffff", 'hex');
        serverSock.write(clientData);
        pT = parseInt("0b0008ffffffffffffffff".substr(4, 2), 16);
        if (packetTypes[pT]) {
          console.log("Client Packet [" + pT + "]: " + (packetTypes[pT]));
          console.log(hex);
        }
      } else if (packetType == 7 && state == 2) {
        state = 0;
        console.log("Sent update 2");
        clientData = new Buffer("08000c00ffffffff", 'hex');
        serverSock.write(clientData);
        pT = parseInt("08000c00ffffffff".substr(4, 2), 16);
        if (packetTypes[pT]) {
          console.log("Client Packet [" + pT + "]: " + (packetTypes[pT]));
          console.log(hex);
        }
      } else if (state == 1) {
        handled = true;

        if (packetType == 3) {
          clientData = new Buffer("27000400030706536d656b6b7500800101e4f22cfb815b2e914421ac61f9be376c4cd960b9e904", 'hex');
          serverSock.write(clientData);
          pT = parseInt("27000400030706536d656b6b7500800101e4f22cfb815b2e914421ac61f9be376c4cd960b9e904".substr(4, 2), 16);
          if (packetTypes[pT]) {
            console.log("Client Packet [" + pT + "]: " + (packetTypes[pT]));
            console.log(hex);
          }

          clientData = new Buffer("030006", 'hex');
          serverSock.write(clientData);
          pT = parseInt("030006".substr(4, 2), 16);
          if (packetTypes[pT]) {
            console.log("Client Packet [" + pT + "]: " + (packetTypes[pT]));
            console.log(hex);
          }
        }
      }

      if (!handled) {
        clientSock.write(serverData);
      }
    }

    function handleServerError() {
      console.log("SERVER ERROR");
    }
  });

  clientSock.on('error', function(e) {
    console.log(e);
  });

  clientSock.on('disconnect', function() {
    console.log("Disconnnected");
    serverSock.destroy();
  });
});

server.on('error', function(e) {

  console.log(e);
});
server.listen(1234, function() {
  console.log('server bound');
});
