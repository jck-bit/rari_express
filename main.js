const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('./authMiddlware')
const redisClient = require('./redisClient');


const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();

const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get('/', (req, res) => {
  res.send("Hello from Express");
});

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


app.get('/images/:id', async (req, res) => {
  const imageId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM image WHERE id = $1', [imageId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  } catch (err) {
    console.error('Error querying the database:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/saved-images', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT image.* FROM image
      JOIN user_saved_images ON image.id = user_saved_images.image_id
      WHERE user_saved_images.user_id = $1
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error querying the database:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/saved-images', authMiddleware, async (req, res) => {
  const { image_id } = req.body;
  const userId = req.user.id;

  try {
    const imageResult = await pool.query('SELECT id, name, image_url FROM image WHERE id = $1', [image_id]);
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const result = await pool.query(
      'INSERT INTO user_saved_images (user_id, image_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [userId, image_id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'Image already saved' });
    }

    // Invalidate the cache
    await redisClient.del('images');

    res.status(201).json({ message: 'Image saved successfully' });
  } catch (err) {
    console.error('Error saving image:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.delete('/images/:id', authMiddleware, async (req, res) => {
  const imageId = req.params.id;

  try {
    const result = await pool.query('DELETE FROM image WHERE id = $1 RETURNING *', [imageId]);
    if (result.rows.length > 0) {
      await redisClient.del('images')
      res.json({ message: 'Image deleted successfully', image: result.rows[0] });
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  } catch (err) {
    console.error('Error deleting the image:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '3m',
    });

    res.json({ token });
  } catch (err) {
    console.error('Error querying the database:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
