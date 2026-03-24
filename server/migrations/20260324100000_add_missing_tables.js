exports.up = function(knex) {
  return knex.schema
    .createTable('notifications', table => {
      table.increments('notifications_id').primary();
      table.integer('users_id').unsigned().notNullable().references('users_id').inTable('users').onDelete('CASCADE');
      table.string('type').defaultTo('info');
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.string('entity_type');
      table.integer('entity_id');
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('notes', table => {
      table.increments('notes_id').primary();
      table.string('entity_type').notNullable();
      table.integer('entity_id').notNullable();
      table.text('content').notNullable();
      table.string('author').defaultTo('System');
      table.string('note_type').defaultTo('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('saved_reports', table => {
      table.increments('saved_reports_id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.jsonb('config').notNullable();
      table.integer('created_by').unsigned().references('users_id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('saved_reports')
    .dropTableIfExists('notes')
    .dropTableIfExists('notifications');
};
