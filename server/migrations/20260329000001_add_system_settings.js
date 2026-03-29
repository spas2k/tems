/**
 * Create system_settings table for app-wide configuration (e.g. default dashboard layout).
 * Key-value store with JSONB values.
 */
exports.up = function (knex) {
  return knex.schema.createTable('system_settings', (table) => {
    table.string('key', 120).primary();
    table.jsonb('value').notNullable().defaultTo('{}');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('system_settings');
};
