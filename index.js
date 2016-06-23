var net = require('net');

var packetTypes = {
  1: "Connect Request",
  2: "Disconnect",
  3: "Continue Connecting",
  4: "Player Info",
  5: "Player Inventory Slot",
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
  27: "Projectile Update",
  28: "NPC Strike",
  29: "Destroy Projectile",
  30: "Toggle PVP",
  31: "Get Chest Contents/Active Chest",
  32: "Chest Item",
  33: "Set Chest Name/Open Chest",
  34: "Place/Kill Chest",
  35: "Heal Effect",
  36: "Player Zone",
  37: "Request Password",
  38: "Send Password",
  39: "Remove Item Owner",
  40: "Set Active NPC",
  41: "Player Item Animation",
  42: "Player Mana",
  43: "Mana Effect",
  44: "Kill Me",
  45: "Player Team",
  46: "Request Sign",
  47: "Update/Display Sign",
  48: "Set Liquid",
  49: "Complete Connection and Spawn",
  50: "Update Player Buff",
  51: "Special NPC Effect",
  52: "Unlock",
  53: "Add NPC Buff",
  54: "Update NPC Buff",
  55: "Add Player Buff",
  56: "Update NPC Name",
  57: "Update Good/Evil",
  58: "Play Music Item",
  59: "Hit Switch",
  60: "NPC Home Update",
  61: "Spawn Boss/Invasion",
  62: "Player Dodge",
  63: "Paint Tile",
  64: "Paint Wall",
  65: "Player/NPC Teleport",
  66: "Heal Other Player",
  67: "Placeholder",
  68: "Client UUID",
  69: "Get Chest Name",
  70: "Catch NPC(bugs)",
  71: "Release NPC",
  72: "Travelling Merchant Inventory",
  73: "Teleportation Potion",
  74: "Angler Quest",
  75: "Complete Angler quest today",
  76: "Number Of Angler Quests Completed",
  77: "Create Temporary Animation",
  78: "Report Invasion Progress",
  79: "Place Object",
  80: "Sync Player Chest Index",
  81: "Create Combat Text",
  82: "Load NetModule",
  83: "Set NPC Kill Count",
  84: "Set Player Stealth",
  85: "Force Item Into Nearest Chest",
  86: "UpdateTile Entity",
  87: "PlaceTile Entity",
  88: "Alter Item Drop",
  89: "Place Item Frame",
  90: "Update Item Drop - Instanced",
  91: "Sync Emote Bubble",
  92: "Sync Extra Value",
  93: "Social Handshake",
  94: "Deprecated",
  95: "Kill Portal",
  96: "Player Teleport Through Portal",
  97: "Notify Player NPC Killed",
  98: "Notify Player Of Event",
  99: "Update Minion Target",
  100: "NPC Teleport Through Portal",
  101: "Update Shield Strengths",
  102: "Nebula Level Up Request",
  103: "Update Moon Lord Countdown",
  104: "Set NPC Shop Item",
  105: "Toggle Gem Lock",
  106: "Poof of Smoke",
  107: "Chat Message",
  108: "Wired Cannon Shot",
  109: "Mass Wire Operation",
  110: "Mass Wire Operation Consume",
};

