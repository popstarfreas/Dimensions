define([], function() {
	var NPC = {
		init: function(index, type, life) {
			this.index = index;
			this.type = type;
			this.life = life;
		}
	};

	return Class.extend(NPC);
});