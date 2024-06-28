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

const alterTableQuery = `
  ALTER TABLE image ADD COLUMN user_id INTEGER;
`;

async function runMigration() {
  try {
    await pool.query(alterTableQuery);
    console.log('Migration ran successfully');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
