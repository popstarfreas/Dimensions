class Item {
	slot: number;
	stack: number;
	prefix: number;
	netID: number;

	constructor (slot, stack, prefix, netID) {
		this.slot = slot;
		this.stack = stack;
		this.prefix = prefix;
		this.netID = netID;
	}
};

export default Item;