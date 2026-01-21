import { LogOptions } from "./configloader.js";
import Extension from "./extension/index.js";
import ListenServer from "./listenserver.js";
import * as glob from "glob";
import * as path from "path";
import { Dictionary } from "./dictionary.js";
import ErrorHelper from './errorhelper.js';
import * as winston from 'winston';
import { pathToFileURL } from 'url';

type ExtensionModule = { default: { new(logging: winston.Logger): Extension } }

async function importFresh(modulePath: string): Promise<any> {
    const url = pathToFileURL(modulePath).href;
    return import(`${url}?t=${Date.now()}`);
}

// Note: Bundled extensions (extensions.js) are not supported in ESM mode
// Extensions must be loaded dynamically from the extensions folder

class Extensions {
    public static folder: string = "./extensions";

    public static async loadExtensions(extensionsList: Dictionary<Extension>, listenServers: { [name: string]: ListenServer }, options: LogOptions, logging: winston.Logger, storageMap: Map<string, any>) {
        try {
            logging.info("Dynamically loading extensions.");
            const extensionFiles = glob.sync(`${this.folder}/**/index.js`);

            for (const file of extensionFiles) {
                try {
                    const extensionModule = await importFresh(path.resolve(file)) as ExtensionModule;
                    if (typeof extensionModule.default === "undefined") {
                        continue;
                    }

                    const extension: Extension = new (extensionModule.default)(logging);
                    const storage = storageMap.get(extension.name);
                    if (extension.load && typeof storage !== "undefined") {
                        extension.load(storage);
                        storageMap.delete(extension.name);
                    }

                    extensionsList[extension.name] = extension;
                    if (typeof extension.setListenServers === "function") {
                        extension.setListenServers(listenServers);
                    }

                    if (options.extensionLoad) {
                        logging.info(`[Extension] ${extension.name} ${extension.version} loaded.`);
                    }
                } catch (e) {
                    logging.error(`Failed to load extension from ${file}. Error: ` + ErrorHelper.toMessage(e));
                }
            }
        } catch (e) {
            logging.error(`Failed to load extensions. Error: ` + ErrorHelper.toMessage(e));
        }
    }
}

export default Extensions;
