// ============================================================
// Knex Configuration
// Supports MySQL (current), PostgreSQL, and MSSQL
//
// To switch databases:
//   1. Change "client" to 'pg' or 'mssql'
//   2. Install the driver: npm install pg  OR  npm install tedious
//   3. Update .env credentials for the new database
//   4. Run migrations: npx knex migrate:latest
//   5. Run seeds:      npx knex seed:run
// ============================================================

require('dotenv').config();

module.exports = {
  development: {
    // ── Change this value to switch databases ──────────────
    //   'mysql2'  → MySQL      (npm install mysql2)
    //   'pg'      → PostgreSQL (npm install pg)
    //   'mssql'   → SQL Server (npm install tedious)
    client: process.env.DB_CLIENT || 'mysql2',

    connection: {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'doctore',
    },

    pool: {
      min: 2,
      max: 10,
    },

    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },

    seeds: {
      directory: './seeds',
    },
  },

  production: {
    client: process.env.DB_CLIENT || 'mysql2',

    connection: {
      host:     process.env.DB_HOST,
      port:     parseInt(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },

    pool: {
      min: 2,
      max: 20,
    },

    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },

    seeds: {
      directory: './seeds',
    },
  },
};
