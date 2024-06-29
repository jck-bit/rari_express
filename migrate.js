const { Pool } = require('pg');
const dotenv = require('dotenv').config();

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

const createTableSavedImages = `
  CREATE TABLE IF NOT EXISTS user_saved_images (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  image_id INTEGER REFERENCES image(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, image_id)
);
`;

async function runMigration() {
  try {
    await pool.query(createTableSavedImages);
    console.log('Migration ran successfully');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
