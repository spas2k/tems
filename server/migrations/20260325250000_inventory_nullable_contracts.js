/**
 * Make contracts_id nullable on inventory so EDI-imported circuits
 * don't require a contract at creation time.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('inventory', t => {
    t.integer('contracts_id').unsigned().nullable().alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('inventory', t => {
    t.integer('contracts_id').unsigned().notNullable().alter();
  });
};
