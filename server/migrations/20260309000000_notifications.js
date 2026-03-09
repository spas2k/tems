// Migration: User-targeted notifications table
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('notifications');
  if (!exists) {
    await knex.schema.createTable('notifications', t => {
      t.increments('notifications_id').primary();
      t.integer('users_id').unsigned().notNullable()
        .references('users_id').inTable('users').onDelete('CASCADE');
      t.string('type', 50).notNullable().defaultTo('info'); // info | warning | danger
      t.string('title', 200).notNullable();
      t.text('message').notNullable();
      t.string('entity_type', 50).nullable(); // 'invoice' | 'order' | 'ticket' etc.
      t.integer('entity_id').unsigned().nullable();
      t.boolean('is_read').notNullable().defaultTo(false);
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      t.index(['users_id', 'is_read'], 'idx_notifications_user_read');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('notifications');
};
