import Dimensions from "./dimensions";
import * as fs from "fs";

process.on('uncaughtException', function(e) {
   fs.appendFile('../error-log.txt', `${e}\n`, function (err) {

   });
});

var dimensions = new Dimensions();