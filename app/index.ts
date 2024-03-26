import Dimensions from "dimensions";
import { ConfigSettings } from 'dimensions/configloader';
import * as winston from "winston";

let fileFormat = winston.format.json()
if (ConfigSettings.options.log.format?.file === "PlainText") {
   fileFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(info => {
         return `${info.message}`;
      })
   )
}

let consoleFormat = fileFormat = winston.format.combine(
   winston.format.colorize(),
   winston.format.printf(info => {
      return `${info.message}`;
   })
)

if (ConfigSettings.options.log.format?.console === "JSON") {
   consoleFormat = winston.format.json()
}

let logging = winston.createLogger({
   level: 'info',
   transports: []
})

if (ConfigSettings.options.log.outputToFile) {
   logging.add(new winston.transports.File({ filename: 'dimensions.log', level: 'info', format: fileFormat }))
   logging.add(new winston.transports.File({ filename: 'error.log', level: 'error', format: fileFormat }))
}

if (ConfigSettings.options.log.outputToConsole) {
   logging.add(new winston.transports.Console({
      format: consoleFormat
   }));
}

process.on('unhandledRejection', (reason: any, _promise: any) => {
   logging.error('unhandledRejection Reason: ' + reason.stack);
});

process.on('uncaughtException', function(e: any) {
   logging.error(e, e.stack);
});

var dimensions = new Dimensions(logging);
process.once('SIGTERM', () => {
   dimensions.close();
})
process.once('SIGINT', () => {
   dimensions.close();
})
