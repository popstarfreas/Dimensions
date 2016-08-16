  define(function() {
    var Config = {
      servers: [
        {
          listenPort: "3000",
          routingServers: [{
            name: "ExampleServer",
            serverIP: "127.0.0.1",
            serverPort: "7777",
          }]
        },
      ],

      options: {
        fakeVersion: false,
        fakeVersionNum: 169,
        blockInvis: true
      }
    };

    return Config;
  });
