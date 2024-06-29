const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();
const authMiddleware = require('./authMiddleware'); // Ensure you import your auth middleware correctly

const app = express();
const port = process.env.PORT || 3000;

const redisClient = redis.createClient({
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

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(express.json());

app.get('/images', authMiddleware, async (req, res) => {
  try {
    const cachedImages = await redisClient.get('images');
    if (cachedImages) {
      return res.json(JSON.parse(cachedImages));
    }

    const result = await pool.query('SELECT id, name, image_url, date_created FROM image ORDER BY date_created DESC');
    await redisClient.set('images', JSON.stringify(result.rows), {
      EX: 60 * 60, 
    });

    res.json(result.rows);
  } catch (err) {
    console.error('Error querying the database:', err);
    res.status(500).json({ Error: "Server Error", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

module.exports = redisClient;
