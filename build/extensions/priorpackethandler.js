"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const priorclienthandler_1 = require("./priorclienthandler");
class PriorPacketHandler {
    constructor(translator) {
        this.clientHandler = new priorclienthandler_1.default(translator);
    }
}
exports.default = PriorPacketHandler;
