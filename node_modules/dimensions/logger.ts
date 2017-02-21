import * as fs from 'fs';

class Logger {
    fileName: string;
    constructor(fileName?: string) {
        if (typeof fileName !== 'undefined') {
            this.fileName = fileName;
        } else {
            this.setFileNameToDate();
        }
    }

    appendLine(line: string) {
        fs.appendFile(`../logs/${this.fileName}`, `${new Date()}: ${line}\n`, function (err) {
            if (err !== null) {
                console.log(`Logger Error: ${err}`);
            }
        });
    }

    setFileNameToDate(): void {
        let date = new Date();
        let year = date.getFullYear().toString();
        let month = (date.getMonth()+1).toString(); //January is 0!
        let day = date.getDate().toString();
        let hours = date.getHours().toString();
        let minutes = date.getMinutes().toString();
        let seconds = date.getSeconds().toString();

        month = this.ensureDoubleDigit(month);
        day = this.ensureDoubleDigit(day);
        hours = this.ensureDoubleDigit(hours);
        minutes = this.ensureDoubleDigit(minutes);
        seconds = this.ensureDoubleDigit(seconds);

        this.fileName = `${year}-${month}-${day}-${hours}_${minutes}_${seconds}.log`;
    }

    ensureDoubleDigit(displayNumber: string): string {
        return displayNumber.length < 2 ? '0'+displayNumber : displayNumber;
    }
}

export default Logger;