// ============================================================
// Migration: User Favorites
// Stores per-user saved table views (path + filters)
// ============================================================

exports.up = async function (knex) {
  await knex.schema.createTable('user_favorites', t => {
    t.increments('user_favorites_id').primary();
    t.integer('users_id').unsigned().notNullable()
      .references('users_id').inTable('users').onDelete('CASCADE');
    t.string('name', 120).notNullable();
    t.string('path', 255).notNullable();
    t.json('filters').nullable();          // {op,value} filter map
    t.string('filter_summary', 500).nullable();
    t.string('icon', 60).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('users_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_favorites');
};
