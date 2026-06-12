#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

function printUsage() {
  console.log(`Usage:
  node scripts/test-tcp-rtt.mjs [host] [port] [options]
  node test-tcp-rtt.mjs [host] [port] [options]

Options:
  --addon-root=PATH     Path to native-addon. Defaults to ./native-addon.
  --samples=N          Number of samples per socket. Defaults to 3.
  --interval=MS        Delay between samples. Defaults to 500.
  --help               Show this help.

If host and port are omitted, only a local loopback TCP pair is tested.`);
}

function parseArgs(argv) {
  const options = {
    addonRoot: null,
    samples: 3,
    intervalMs: 500,
    host: null,
    port: null,
  };
  const positional = [];

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith("--addon-root=")) {
      options.addonRoot = arg.slice("--addon-root=".length);
    } else if (arg.startsWith("--samples=")) {
      options.samples = Number(arg.slice("--samples=".length));
    } else if (arg.startsWith("--interval=")) {
      options.intervalMs = Number(arg.slice("--interval=".length));
    } else {
      positional.push(arg);
    }
  }

  if (positional.length >= 1) {
    options.host = positional[0];
  }
  if (positional.length >= 2) {
    options.port = Number(positional[1]);
  }

  if (!Number.isInteger(options.samples) || options.samples < 1) {
    throw new Error("--samples must be a positive integer");
  }
  if (!Number.isInteger(options.intervalMs) || options.intervalMs < 0) {
    throw new Error("--interval must be a non-negative integer");
  }
  if ((options.host === null) !== (options.port === null)) {
    throw new Error("host and port must be provided together");
  }
  if (options.port !== null && (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535)) {
    throw new Error("port must be a TCP port from 1 to 65535");
  }

  return options;
}

