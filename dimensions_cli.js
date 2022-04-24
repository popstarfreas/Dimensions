const redis = require('redis');
const redisClient = redis.createClient();
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.on('line', (line) => {
  redisClient.publish("dimensions_cli", line.trim());
});