class NPC {
	public index: number;
	public type: number;
	public life: number;

	constructor (index: number, type: number, life: number) {
		this.index = index;
		this.type = type;
		this.life = life;
	}
};

export default NPC;