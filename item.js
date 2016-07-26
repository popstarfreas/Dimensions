define([], function() {
	var Item = {
		init: function(slot, stack, prefix, netID) {
			this.slot = slot;
			this.stack = stack;
			this.prefix = prefix;
			this.netID = netID;
		}
	};

	return Class.extend(Item);
});