// Migration: invoice_reader_profiles + invoice_reader_exceptions
exports.up = async function (knex) {
  // Reader profiles — auto-match rules, defaults, error-handling config per vendor/format
  await knex.schema.createTable('invoice_reader_profiles', t => {
    t.increments('invoice_reader_profiles_id').primary();
    t.string('name', 120).notNullable();
    t.integer('vendors_id').unsigned().references('vendors_id').inTable('vendors').onDelete('SET NULL');
    t.string('format_type', 20).notNullable(); // EDI, Excel, CSV, PDF
    t.integer('invoice_reader_templates_id').unsigned()
      .references('invoice_reader_templates_id').inTable('invoice_reader_templates').onDelete('SET NULL');
    t.jsonb('match_rules').notNullable().defaultTo('{}');
    t.jsonb('defaults').notNullable().defaultTo('{}');
    t.jsonb('error_handling').notNullable().defaultTo('{}');
    t.string('status', 20).notNullable().defaultTo('Active');
    t.timestamps(true, true);
  });

  // Reader exceptions — structured issues requiring human resolution
  await knex.schema.createTable('invoice_reader_exceptions', t => {
    t.increments('invoice_reader_exceptions_id').primary();
    t.integer('invoice_reader_uploads_id').unsigned()
      .references('invoice_reader_uploads_id').inTable('invoice_reader_uploads').onDelete('CASCADE');
    t.integer('invoice_reader_profiles_id').unsigned()
      .references('invoice_reader_profiles_id').inTable('invoice_reader_profiles').onDelete('SET NULL');
    t.string('type', 40).notNullable(); // no_template_match, no_account, no_vendor, parse_error, unknown_format
    t.string('severity', 20).notNullable().defaultTo('blocking'); // blocking, warning
    t.jsonb('context').notNullable().defaultTo('{}');
    t.jsonb('resolution');
    t.string('status', 20).notNullable().defaultTo('open'); // open, resolved, ignored
    t.integer('resolved_by').unsigned().references('users_id').inTable('users').onDelete('SET NULL');
    t.timestamp('resolved_at');
    t.timestamps(true, true);
  });

  // Add profile_id to uploads table for tracking which profile was used
  await knex.schema.alterTable('invoice_reader_uploads', t => {
    t.integer('invoice_reader_profiles_id').unsigned()
      .references('invoice_reader_profiles_id').inTable('invoice_reader_profiles').onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('invoice_reader_uploads', t => {
    t.dropColumn('invoice_reader_profiles_id');
  });
  await knex.schema.dropTableIfExists('invoice_reader_exceptions');
  await knex.schema.dropTableIfExists('invoice_reader_profiles');
};
