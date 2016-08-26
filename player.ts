class Player {
	id: number;
	name: string;
	inventory: string[];
	constructor() {
		this.id = 0;
		this.name = null;

		// Inventory of Client - only used for SSC -> to Non-SSC switching
		this.inventory = [];
	}
}

export default Player;