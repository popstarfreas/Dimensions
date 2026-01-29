import * as redis from 'redis';
import * as readline from 'readline';

const redisClient = redis.createClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.on('line', (line) => {
  redisClient.publish("dimensions_cli", line.trim());
});
