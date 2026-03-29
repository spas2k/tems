/**
 * @file Migration to add invoice approval levels and approver assignments.
 *
 * Creates:
 * - approval_levels: defines 3 tiers with dollar thresholds
 * - invoice_approvers: maps each user to primary + alternate approvers per level
 */
exports.up = async function (knex) {
  // Approval level thresholds
  await knex.schema.createTable('approval_levels', t => {
    t.increments('approval_levels_id').primary();
    t.integer('level').unsigned().notNullable().unique();
    t.string('name').notNullable();
    t.decimal('min_amount', 14, 2).notNullable().defaultTo(0);
    t.decimal('max_amount', 14, 2);
    t.timestamps(true, true);
  });

  // Seed the 3 default levels
  await knex('approval_levels').insert([
    { level: 1, name: 'Level 1 – Standard',  min_amount: 0,        max_amount: 5000 },
    { level: 2, name: 'Level 2 – Manager',   min_amount: 5000.01,  max_amount: 25000 },
    { level: 3, name: 'Level 3 – Executive',  min_amount: 25000.01, max_amount: null },
  ]);

  // Approver assignments per user per level
  await knex.schema.createTable('invoice_approvers', t => {
    t.increments('invoice_approvers_id').primary();
    t.integer('users_id').unsigned().notNullable()
      .references('users_id').inTable('users').onDelete('CASCADE');
    t.integer('level').unsigned().notNullable();
    t.integer('primary_approver_id').unsigned()
      .references('users_id').inTable('users').onDelete('SET NULL');
    t.integer('alternate_approver_id').unsigned()
      .references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.unique(['users_id', 'level']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('invoice_approvers');
  await knex.schema.dropTableIfExists('approval_levels');
};
