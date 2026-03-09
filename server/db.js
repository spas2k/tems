// ============================================================
// Database Connection — Knex Query Builder
// Supports MySQL, PostgreSQL, and MSSQL via knexfile.js
// ============================================================

const knex = require('knex');
const config = require('./knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env]);

// ── Verify connection on startup ──────────────────────────
db.raw('SELECT 1')
  .then(() => {
    const client = config[env].client;
    const dbName = config[env].connection.database;
    console.log(`Database connected successfully (${client} → ${dbName})`);
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
  });

// ── Helper: insert a row and return the auto-generated PK ──
// PK convention: every table's primary key is `{table_name}_id`
// Works across MySQL (returns number), PostgreSQL & MSSQL (return object)
db.insertReturningId = async function (table, data) {
  const pkColumn = `${table}_id`;                    // e.g. accounts_id, circuits_id
  const result = await this(table).insert(data).returning(pkColumn);
  const first = result[0];
  return typeof first === 'object' ? first[pkColumn] : first;
};

module.exports = db;
