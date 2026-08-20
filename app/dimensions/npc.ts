class NPC {
	public index: number;
	public generation: number;
	public type: number;
	public life: number;

	constructor (index: number, type: number, life: number, generation: number = 0) {
		this.index = index;
		this.generation = generation;
		this.type = type;
		this.life = life;
	}
};

export default NPC;
