import Dimensions from "dimensions";
import Logger from "dimensions/logger";
import * as fs from "fs";

let logging = new Logger();
let errorLogging = new Logger("error-log.txt");

process.on('unhandledRejection', (reason: any, promise: any) => {
    errorLogging.appendLine('Reason: ' + reason);
    errorLogging.appendLine(promise);
});

process.on('uncaughtException', function(e: any) {
   errorLogging.appendLine(e);
   errorLogging.appendLine(e.stack);
});

var dimensions = new Dimensions(logging);
process.once('SIGTERM', () => {
   dimensions.close();
})
process.once('SIGINT', () => {
   dimensions.close();
})
