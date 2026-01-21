import { ConfigListenServer } from './configloader.js';

interface ReloadTask {
    key: string;
    server: ConfigListenServer,
}

export default ReloadTask;