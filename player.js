define(function() {
	var Player = Class.extend({
		init: function() {
			this.id = 0;
			this.name = null;
			
			// Inventory of Client - only used for SSC -> to Non-SSC switching
      this.inventory = {};
		}
	});

	return Player;
});