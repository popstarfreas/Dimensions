import * as glob from 'glob';
import * as path from 'path';
import {requireNoCache} from './utils';

class Extensions {
    folder: string = "./extensions";
    handlers: any[];

    constructor() {
        glob.sync(`${this.folder}/**/*.js`).forEach((file) => {
            console.log(file);
            this.handlers.push(new (requireNoCache(path.resolve(file), require).default)());
        });
    }
}

export default Extensions;