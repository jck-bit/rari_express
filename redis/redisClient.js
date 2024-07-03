require('dotenv').config();
const { createClient } = require('redis');

const redisClient = createClient({
  password: process.env.REDDIS_PASSWORD,
  socket: {
      host: process.env.REDDIS_HOST,
      port: process.env.REDDIS_PORT
  }
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Could not establish a connection with Redis. ' + err);
    process.exit(1);
  }
};

connectRedis();

module.exports = redisClient;
