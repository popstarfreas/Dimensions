## Features
- Add support for Terraria 1.4.5.8 packet definitions, including WorldInfo dungeon coordinates.
- Add support for Terraria 1.4.5.7 packet definitions.

## Bugfixes
- Preserve packet order during dimension switches.
- Increase pre-ready packet queue limits to allow full Terraria 1.4.5.6 inventory bursts during joins and dimension switches.
- Preserve NPC generation IDs and use the item-clear packet when removing stale entities during dimension switches.

## Dependencies
- Update `terraria-packet` for Terraria 1.4.5.8.
- Update `terraria-packet` for Terraria 1.4.5.7.
