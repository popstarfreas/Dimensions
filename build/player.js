"use strict";
var Player = (function () {
    function Player() {
        this.id = 0;
        this.name = null;
        // Inventory of Client - only used for SSC -> to Non-SSC switching
        this.inventory = [];
    }
    return Player;
}());
exports.__esModule = true;
exports["default"] = Player;
