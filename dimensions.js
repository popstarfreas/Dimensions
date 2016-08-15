define(['redis', 'listenserver', 'config', 'client', 'utils', 'interface', 'underscore', 'clientcommandhandler', 'clientpackethandler', 'terrariaserverpackethandler'],
  function(redis, ListenServer, Config, Client, Utils, Interface, _, ClientCommandHandler, ClientPacketHandler, TerrariaServerPacketHandler) {
    var Dimensions = Class.extend({
      init: function(nativeRequire) {
        var self = this;
        self.id = 0;
        self.nativeRequire = nativeRequire;
        self.servers = {};
        self.options = Config.options;
        self.listenServers = {};
        self.serverDetails = {};
        self.handlers = {
          command: new ClientCommandHandler(),
          clientPacketHandler: new ClientPacketHandler(),
          terrariaServerPacketHandler: new TerrariaServerPacketHandler()
        };

        self.redisClient = redis.createClient();
        self.redisClient.subscribe('dimensions_cli');
        self.redisClient.on('message', function(channel, message) {
          if (channel === "dimensions_cli") {
            self.handleCommand(message);
          }
        });
        self.redisClient.on('error', function(err) {
          console.log("RedisError: " + err);
        });


        //self.interface = new Interface(self.handleCommand.bind(self));

        var listenKey;
        for (var i = 0; i < Config.servers.length; i++) {
          listenKey = Config.servers[i].listenPort;
          self.listenServers[listenKey] = new ListenServer(Config.servers[i], self.serverDetails, self.handlers, self.servers, self.options);

          for (var j = 0; j < Config.servers[i].routingServers.length; j++) {
            self.servers[Config.servers[i].routingServers[j].name] = Config.servers[i].routingServers[j];
          }
        }

        /*setInterval(function() {
          self.printServerCounts();
        }, 5000);*/
      },

      printServerCounts: function() {
        var self = this;
        var serverKeys = _.keys(self.servers);
        var info = "";
        for (var i = 0; i < serverKeys.length; i++) {
          info += "[" + serverKeys[i] + ": " + self.serverCounts[serverKeys[i]] + "] ";
        }
        console.log(info);
      },

      handleCommand: function(cmd) {
        var self = this;
        switch (cmd) {
          case "players":
            self.printServerCounts();
            break;
          case "reload":
            self.reloadServers();
            break;
          case "reloadhandlers":
            self.reloadClientHandlers();
            self.reloadTerrariaServerHandlers();
            console.log("\033[33mReloaded Packet Handlers.\033[37m");
            break;
          case "reloadcmds":
            require.undef('clientcommandhandler');
            require(['clientcommandhandler'], function(ClientCommandHandler) {
              try {
                self.handlers.command = new ClientCommandHandler();
              } catch (e) {
                console.log("Error loading Command Handler: " + e);
              }
            }, function(err) {
              console.log("Error loading Command Handler: " + e);
            });
            console.log("\033[33mReloaded Command Handler.\033[37m");
            break;
        }
      },

      reloadClientHandlers: function() {
        var self = this;
        require.undef('clientpackethandler');
        require(['clientpackethandler'], function(ClientPacketHandler) {
          try {
            self.handlers.clientPacketHandler = new ClientPacketHandler();
          } catch (e) {
            console.log("Error loading Client Packet Handler: " + e);
          }
        }, function(err) {
          console.log("Error loading Client Packet Handler: " + e);
        });
      },

      reloadTerrariaServerHandlers: function() {
        var self = this;
        require.undef('terrariaserverpackethandler');
        require(['terrariaserverpackethandler'], function(TerrariaServerPacketHandler) {
          try {
            self.handlers.terrariaServerPacketHandler = new TerrariaServerPacketHandler();
          } catch (e) {
            console.log("Error loading TerrariaServer Packet Handler: " + e);
          }
        }, function(e) {
          console.log("Error loading TerrariaServer Packet Handler: " + e);
        });
      },

      reloadServers: function() {
        var self = this;
        require.undef('config');
        require(['config'], function(Config) {
          try {
            var currentRoster = {};
            var runAfterFinished = [];
            for (var i = 0; i < Config.servers.length; i++) {
              listenKey = Config.servers[i].listenPort;
              if (self.listenServers[listenKey]) {
                self.listenServers[listenKey].updateInfo(Config.servers[i]);
                for (var j = 0; j < Config.servers[i].routingServers.length; j++) {
                  self.servers[Config.servers[i].routingServers[j].name] = Config.servers[i].routingServers[j];
                }
              } else {
                runAfterFinished.push({
                  key: listenKey,
                  index: i
                });
              }

              currentRoster[listenKey] = 1;
            }

            var currentListenServers = _.keys(self.listenServers);
            for (var i = 0; i < currentListenServers.length; i++) {
              if (!currentRoster[currentListenServers[i]]) {
                // Close down
                self.listenServers[currentListenServers[i]].shutdown();
                delete self.listenServers[currentListenServers[i]];
              }
            }

            for (var i = 0; i < runAfterFinished.length; i++) {
              var serversIndex = runAfterFinished[i].index;
              self.listenServers[runAfterFinished[i].key] = new ListenServer(Config.servers[serversIndex], self.serverCounts, self.handlers, self.servers);
              for (var j = 0; j < Config.servers[serversIndex].routingServers.length; j++) {
                self.servers[Config.servers[serversIndex].routingServers[j].name] = Config.servers[serversIndex].routingServers[j];
              }
            }

            // Update options
            var keys = _.keys(self.options);
            for (var i = 0; i < keys.length; i++) {
              self.options[keys[i]] = Config.options[keys[i]];
            }

          } catch (e) {
            console.log("Error loading Config: " + e);
          }
          console.log("\033[33mReloaded Config.\033[37m");
        }, function(e) {
          console.log("Error loading Config: " + e);
        });
      }
    });

    return Dimensions;
  });
