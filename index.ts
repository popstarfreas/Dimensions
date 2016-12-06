process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

import Dimensions from "dimensions";
import * as fs from "fs";

 process.on('unhandledRejection', (reason, promise) => {
        console.log('Reason: ' + reason);
        console.log(promise);
    });

process.on('uncaughtException', function(e) {
   fs.appendFile('../error-log.txt', `${new Date()}: ${e}\n`, function (err) {

   });
});

var dimensions = new Dimensions();