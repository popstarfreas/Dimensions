import * as glob from 'glob';
import * as path from 'path';
import {requireNoCache} from './utils';

class Extensions {
    static folder: string = "./extensions";

    static loadExtensions(extensionsList) {
        glob.sync(`${this.folder}/**/index.js`).forEach((file) => {
            let extensionName = file.split('/')[2];
            extensionsList[extensionName] = requireNoCache(path.resolve(file), require).default;
        });
    }
}

export default Extensions;