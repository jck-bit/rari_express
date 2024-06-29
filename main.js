require('dotenv').config();
import express, { json } from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import { sign } from 'jsonwebtoken';
import { compare } from 'bcryptjs';
import authMiddleware from './authMiddlware';
import { get, set, del } from './redisClient';

const app = express();
app.use(cors());
app.use(json());


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

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('JWT_SECRET:', process.env.JWT_SECRET);
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/images', authMiddleware, async (req, res) => {
  try {
    const cachedImages = await get('images');
    if (cachedImages) {
      return res.json(JSON.parse(cachedImages));
    }

    const result = await pool.query('SELECT id, name, image_url, date_created FROM image ORDER BY date_created DESC');
    await set('images', JSON.stringify(result.rows), {
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
    await del('images');

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
      await del('images')
      res.json({ message: 'Image deleted successfully', image: result.rows[0] });
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  } catch (err) {
    console.error('Error deleting the image:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
