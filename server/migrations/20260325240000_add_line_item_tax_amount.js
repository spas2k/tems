exports.up = async function(knex) {
  await knex.schema.alterTable('line_items', t => {
    t.decimal('tax_amount', 14, 2);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('line_items', t => {
    t.dropColumn('tax_amount');
  });
};
