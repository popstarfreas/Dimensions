class Item {
	public slot: number;
	public stack: number;
	public prefix: number;
	public netID: number;

	constructor (slot: number, stack: number, prefix: number, netID: number) {
		this.slot = slot;
		this.stack = stack;
		this.prefix = prefix;
		this.netID = netID;
	}
};

export default Item;