exports.up = async function (knex) {
  const now = knex.fn.now();

  await knex.schema.createTable('saved_reports', (t) => {
    t.increments('saved_reports_id').primary();
    t.string('name', 200).notNullable();
    t.text('description').nullable();
    t.jsonb('config').notNullable();        // full report config JSON
    t.integer('created_by').unsigned()
      .references('users_id').inTable('users').onDelete('SET NULL').nullable();
    t.timestamp('created_at').notNullable().defaultTo(now);
    t.timestamp('updated_at').notNullable().defaultTo(now);

    t.index('created_by', 'idx_saved_reports_user');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('saved_reports');
};
