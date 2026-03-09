exports.up = async function (knex) {
  // ── disputes table ──
  await knex.schema.createTable('disputes', (t) => {
    t.increments('disputes_id').primary();
    t.integer('line_items_id').unsigned().references('line_items_id').inTable('line_items').onDelete('SET NULL');
    t.integer('invoices_id').unsigned().notNullable().references('invoices_id').inTable('invoices').onDelete('CASCADE');
    t.integer('accounts_id').unsigned().notNullable().references('accounts_id').inTable('accounts').onDelete('CASCADE');
    t.string('dispute_type', 50).notNullable().defaultTo('Overcharge');
    t.decimal('amount', 12, 2).notNullable().defaultTo(0);
    t.string('status', 30).notNullable().defaultTo('Open');
    t.date('filed_date').notNullable();
    t.date('resolved_date').nullable();
    t.text('resolution_notes').nullable();
    t.decimal('credit_amount', 12, 2).nullable();
    t.string('reference_number', 100).nullable();
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('disputes');
};