function findAddonRoot(explicitRoot) {
  if (explicitRoot !== null) {
    return path.resolve(explicitRoot);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), "native-addon"),
    path.resolve(scriptDir, "native-addon"),
    path.resolve(scriptDir, "..", "native-addon"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function listNativeFiles(addonRoot) {
  const paths = [
    "build/Release",
    "prebuilds",
    `prebuilds/${process.platform}-${process.arch}`,
  ];

  for (const relativePath of paths) {
    const absolutePath = path.join(addonRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      console.log(`missing: ${relativePath}`);
      continue;
    }

    const entries = fs.readdirSync(absolutePath).join(", ");
    console.log(`found:   ${relativePath}${entries.length > 0 ? ` (${entries})` : ""}`);
  }
}

function withPrebuildsOnly(prebuildsOnly, callback) {
  const previousValue = process.env.PREBUILDS_ONLY;
  if (prebuildsOnly) {
    process.env.PREBUILDS_ONLY = "1";
  } else {
    delete process.env.PREBUILDS_ONLY;
  }

  try {
    return callback();
  } finally {
    if (previousValue === undefined) {
      delete process.env.PREBUILDS_ONLY;
    } else {
      process.env.PREBUILDS_ONLY = previousValue;
    }
  }
}

function clearNodeGypBuildCache() {
  for (const specifier of ["node-gyp-build", "node-gyp-build/node-gyp-build.js"]) {
    try {
      delete require.cache[require.resolve(specifier)];
    } catch {
      // The load attempt below will report the real error.
    }
  }
}

function loadAddon(addonRoot, prebuildsOnly) {
  return withPrebuildsOnly(prebuildsOnly, () => {
    clearNodeGypBuildCache();
    try {
      const nodeGypBuild = require("node-gyp-build");
      let selectedPath = null;
      try {
        selectedPath = nodeGypBuild.path(addonRoot);
      } catch (error) {
        return { ok: false, selectedPath, error };
      }

      try {
        return { ok: true, selectedPath, addon: nodeGypBuild(addonRoot) };
      } catch (error) {
        return { ok: false, selectedPath, error };
      }
    } catch (error) {
      return { ok: false, selectedPath: null, error };
    }
  });
}

function printLoadResult(label, result) {
  console.log(`\n${label}`);
  console.log(`selected: ${result.selectedPath ?? "(none)"}`);
  if (result.ok) {
    console.log("load:     ok");
    console.log(`exports:  ${Object.keys(result.addon).join(", ")}`);
  } else {
    console.log(`load:     failed: ${result.error?.message ?? String(result.error)}`);
  }
}

function getSocketFd(socket) {
  const fd = socket._handle?.fd;
  return typeof fd === "number" && Number.isFinite(fd) ? fd : null;
}

function getSocketEndpoint(socket) {
  if (
    typeof socket.localAddress !== "string" ||
    typeof socket.localPort !== "number" ||
    typeof socket.remoteAddress !== "string" ||
    typeof socket.remotePort !== "number"
  ) {
    return null;
  }

  return {
    localAddress: socket.localAddress,
    localPort: socket.localPort,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
  };
}

function inspectSocket(label, socket) {
  const handle = socket._handle;
  console.log(`\n${label}`);
  console.log(`remote:   ${socket.remoteAddress ?? "(none)"}:${socket.remotePort ?? "(none)"}`);
  console.log(`local:    ${socket.localAddress ?? "(none)"}:${socket.localPort ?? "(none)"}`);
  console.log(`fd:       ${String(handle?.fd)}`);
  console.log(`handle:   ${handle?.constructor?.name ?? typeof handle}`);
  if (handle !== undefined && handle !== null) {
    console.log(`keys:     ${Object.getOwnPropertyNames(handle).join(", ")}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sampleSocket(addon, label, socket, samples, intervalMs) {
  inspectSocket(label, socket);
  const fd = getSocketFd(socket);
  if (fd === null) {
    console.log("fd sample: skipped: socket._handle.fd is not a finite number");
  } else {
    for (let i = 0; i < samples; i += 1) {
      const result = addon.getTcpRttMicros(fd);
      if (result.available) {
        console.log(`fd sample ${i + 1}: ${result.rttMicros}us (${(result.rttMicros / 1000).toFixed(3)}ms)`);
      } else {
        console.log(`fd sample ${i + 1}: unavailable: ${result.error ?? "no error provided"}`);
      }

      if (i + 1 < samples) {
        await delay(intervalMs);
      }
    }
  }

  if (typeof addon.getTcpRttMicrosByEndpoint !== "function") {
    if (process.platform === "win32") {
      console.log("endpoint sample: skipped: native addon does not export getTcpRttMicrosByEndpoint");
    }
    return;
  }

  const endpoint = getSocketEndpoint(socket);
  if (endpoint === null) {
    console.log("endpoint sample: skipped: socket endpoint is unavailable");
    return;
  }

  for (let i = 0; i < samples; i += 1) {
    const result = addon.getTcpRttMicrosByEndpoint(
      endpoint.localAddress,
      endpoint.localPort,
      endpoint.remoteAddress,
      endpoint.remotePort,
    );
    if (result.available) {
      console.log(`endpoint sample ${i + 1}: ${result.rttMicros}us (${(result.rttMicros / 1000).toFixed(3)}ms)`);
    } else {
      console.log(`endpoint sample ${i + 1}: unavailable: ${result.error ?? "no error provided"}`);
    }

    if (i + 1 < samples) {
      await delay(intervalMs);
    }
  }
}

async function makeLoopbackPair() {
  const server = net.createServer();
  const acceptedPromise = new Promise((resolve, reject) => {
    server.once("connection", resolve);
    server.once("error", reject);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const client = net.createConnection({ host: "127.0.0.1", port: address.port });
  await new Promise((resolve, reject) => {
    client.once("connect", resolve);
    client.once("error", reject);
  });

  const accepted = await acceptedPromise;
  await delay(50);
  return { server, client, accepted };
}

async function connectRemote(host, port) {
  const socket = net.createConnection({ host, port });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  await delay(50);
  return socket;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const addonRoot = findAddonRoot(options.addonRoot);

  console.log(`node:     ${process.version}`);
  console.log(`platform: ${process.platform}-${process.arch}`);
  console.log(`os:       ${os.type()} ${os.release()}`);
  console.log(`cwd:      ${process.cwd()}`);
  console.log(`addon:    ${addonRoot}`);
  console.log("");
  listNativeFiles(addonRoot);

  const normalLoad = loadAddon(addonRoot, false);
  const prebuildOnlyLoad = loadAddon(addonRoot, true);
  printLoadResult("normal node-gyp-build load", normalLoad);
  printLoadResult("prebuild-only node-gyp-build load", prebuildOnlyLoad);

  if (!normalLoad.ok && prebuildOnlyLoad.ok) {
    console.log("\nwarning: prebuild-only works, but normal loading fails.");
    console.log("Dimensions uses normal loading, so remove native-addon/build/Release or rebuild the release without it.");
  }

  const addon = normalLoad.addon ?? prebuildOnlyLoad.addon;
  if (addon === undefined) {
    process.exitCode = 1;
    return;
  }

  const loopback = await makeLoopbackPair();
  try {
    await sampleSocket(addon, "loopback client socket", loopback.client, options.samples, options.intervalMs);
    await sampleSocket(addon, "loopback accepted socket", loopback.accepted, options.samples, options.intervalMs);
  } finally {
    loopback.client.destroy();
    loopback.accepted.destroy();
    loopback.server.close();
  }

  if (options.host !== null && options.port !== null) {
    const remote = await connectRemote(options.host, options.port);
    try {
      await sampleSocket(addon, `remote socket ${options.host}:${options.port}`, remote, options.samples, options.intervalMs);
    } finally {
      remote.destroy();
    }
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
