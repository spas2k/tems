/**
 * @file db.js — Knex database connection and helper utilities.
 *
 * Initializes a Knex instance for the current NODE_ENV ('development' | 'production'),
 * verifies connectivity on startup, and adds the `insertReturningId` helper.
 *
 * @module db
 * @requires knex
 * @requires ./knexfile — Per-environment Knex configuration (client, connection, pool)
 */

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

/**
 * Insert a row and return the auto-generated primary key value.
 *
 * Convention: every table's PK is `{table_name}_id` (e.g. `accounts_id`).
 * Exceptions are listed in PK_OVERRIDES (e.g. `circuits` → `cir_id`).
 *
 * @async
 * @param {string} table — Target table name (e.g. 'accounts', 'invoices')
 * @param {object} data  — Column→value map to insert
 * @returns {number} The numeric value of the new row's primary key
 *
 * @example
 *   const id = await db.insertReturningId('accounts', { name: 'Acme', account_number: 'A001' });
 *   // id → 42
 */
const PK_OVERRIDES = { circuits: 'cir_id', form_instructions: 'id' };
db.insertReturningId = async function (table, data) {
  const pkColumn = PK_OVERRIDES[table] || `${table}_id`; // e.g. accounts_id, cir_id
  const result = await this(table).insert(data).returning(pkColumn);
  const first = result[0];
  return typeof first === 'object' ? first[pkColumn] : first;
};

module.exports = db;
