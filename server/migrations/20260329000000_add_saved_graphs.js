/**
 * @file Add saved_graphs table — separate graph configs from saved_reports.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('saved_graphs', table => {
    table.increments('saved_graphs_id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('config').notNullable();
    table.integer('created_by').unsigned().references('users_id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('saved_graphs');
};
