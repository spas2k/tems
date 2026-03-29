exports.up = function(knex) {
  // Table already created in core_schema migration with the correct schema.
  // This migration is kept as a no-op for migration history consistency.
  return Promise.resolve();
};
exports.down = function(knex) { return Promise.resolve(); };
