const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv').config()
const cors = require('cors');

const app = express();
app.use(cors());
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

app.get('/images', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM image');
      res.json(result.rows);
      console.log(result.rows)
    } catch (err) {
      console.error('Error querying the database:', err);
      res.status(500).json({ Error:"Server Error",details:err.message })
    }
  });



  app.get('/images/:id', async (req, res) => {
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

  app.delete('/images/:id', async (req, res) => {
    const imageId = req.params.id;

    try {
        const result = await pool.query('DELETE FROM image WHERE id = $1 RETURNING *', [imageId]);

        if (result.rows.length > 0) {
            res.json({ message: 'Image deleted successfully', image: result.rows[0] });
        } else {
            res.status(404).json({ message: 'Image not found' });
        }
    } catch (err) {
        console.error('Error deleting the image:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });