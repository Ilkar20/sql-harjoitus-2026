const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'laskutusjarjestelma',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  port: Number(process.env.DB_PORT) || 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
