/// <reference path="typings/index.d.ts" />
import PacketTypes from './packettypes';
import * as _ from 'lodash';
import Client from './client';
import RoutingInformation from './routinginformation';

export interface Command {
  name: string;
  args: string[];
}

export class ClientCommandHandler {
  parseCommand(message: string): Command {
    let args: string[] = message.split(' ');
    let name: string = message.substr(1, message.split(' ')[0].length - 1);
    return { name: name.toLowerCase(), args: args };
  }

  handle(command: Command, client: Client): boolean {
    let handled: boolean = false;
    if (client.servers[command.name]) {
      client.sendChatMessage("Shifting to the " + command.name.substr(0, 1).toUpperCase() + command.name.substr(1) + " Dimension", "FF0000");
      client.changeServer(client.servers[command.name]);
      handled = true;
    } else {
      switch (command.name) {
        case "who":
          handled = this.handleWho(command.args, client);
          break;
        case "dimensions":
          handled = this.handleDimensions(command.args, client);
          break;
        case "void":
          handled = this.handleVoid(command.args, client);
          break;
        case "boss":
          client.sendChatMessage("Shifting to the " + command.name.substr(0, 1).toUpperCase() + command.name.substr(1) + " Dimension", "FF0000");
          client.changeServer(client.servers["pve"]);
          handled = true;
          break;
        case "warp":
          handled = this.handleWarp(command.args, client);
          break;
        case "join":
          handled = this.handleJoin(command.args, client);
          break;
      }
    }

    return handled;
  }

  handleWarp(args: string[], client: Client): boolean {
    let handled: boolean = false;
    if (args.length > 1) {
      switch (args[0].toLowerCase()) {
        case "boss":
          if (client.server.name !== "pve") {
            client.sendChatMessage("Shifting to the PvE Dimension", "FF0000");
            client.changeServer(client.servers["pve"]);
            handled = true;
          }
          break;
        case "bosshard":
          if (client.server.name !== "pve") {
            client.sendChatMessage("Shifting to the PvE Dimension", "FF0000");
            client.changeServer(client.servers["pve"]);
            handled = true;
          }
          break;
      }
    }

    return handled;
  }

  handleWho(args: string[], client: Client): boolean {
    let total: number = 0;
    let keys: string[] = _.keys(client.serversDetails);
    for (let i: number = 0, len = keys.length; i < len; i++) {
      total += client.serversDetails[keys[i]].clientCount;
    }

    // Try to make it come after the normal response
    setTimeout(function () {
      client.sendChatMessage("There are " + total + " players across all Dimensions in your Timeline.");
    }, 100);
    return false;
  }

  handleDimensions(args: string[], client: Client): boolean {
    let dimensionsList: string = "";
    let dimensionNames: string[] = _.keys(client.servers);
    for (let i: number = 0; i < dimensionNames.length; i++) {
      dimensionsList += (i > 0 ? "[c/00B530:,] " : " ") + "/" + dimensionNames[i];
    }

    client.sendChatMessage("Available Dimensions: ");
    client.sendChatMessage(dimensionsList);

    return true;
  }

  handleVoid(args: string[], client: Client): boolean {
    // Client is now not connected to a server
    client.connected = false;

    // Remove data and error listeners on TerrariaServer socket
    client.server.socket.removeListener('data', client.ServerHandleData);
    client.server.socket.removeListener('error', client.ServerHandleError);
    client.server.socket.removeListener('close', client.ServerHandleClose);
    client.server.socket.destroy();
    client.sendChatMessage("You have entered the Void. You will soon disappear.");
    return true;
  }

  handleJoin(args: string[], client: Client): boolean {
    let handled: boolean = false;
    switch (args[0].toLowerCase()) {
      case "ctg":
      case "ffa":
      case "tdm":
        if (client.server.name !== "pvp") {
          if (client.servers["pvp"]) {
            let routingInformation: RoutingInformation = {
              type: 1,
              info: args[0].toUpperCase()
            };
            client.sendChatMessage("Joining a " + args[0].toUpperCase() + " game.", "FF0000");
            client.changeServer(client.servers["pvp"], { routingInformation: routingInformation });
          } else {
            client.sendChatMessage(args[0].toUpperCase() + " is currently in an inaccessible Dimension. Maybe try later.", "FF0000");
          }
          handled = true;
        }
        break;
      case "zombies":
        if (client.server.name !== "zombies") {
          if (client.servers["zombies"]) {
            let routingInformation: RoutingInformation = {
              type: 1,
              info: "ZombieSurvival"
            };
            client.sendChatMessage("Joining the survivors in the Zombies Dimension.", "FF0000");
            client.changeServer(client.servers["zombies"], { routingInformation: routingInformation });
          } else {
            client.sendChatMessage("Zombies is currently in an inaccessible Dimension. Maybe try later.", "FF0000");
          }
        }
        break;
      default:
        if (client.server.name !== "pvp" && client.server.name !== "zombies") {
          client.sendChatMessage("Unknown gametype to join.", "FF0000");
          handled = true;
        }
        break;
    }

    return handled;
  }
};

export default ClientCommandHandler;