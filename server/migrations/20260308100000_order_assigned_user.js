// ============================================================
// Migration: Add assigned_users_id to orders
// ============================================================

exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn('orders', 'assigned_users_id');
  if (!hasCol) {
    await knex.schema.alterTable('orders', (t) => {
      t.integer('assigned_users_id').unsigned().nullable().defaultTo(null)
        .references('users_id').inTable('users').onDelete('SET NULL');
    });
  }
};

exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn('orders', 'assigned_users_id');
  if (hasCol) {
    await knex.schema.alterTable('orders', (t) => {
      t.dropColumn('assigned_users_id');
    });
  }
};
