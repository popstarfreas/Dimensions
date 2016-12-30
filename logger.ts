import * as fs from 'fs';

class Logger {
    fileName: string;
    constructor(fileName: string) {
        this.fileName = fileName;
    }

    appendLine(line: string) {
        fs.appendFile(`./logs/${this.fileName}`, `${new Date()}: ${line}\n`, function (err) {
            console.log(`Logger Error: ${err}`);
        });
    }
}

export default Logger;