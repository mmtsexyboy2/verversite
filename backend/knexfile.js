// backend/knexfile.js
require('dotenv').config({ path: './.env' }); // Ensure dotenv is loaded

module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: './db/migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },
  // Add production configuration if needed, similar to development
  // production: { ... }
};
