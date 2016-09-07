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
      if (client.server.name == command.name) {
        client.sendChatMessage("You are already in that Dimension.", "FF0000");
      } else {
        client.sendChatMessage("Shifting to the " + command.name.substr(0, 1).toUpperCase() + command.name.substr(1) + " Dimension", "FF0000");
        client.changeServer(client.servers[command.name]);
      }
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
};

export default ClientCommandHandler;