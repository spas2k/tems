exports.up = async function(knex) {
  await knex.schema.alterTable('line_items', t => {
    t.decimal('quantity', 14, 4).defaultTo(1);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('line_items', t => {
    t.dropColumn('quantity');
  });
};
