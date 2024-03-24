import Dimensions from "dimensions";
import { ConfigSettings } from 'dimensions/configloader';
import * as winston from "winston";

let logging = winston.createLogger({
   level: 'info',
   format: winston.format.json(),
   transports: [
      new winston.transports.File({ filename: 'dimensions.log', level: 'info' }),
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
   ]
})

if (ConfigSettings.options.log.outputToConsole) {
   logging.add(new winston.transports.Console({
      format: winston.format.combine(
         winston.format.colorize(),
         winston.format.printf(info => {
            return `${info.message}`;
         })
      )
   }));
}

process.on('unhandledRejection', (reason: any, promise: any) => {
   logging.error('Reason: ' + reason, promise);
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
