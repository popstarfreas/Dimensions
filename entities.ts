import Item from './item';
import NPC from './npc';
import Player from './player';

interface Entities {
  items: (Item|undefined)[];
  NPCs: (NPC|undefined)[];
  players: (Player|undefined)[];
}

export default Entities;