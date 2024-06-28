const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('./middleware/authMiddlware');

const app = express();
app.use(cors());
app.use(express.json());
const port = 3000;

const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false,
    },
})

app.get('/', async(req, res) =>{
  res.send("Hello from Express")
})

app.get('/images',authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM image');
      res.json(result.rows);
      console.log(result.rows)
    } catch (err) {
      console.error('Error querying the database:', err);
      res.status(500).json({ Error:"Server Error",details:err.message })
    }
  });

app.get('/images/:id', authMiddleware, async (req, res) => {
    const imageId = req.params.id;
  
    try {
      const result = await pool.query('SELECT * FROM image WHERE id = $1', [imageId]);
      
      if (result.rows.length > 0) {
        const image = result.rows[0];
        res.json(image);
      } else {
        res.status(404).json({ message: 'Image not found' });
      }
    } catch (err) {
      console.error('Error querying the database:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

app.delete('/images/:id', authMiddleware, async (req, res) => {
    const imageId = req.params.id;
    try {
        const result = await pool.query('DELETE FROM image WHERE id = $1 RETURNING *', [imageId]);

        if (result.rows.length > 0) {
          
            res.json({ message: 'Image deleted successfully', image: result.rows[0] });
            console.log("image deleted")
        } else {
            res.status(404).json({ message: 'Image not found' });
        }
    } catch (err) {
        console.error('Error deleting the image:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/images',authMiddleware, async (req, res) => {
  const {name, prompt, negative_prompt, image_url } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'INSERT INTO images (name, prompt, negative_prompt, image_url, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, prompt, negative_prompt, image_url, userId]
    );

    const newImage = result.rows[0];
    res.status(201).json({ message: 'Image saved successfully', image: newImage });
    console.log("image saved successfully")
  } catch (err) {
    console.error('Error saving image:', err);
    res.status(500).json({ error: 'Server error'});
  }
});

app.get('/saved-images', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query('SELECT * FROM image WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error querying the database:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
      [email, hashedPassword]
    );

    const newUser = result.rows[0];
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err) {
    console.error('Error creating user:', err);
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
      expiresIn: '1h',
    });

    res.json({ token });
  } catch (err) {
    console.error('Error querying the database:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// app.get('/create-users-table', async (req, res) => {
//   const createUsersTableQuery = `
//     CREATE TABLE IF NOT EXISTS users (
//       id SERIAL PRIMARY KEY,
//       email VARCHAR(255) UNIQUE NOT NULL,
//       password VARCHAR(255) NOT NULL
//     );
//   `;

//   try {
//     await pool.query(createUsersTableQuery);
//     res.status(200).json({ message: 'Users table created successfully' });
//   } catch (err) {
//     console.error('Error creating users table:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

app.get('/create-images-table', async (req, res) => {
  const createImagesTableQuery = `
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      negative_prompt TEXT NOT NULL,
      date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      image_url VARCHAR(255) NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  try {
    await pool.query(createImagesTableQuery);
    res.status(200).json({ message: 'Images table created successfully' });
  } catch (err) {
    console.error('Error creating images table:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });