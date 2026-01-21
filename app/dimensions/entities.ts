import Item from './item.js';
import NPC from './npc.js';
import Player from './player.js';
import Pylon from './pylon.js';

interface Entities {
  items: (Item | undefined)[];
  NPCs: (NPC | undefined)[];
  players: (Player | undefined)[];
  pylons: Pylon[];
}

export default Entities;
