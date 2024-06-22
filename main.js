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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });