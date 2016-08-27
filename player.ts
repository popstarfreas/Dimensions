import Item from './item';
class Player {
	id: number;
	name: string;
	inventory: Item[];
	constructor() {
		this.id = 0;
		this.name = "";

		// Inventory of Client - only used for SSC -> to Non-SSC switching
		this.inventory = [];
	}
}

export default Player;