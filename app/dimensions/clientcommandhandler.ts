import Client from './client.js';
import ClientState from './clientstate.js';
import { TcpRttSample } from './tcprtt/types.js';

export interface Command {
  name: string;
  args: string[];
}

/**
 * Handles commands before they go to any terraria servers
 */
export class ClientCommandHandler {
  /**
   * Turns a message into a command object, splitting the command name
   * from its arguments.
   * 
   * @param message The message to convert into a command object
   * @return The command object created
   */
  public parseCommand(message: string): Command {
    let args: string[] = message.split(' ');
    let name: string = message.substr(1, args[0].length - 1);

    // Remove first arg as it is the command name
    args.splice(0, 1);
    return { name: name.toLowerCase(), args: args };
  }

  /**
   * Handles any matching command from the client
   * 
   * @param command The command object with the name and args
   * @param client The client that is trying to use the command
   * @return whether or not the command was handled
   */
  public handle(command: Command, client: Client): boolean {
    let handled: boolean = false;
    if (command.name === "ping") {
      handled = this.handlePing(client);
    } else if (client.servers[command.name]) {
      if (client.server.name.toLowerCase() == command.name && client.connected) {
        client.sendChatMessage(client.options.language.phrases.youAreAlreadyInthatDimension);
      } else {
        if (client.state === ClientState.FullyConnected || client.state === ClientState.Disconnected) {
          client.sendChatMessage(client.options.language.phrases.shiftingToDimension.replace("${name}", client.servers[command.name].name), "FF0000");

          client.changeServer(client.servers[command.name]);
        } else {
          client.sendChatMessage(client.options.language.phrases.youNeedToWaitUntilConnected);
        }
      }
      handled = true;
    } else {
      switch (command.name) {
        case "who":
          handled = this.handleWho(client);
          break;
        case "dimensions":
        case client.options.language.phrases.dimensionsCommandName:
          handled = this.handleDimensions(client);
          break;
        case "void":
          handled = this.handleVoid(client);
          break;
      }
    }

    return handled;
  }

  /**
   * Adds a message denoting how many users exist in total on this Dimensions instance
   * 
   * @param args The command args
   * @param client The client executing who
   * @return Whether or not the who command was handled
   */
  private handleWho(client: Client): boolean {
    const total = client.getTrackedPlayerCount();

    // Try to make it come after the normal response
    setTimeout(function() {
      client.sendChatMessage(client.options.language.phrases.playerCount.replace("${total}", total.toString()));
    }, 100);
    return false;
  }

  /**
   * Gives the client a list of dimensions available prefixed with '/'
   * 
   * @param args The command args
   * @param client The client who is executing the command
   * @return Whether the dimensions command was handled
   */
  private handleDimensions(client: Client): boolean {
    let dimensionsList: string = "";
    let dimensionNames: string[] = Object.keys(client.servers);
    for (let i: number = 0; i < dimensionNames.length; i++) {
      let name: string = dimensionNames[i];
      let hidden: boolean = client.servers[name].hidden;
      if (!hidden) {
        dimensionsList += (i > 0 ? "[c/00B530:,] " : " ") + "/" + client.servers[name].name;
      }
    }

    client.sendChatMessage(client.options.language.phrases.availableDimensions);
    client.sendChatMessage(dimensionsList);

    return true;
  }

  /**
   * Allows a user to disconnect from their current dimension leaving them without a server
   * 
   * @param args The command args
   * @param client The client executing the void command
   * @return Whether the void command was handled
   */
  private handleVoid(client: Client): boolean {
    client.disconnectFromServer();
    client.sendChatMessage(client.options.language.phrases.youEnteredTheVoid);
    return true;
  }

  private handlePing(client: Client): boolean {
    if (!client.clientTcpRtt.available || client.clientTcpRtt.rttMs === null) {
      client.sendChatMessage(client.options.language.phrases.tcpRttUnavailable);
      return !client.options.tcpRtt.pingCommandPassThrough;
    }

    client.sendChatMessage(this.formatPingMessage(client.options.language.phrases.currentTcpRtt, client));
    return !client.options.tcpRtt.pingCommandPassThrough;
  }

  private formatPingMessage(template: string, client: Client): string {
    return template
      .replace(/\$\{clientRtt\}/g, this.formatRttSample(client.clientTcpRtt))
      .replace(/\$\{serverRtt\}/g, this.formatRttSample(client.serverTcpRtt))
      .replace(/\$\{overallRtt\}/g, this.formatRttSample(client.overallTcpRtt))
      .replace(/\$\{rtt\}/g, this.formatRttSample(client.clientTcpRtt));
  }

  private formatRttSample(sample: TcpRttSample): string {
    if (sample.rttMs === null) {
      return "Unavailable";
    }

    return `${this.formatRttMs(sample.rttMs)}ms`;
  }

  private formatRttMs(rttMs: number): string {
    if (rttMs < 1) {
      return rttMs.toFixed(2);
    }

    if (rttMs < 10) {
      return rttMs.toFixed(1);
    }

    return Math.round(rttMs).toString();
  }
};

export default ClientCommandHandler;
