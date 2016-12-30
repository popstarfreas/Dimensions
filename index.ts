process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

import Dimensions from "dimensions";
import Logger from "logger";
import * as fs from "fs";

let logging = new Logger(`${Date.now().toString()}.log`);
let errorLogging = new Logger("error-log.txt");

process.on('unhandledRejection', (reason, promise) => {
    errorLogging.appendLine('Reason: ' + reason);
    errorLogging.appendLine(promise);
});

process.on('uncaughtException', function(e) {
   errorLogging.appendLine(e);
});

var dimensions = new Dimensions(logging);