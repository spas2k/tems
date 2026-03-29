exports.up = async function(knex) {
  await knex.schema.alterTable('currencies', t => {
    t.decimal('exchange_rate', 14, 6).defaultTo(1.000000).after('symbol');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('currencies', t => {
    t.dropColumn('exchange_rate');
  });
};
