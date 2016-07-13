define(function() {
  var Config = {
    servers: [{
        listenPort: "7777",
        routingServers: [{
          id: 0,
          name: "main",
          serverIP: "t.dark-gaming.com",
          serverPort: "7000",
        }, {
          id: 1,
          name: "mirror",
          serverIP: "gm.dark-gaming.com",
          serverPort: "3000",
        }]
      },

      {
        listenPort: "7779",
        routingServers: [{
          id: 2,
          name: "zombies",
          serverIP: "gm.dark-gaming.com",
          serverPort: "7777"
        }]
      },

      {
        listenPort: "7776",
        routingServers: [{
          id: 3,
          name: "pvp",
          serverIP: "t.dark-gaming.com",
          serverPort: "7001"
        }]
      }
    ]
  };

  return Config;
});
