define(function() {
  var Config = {
    servers: [{
        listenPort: "7777",
        routingServers: [{
          mame: "main",
          serverIP: "t.dark-gaming.com",
          serverPort: "7000",
        }, {
          name: "mirror",
          serverIP: "gm.dark-gaming.com",
          serverPort: "3000",
        }]
      },

      {
        listenPort: "7779",
        routingServers: [{
          name: "zombies",
          serverIP: "gm.dark-gaming.com",
          serverPort: "7777"
        }]
      },

      {
        listenPort: "7776",
        routingServers: [{
          name: "pvp",
          serverIP: "t.dark-gaming.com",
          serverPort: "7001"
        }]
      }
    ]
  };

  return Config;
});
