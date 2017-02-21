import * as glob from 'glob';
import * as path from 'path';
import {requireNoCache} from 'utils';
import Logger from 'logger';
import {LogOptions} from 'configloader';
import Extension from 'extension';

class Extensions {
    static folder: string = "./extensions";

    static loadExtensions(extensionsList: Array<Extension>, options: LogOptions, logging: Logger) {
        glob.sync(`${this.folder}/**/index.js`).forEach((file) => {
            let extension = new (requireNoCache(path.resolve(file), require).default)();
            extensionsList[extension.name] = extension;

            if (options.extensionLoad) {
                if (options.outputToConsole) {
                    console.log(`\u001b[36m[Extension] ${extension.name} ${extension.version} loaded.\u001b[37m`);
                }

                logging.appendLine(`[Extension] ${extension.name} ${extension.version} loaded.`);
            }
        });
    }
}

export default Extensions;