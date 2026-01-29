# Major Changes
 * Dimensions is now an ESM module. Source files have moved from `src/node_modules` to `src`
  * For backwards compatibility, the `src/node_modules` path is exported in the package.json and is also symlinked to the new location, best effort has been made to keep this compatible with existing extensions but there is the possibility of accidental breakages. New extensions should use ESM.
 * Configuration is now done via a YAML file in `configuration/config.yaml` this is the recommended approach for new configuration files or for deployment in k8s
  * Legacy config.js is still supported for backwards compatibility, but is not recommended for new deployments
* Client IDs are now UUIDs instead of numbers - you can now use these as proper unique identifiers for that client's particular session

# Features
 * Packet parsing now relies more on the `terraria-packet` dependency - this is just to unify our parsing into one implementation
  *  Use `packetfactory` for buffer reader/writers - for anyone relying on dimensions for these, we recommend to move to use `packetfactory` as dimensions has
 * Blacklist now has hooks
 * Handlers for client/terrariaserver packets now get passed in PacketSource, this tells the extension whether the packet is directly from the client/server or whether it is from dimensions itself 

# Bugfixes
 * Fix client counts getting out of sync with actual number of clients
 * Fix some packets from dimensions not beint sent through handlers
