// ============================================================
// Knex Configuration — PostgreSQL
// ============================================================

require('dotenv').config();

module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'pg',

    connection: {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'tems',
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
    client: process.env.DB_CLIENT || 'pg',

    connection: {
      host:     process.env.DB_HOST,
      port:     parseInt(process.env.DB_PORT) || 5432,
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
