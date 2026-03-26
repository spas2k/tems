exports.up = async function(knex) {
  await knex.schema.alterTable('line_items', t => {
    t.dropColumn('billing_account');
  });
  await knex.schema.alterTable('invoices', t => {
    t.string('billing_account');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('invoices', t => {
    t.dropColumn('billing_account');
  });
  await knex.schema.alterTable('line_items', t => {
    t.string('billing_account');
  });
};
