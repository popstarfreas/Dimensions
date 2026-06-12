import * as Net from 'net';
import * as path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import ErrorHelper from '../errorhelper.js';
import TcpRttProvider from './provider.js';
import { TcpRttSample, tcpInfoSample, unavailableTcpRttSample } from './types.js';

interface NativeTcpRttResult {
  available: boolean;
  rttMicros?: number;
  error?: string;
}

interface NativeTcpRttAddon {
  getTcpRttMicros(fd: number): NativeTcpRttResult;
}

type SocketWithHandle = Net.Socket & {
  _handle?: {
    fd?: number;
  };
};

function getSocketFd(socket: Net.Socket): number | null {
  const fd = (socket as SocketWithHandle)._handle?.fd;
  return typeof fd === "number" && Number.isFinite(fd) ? fd : null;
}

function getPackageRoot(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dirname, "../../..");
}

function getNativeAddonRoot(): string {
  return path.join(getPackageRoot(), "native-addon");
}

class NativeTcpRttProvider implements TcpRttProvider {
  private addon: NativeTcpRttAddon | null = null;
  private loadError: string | null = null;

  constructor() {
    try {
      const require = createRequire(import.meta.url);
      const nodeGypBuild = require("node-gyp-build") as (dir: string) => NativeTcpRttAddon;
      this.addon = nodeGypBuild(getNativeAddonRoot());
    } catch (e) {
      this.loadError = `native TCP RTT addon unavailable: ${ErrorHelper.toMessage(e)}`;
    }
  }

  public sample(socket: Net.Socket): TcpRttSample {
    if (this.addon === null) {
      return unavailableTcpRttSample(this.loadError ?? "native TCP RTT addon unavailable");
    }

    const fd = getSocketFd(socket);
    if (fd === null) {
      return unavailableTcpRttSample("socket file descriptor unavailable");
    }

    let result: NativeTcpRttResult;
    try {
      result = this.addon.getTcpRttMicros(fd);
    } catch (e) {
      return unavailableTcpRttSample(ErrorHelper.toMessage(e));
    }

    if (!result.available || typeof result.rttMicros !== "number") {
      return unavailableTcpRttSample(result.error ?? "TCP RTT unavailable");
    }

    return tcpInfoSample(result.rttMicros);
  }
}

export default NativeTcpRttProvider;