function hex2a(hexx) {
  var hex = hexx.toString(); //force conversion
  var str = '';
  for (var i = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

function a2hex(str) {
  var arr = [];
  for (var i = 0, l = str.length; i < l; i++) {
    var hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex);
  }
  return arr.join('');
}

function LogClientPacket(clientData) {
  return;
  var hex = clientData.toString("hex");
  var packetType = parseInt(hex.substr(4, 2), 16);
  console.log("Client Packet [" + packetType + "]: " + (packetTypes[packetType]));
  //console.log(hex);
}

var server = net.createServer(function(clientSock) {
  console.log('client connected');
  var connected = false;
  var serverSock = false;
  var state = 0;

  function changeServer(ip, port) {
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
      }
      state = 2;

      connected = true;

      //clientSock.write('HTTP/1.1 200 OK\r\n');
    });

    serverSock.on('data', handleServerData);
    serverSock.on('error', handleServerError);
  }


  var initialData;
  var playerInfo;
  var clientUUID;
  var playerInventorySlot = [];
  var count = 0;
  var spawnPlayer;
  clientSock.on('data', function(clientData) {
    LogClientPacket(clientData);
    //console.log(clientData.toString("hex"));
    var hex = clientData.toString("hex");
    var packetType = parseInt(hex.substr(4, 2), 16);
    if (connected) {
      var handled = false;
      switch (packetType) {
        case 4:
          playerInfo = clientData;
          break;
        case 5:
          count++;
          if (state === 0) {
            playerInventorySlot.push(clientData);
          }
          break;
        case 6:
        case 9:
          if (state === 0) {
            // Finished sending inventory
            state = 1;
            console.log("Inventory Packets Sent: " + count);
          }
          break;
          // Chat
        case 25:
          console.log(hex);
          var chatMessage = hex2a(hex.substr(16));
          if (chatMessage.split(' ')[0].toString() === "/connect") {
            var ip = chatMessage.split(' ')[1];
            var port = chatMessage.split(' ')[2];
            sendChatMessage("Connecting to "+ip+":"+port, "0000AA", clientSock);
            console.log("Told to connect to " + ip + ":" + port);
            handled = true;

            changeServer(ip, port);
          }
          break;

        case 68:
          clientUUID = clientData;
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
  });

  clientSock.on('error', function(e) {
    console.log(e);
  });

  clientSock.on('close', function() {
    console.log("Disconnnected");
    serverSock.destroy();
  });

  function handleServerData(serverData) {
      var handled = false;
      var hex = serverData.toString("hex");
      var packetType = parseInt(hex.substr(4, 2), 16);
      if (packetTypes[packetType]) {
        //console.log("Server Packet [" + packetType + "]: " + (packetTypes[packetType]));

        if (packetType == 2) {
          handled = true;
          var dcReason = hex2a(hex.substr(6));
          var color = "FF0000"; // Red
          var message = "The server disconnected you. Reason Given: " + dcReason;
          sendChatMessage(message, color, clientSock);


          color = "00FF00"; // Red
          message = "Returning you to the Portal Server.";
          sendChatMessage(message, color, clientSock);

          changeServer('localhost', '7777');
          //console.log(hex2a(hex.substr(6)));
          // console.log(hex);
        }
      }

      var pT;

      if (state === 2) {
        if (packetType === 7) {
          clientData = new Buffer("0b0008ffffffffffffffff", 'hex');
          serverSock.write(clientData);
          LogClientPacket(clientData);


          clientData = new Buffer("08000c00ffffffff", 'hex');
          serverSock.write(clientData);
          LogClientPacket(clientData);
          state = 0;
        }
      }
      // We handle these packets for states >= 2
      /*if (state >= 2) {
        handled = true;
      }

      // Self-Handle initial packets to join (state 2)
      if (state === 2) {
        if (packetType === 3) {
          // Send Player Info
          serverSock.write(playerInfo);
          LogClientPacket(playerInfo);

          // Send UUID
          serverSock.write(clientUUID);
          LogClientPacket(clientUUID);

          //Send Inventory
          for (var i = 0; i < playerInventorySlot.length; i++) {
            serverSock.write(playerInventorySlot[i]);
            LogClientPacket(playerInventorySlot[i]);
          }
          console.log("Inventory Packets Sent: " + playerInventorySlot.length);

          // Send continue connecting 2
          //clientData = new Buffer("030006", 'hex');
          //serverSock.write(clientData);
          //LogClientPacket(clientData);

          state = 3;
        }
      } else
      // Pre-info sent. Waiting response (state 3)
      if (state === 3) {
        if (packetType === 7) {
          // Send get section/request sync   
          clientData = new Buffer("0b0008ffffffffffffffff", 'hex');
          serverSock.write(clientData);
          LogClientPacket(clientData);

          state = 4;
        }
      } else
      // Waiting for Complete Connection and Spawn packet (state 4)
      if (state === 4) {
        if (packetType === 49) {
          // Send Spawn Player
          clientData = new Buffer("08000c00ffffffff", 'hex');
          serverSock.write(clientData);
          LogClientPacket(clientData);

          state = 1;
        }
      }*/

      if (!handled) {
        clientSock.write(serverData);
      }
    }

    function handleServerError() {
      console.log("SERVER ERROR");
    }
});

server.on('error', function(e) {

  console.log(e);
});
server.listen(3000, function() {
  console.log('server bound');
});

// color such as FF0000
function sendChatMessage(message, color, clientSock) {
  var messageLength = (message.length).toString(16); // In HEX
  packetLength = ((14 + messageLength.length + message.length)*2).toString(16);
  var msg = new Buffer(packetLength + "0019FF" + color + messageLength + a2hex(message), 'hex');
  clientSock.write(msg);
}
