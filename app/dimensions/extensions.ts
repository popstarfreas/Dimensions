import { LogOptions } from "./configloader.js";
import Extension from "./extension/index.js";
import ListenServer from "./listenserver.js";
import * as glob from "glob";
import * as path from "path";
import { Dictionary } from "./dictionary.js";
import ErrorHelper from './errorhelper.js';
import * as winston from 'winston';
import { createRequire } from "module";
import { requireNoCache } from "@popstarfreas/packetfactory/utils";

const require = createRequire(import.meta.url);


type ExtensionConstructor = { new(logging: winston.Logger): Extension };

// Note: Bundled extensions (extensions.js) are not supported in ESM mode
// Extensions must be loaded dynamically from the extensions folder

class Extensions {
    public static folder: string = "./extensions";

    public static async loadExtensions(extensionsList: Dictionary<Extension>, listenServers: { [name: string]: ListenServer }, options: LogOptions, logging: winston.Logger, storageMap: Map<string, any>) {
        try {
            logging.info("Dynamically loading extensions.");
            const extensionFiles = glob.sync(`${this.folder}/**/index.*js`);
            const extensionClasses: any[] = [];

            for (const file of extensionFiles) {
                switch (path.extname(file)) {
                    case ".js":
                    case ".cjs":
                        {
                            const extensionCls: ExtensionConstructor = requireNoCache(path.resolve(file), require).default;
                            extensionClasses.push(extensionCls);
                        }
                        break;
                    case ".mjs":
                        {
                            const extensionCls: ExtensionConstructor = (await import(path.resolve(file))).default;
                            extensionClasses.push(extensionCls);
                        }
                        break;
                    default:
                        throw new Error("Unknown extension type.");
                }
            }


            for (const extensionCls of extensionClasses) {
                const extension = new extensionCls(logging);
                if (!extension) {
                    continue;
                }
                const storage = storageMap.get(extension.name);
                if (extension.load && typeof storage !== "undefined") {
                    try {
                        extension.load(storage);
                        storageMap.delete(extension.name);
                    } catch (error) {
                        if (options.extensionError) {
                            const name = extension.name ?? "unknown";
                            const logMessage = `[${process.pid}] Extension ${name} Load Error: ${ErrorHelper.toMessage(error)}`;
                            logging.info(logMessage);
                        }
                    }
                }

                extensionsList[extension.name] = extension;
                if (typeof extension.setListenServers === "function") {
                    try {
                        extension.setListenServers(listenServers);
                    } catch (error) {
                        if (options.extensionError) {
                            const name = extension.name ?? "unknown";
                            const logMessage = `[${process.pid}] Extension ${name} Set Listen Servers Error: ${ErrorHelper.toMessage(error)}`;
                            logging.info(logMessage);
                        }
                    }
                }

                if (options.extensionLoad) {
                    logging.info(`[Extension] ${extension.name} ${extension.version} loaded.`);
                }
            }
        } catch (e) {
            logging.error(`Failed to load extensions. Error: ` + ErrorHelper.toMessage(e));
        }
    }
}

export default Extensions;
