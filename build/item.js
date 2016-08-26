"use strict";
var Item = (function () {
    function Item(slot, stack, prefix, netID) {
        this.slot = slot;
        this.stack = stack;
        this.prefix = prefix;
        this.netID = netID;
    }
    return Item;
}());
;
exports.__esModule = true;
exports["default"] = Item;
