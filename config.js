  define(function() {
    var Config = {
      servers: [{
          listenPort: "3000",
          routingServers: [{
            name: "main",
            serverIP: "127.0.0.1",
            serverPort: "7777",
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
            serverIP: "localhost",
            serverPort: "7777"
          }]
        }
      ],

      options: {
        fakeVersion: false,
        fakeVersionNum: 169,
        blockInvis: true
      }
    };

    return Config;
  });
