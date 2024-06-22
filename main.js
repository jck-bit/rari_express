const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv').config()
const cors = require('cors');

const app = express();
app.use(cors());
const port = 3000;

const pool = new Pool({
    user: process.env.user,
    host: process.env.host,
    database: process.env.database,
    password: process.env.password,
    port: 5432,
    ssl: {
      rejectUnauthorized: false, // for self-signed certificates
    },
})

app.get('/images', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM image');
      res.json(result);
      console.log(result)
    } catch (err) {
      console.error('Error querying the database:', err);
      res.status(500).send('Server error');
    }
  });

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });