/**
 * Allocation rules: define cost-center splits per account.
 * Each rule row = one cost-center slice in the split for that account.
 * All percentages for a given account should sum to 100.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('allocation_rules', t => {
    t.increments('allocation_rules_id');
    t.integer('accounts_id').unsigned().notNullable()
      .references('accounts_id').inTable('accounts').onDelete('CASCADE');
    t.integer('bank_cost_centers_id').unsigned().notNullable()
      .references('bank_cost_centers_id').inTable('bank_cost_centers').onDelete('CASCADE');
    t.decimal('percentage', 5, 2).notNullable().defaultTo(0);
    t.string('department');
    t.text('notes');
    t.timestamps(true, true);

    t.unique(['accounts_id', 'bank_cost_centers_id']);
    t.index('accounts_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('allocation_rules');
};
