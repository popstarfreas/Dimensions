import * as glob from 'glob';
import * as path from 'path';
import {requireNoCache} from 'utils';

class Extensions {
    static folder: string = "./extensions";

    static loadExtensions(extensionsList, logLoad) {
        glob.sync(`${this.folder}/**/index.js`).forEach((file) => {
            let extension = new (requireNoCache(path.resolve(file), require).default)();
            extensionsList[extension.name] = extension;

            if (logLoad) {
                console.log(`\u001b[36m[Extension] ${extension.name} ${extension.version} loaded.\u001b[37m`);
            }
        });
    }
}

export default Extensions;