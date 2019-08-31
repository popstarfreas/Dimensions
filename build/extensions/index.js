"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const priorpackethandler_1 = require("./priorpackethandler");
const postpackethandler_1 = require("./postpackethandler");
class MobileTranslator {
    constructor() {
        this.clients = new Set();
        this.name = "Mobile Translator";
        this.version = "v1.0";
        this.author = "popstarfreas";
        this.reloadable = false;
        this.priorPacketHandlers = new priorpackethandler_1.default(this);
        this.postPacketHandlers = new postpackethandler_1.default(this);
    }
    setListenServers(listenServers) {
        this.listenServers = listenServers;
    }
    socketClosePostHandler(socket, client) {
        this.clients.delete(client);
    }
}
exports.default = MobileTranslator;
