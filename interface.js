define(['readline'], function(readline) {
  var Interface = Class.extend({
    init: function(CommandHandler) {
      this.CommandHandler = CommandHandler;
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      this.rl.on('line', this.handleInput.bind(this));
    },

    handleInput: function(line) {
      var self = this;
      self.CommandHandler(line);
    }
  });

  return Interface;
});