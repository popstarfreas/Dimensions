import Item from './item';
class Player {
	id: number;
	name: string;
	inventory: Item[];
	life: number;
	mana: number;

	constructor() {
		this.id = 0;
		this.name = "";
		this.life = 100;
		this.mana = 20;

		// Inventory of Client - only used for SSC -> to Non-SSC switching
		this.inventory = [];
	}
}

export default Player;