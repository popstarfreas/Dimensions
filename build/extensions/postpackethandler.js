"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const priorserverhandler_1 = require("./priorserverhandler");
class PostPacketHandler {
    constructor(translator) {
        this.serverHandler = new priorserverhandler_1.default(translator);
    }
}
exports.default = PostPacketHandler;
