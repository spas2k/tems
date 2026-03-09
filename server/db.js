// ============================================================
// Database Connection — Knex Query Builder (PostgreSQL)
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
// Exception: circuits table uses `cir_id` as its PK
// PostgreSQL returns an object from .returning()
const PK_OVERRIDES = { circuits: 'cir_id' };
db.insertReturningId = async function (table, data) {
  const pkColumn = PK_OVERRIDES[table] || `${table}_id`; // e.g. accounts_id, cir_id
  const result = await this(table).insert(data).returning(pkColumn);
  const first = result[0];
  return typeof first === 'object' ? first[pkColumn] : first;
};

module.exports = db;
