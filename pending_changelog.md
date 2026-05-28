# Features
 * Add structured disconnect reasons to dimension and Dimensions disconnect logs, including reason codes, details, and structured log metadata.
  * Disconnect logs now distinguish cases such as explicit Dimensions disconnect packets, backend disconnect packets, client socket errors/timeouts, backend socket errors/timeouts/resets/refusals, dimension switches, blacklist failures, connection limits, connection rate limits, no available routing servers, and invalid backend packet lengths.
 * Support `serverName` in `SwitchServerManual` dimension update packets so manual switches can preserve a provided target server name instead of always using `ip:port`.

# Bugfixes
 * Fix blacklist checks to wait for the client's `ConnectRequest` before sending status or player slot setup packets, preventing mobile clients from skipping the initial version handshake.
 * Fix dimension switches to drain client packets queued during backend reconnection once the new server connection is established.
 * Fix dimension switches to restore client ping flow after spawn completion so clients keep sending pings after switching dimensions.
 * Fix client count handling when server details are missing during backend disconnect cleanup.
 * Fix backend failed-connection attempt handling to use socket error codes and avoid assuming server details exist.
 * Fix utility packet-buffering spec names so Jasmine 6 no longer reports duplicate spec names.
 * Fix the TypeScript 6 build configuration by explicitly setting `rootDir` and global type packages.

# Dependencies
 * Update `terraria-packet` for the new `SwitchServerManual` packet payload shape.
 * Update dependencies for audit and maintenance, including `glob` 13, TypeScript 6, Jasmine 6, `@rescript/runtime` 12.2, `uuid` 11.1.1, `yaml` 2.8.4, and refreshed `@types` packages.
 * Remove `@types/glob`, as modern `glob` provides its own TypeScript declarations.
