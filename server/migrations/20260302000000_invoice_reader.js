/**
 * TEMS — Invoice Reader Migration
 *
 * Creates tables for the dynamic invoice reader feature:
 *   - invoice_reader_templates  — stores parsing configurations per vendor/format
 *   - invoice_reader_uploads    — tracks upload history and processing status
 */

exports.up = async function (knex) {
  const currentDate = knex.fn.now();

  // ── invoice_reader_templates ────────────────────────────────
  await knex.schema.createTable('invoice_reader_templates', (t) => {
    t.increments('invoice_reader_templates_id').primary();
    t.integer('accounts_id').unsigned().defaultTo(null)
      .references('accounts_id').inTable('accounts').onDelete('SET NULL');
    t.string('name', 160).notNullable();
    t.string('format_type', 20).notNullable(); // 'EDI', 'Excel', 'PDF'
    t.text('config').notNullable(); // JSON blob with column mappings & parser config
    t.string('status', 30).notNullable().defaultTo('Active');
    t.timestamp('created_at').notNullable().defaultTo(currentDate);
    t.date('updated_at').defaultTo(null);

    t.index('accounts_id', 'idx_irt_account');
    t.index('format_type', 'idx_irt_format');
    t.index('status', 'idx_irt_status');
  });

  // ── invoice_reader_uploads ─────────────────────────────────
  await knex.schema.createTable('invoice_reader_uploads', (t) => {
    t.increments('invoice_reader_uploads_id').primary();
    t.integer('invoice_reader_templates_id').unsigned().defaultTo(null)
      .references('invoice_reader_templates_id').inTable('invoice_reader_templates').onDelete('SET NULL');
    t.integer('accounts_id').unsigned().defaultTo(null)
      .references('accounts_id').inTable('accounts').onDelete('SET NULL');
    t.string('file_name', 255).notNullable();
    t.string('format_type', 20).notNullable();
    t.string('status', 30).notNullable().defaultTo('Pending'); // Pending, Processing, Completed, Failed
    t.integer('total_rows').defaultTo(0);
    t.integer('inserted_invoices').defaultTo(0);
    t.integer('inserted_line_items').defaultTo(0);
    t.integer('error_count').defaultTo(0);
    t.text('errors').defaultTo(null); // JSON array of error messages
    t.timestamp('created_at').notNullable().defaultTo(currentDate);
    t.timestamp('completed_at').defaultTo(null);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('invoice_reader_uploads');
  await knex.schema.dropTableIfExists('invoice_reader_templates');
};
