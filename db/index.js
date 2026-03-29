const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'laskutusjarjestelma',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
