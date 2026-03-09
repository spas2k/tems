exports.up = async function (knex) {
  const now = knex.fn.now();

  // ── add contact_name to accounts ─────────────────────────
  await knex.schema.alterTable('accounts', t => {
    t.string('contact_name', 120);
  });

  // ── locations ─────────────────────────────────────────────
  await knex.schema.createTable('locations', t => {
    t.increments('locations_id').primary();
    t.string('name', 120).notNullable();
    t.string('site_code', 40);
    t.string('site_type', 60);       // Data Center, Office, Remote, Warehouse, Colocation, Other
    t.string('address', 200);
    t.string('city', 80);
    t.string('state', 40);
    t.string('zip', 20);
    t.string('country', 80).defaultTo('USA');
    t.string('contact_name', 120);
    t.string('contact_phone', 40);
    t.string('contact_email', 120);
    t.string('status', 30).notNullable().defaultTo('Active');
    t.text('notes');
    t.timestamp('created_at').notNullable().defaultTo(now);
    t.index('status', 'idx_locations_status');
  });

  // ── field_catalog ─────────────────────────────────────────
  await knex.schema.createTable('field_catalog', t => {
    t.increments('field_catalog_id').primary();
    t.string('category', 80).notNullable();   // e.g. "Circuit Type", "Bandwidth"
    t.string('label', 120).notNullable();     // display text shown in dropdowns
    t.string('value', 200).notNullable();     // stored value
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('description');
    t.timestamp('created_at').notNullable().defaultTo(now);
    t.index('category', 'idx_field_catalog_category');
  });

  // ── vendor_remit ──────────────────────────────────────────
  await knex.schema.createTable('vendor_remit', t => {
    t.increments('vendor_remit_id').primary();
    t.integer('accounts_id').unsigned()
      .references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.string('remit_name', 120).notNullable();
    t.string('remit_code', 80);
    t.string('payment_method', 60).defaultTo('ACH'); // ACH, Check, Wire, EFT
    t.string('bank_name', 120);
    t.string('routing_number', 40);
    t.string('bank_account_number', 80);
    t.string('remit_address', 200);
    t.string('remit_city', 80);
    t.string('remit_state', 40);
    t.string('remit_zip', 20);
    t.string('status', 30).notNullable().defaultTo('Active');
    t.text('notes');
    t.timestamp('created_at').notNullable().defaultTo(now);
    t.index('accounts_id', 'idx_vendor_remit_account');
  });

  // ── announcements ─────────────────────────────────────────
  await knex.schema.createTable('announcements', t => {
    t.increments('announcements_id').primary();
    t.string('title', 200).notNullable();
    t.text('message').notNullable();
    t.string('type', 30).notNullable().defaultTo('info'); // info, warning, danger, success
    t.boolean('is_active').notNullable().defaultTo(true);
    t.date('start_date');
    t.date('end_date');
    t.integer('created_by');
    t.timestamp('created_at').notNullable().defaultTo(now);
  });

  // ── spend_categories ──────────────────────────────────────
  await knex.schema.createTable('spend_categories', t => {
    t.increments('spend_categories_id').primary();
    t.string('name', 120).notNullable();
    t.string('code', 40);
    t.text('description');
    t.integer('parent_id').unsigned();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(now);
    t.index('parent_id', 'idx_spend_categories_parent');
  });

  // add self-referential FK for spend_categories after table exists
  await knex.schema.alterTable('spend_categories', t => {
    t.foreign('parent_id').references('spend_categories_id').inTable('spend_categories').onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('spend_categories', t => { t.dropForeign(['parent_id']); });
  await knex.schema.dropTableIfExists('spend_categories');
  await knex.schema.dropTableIfExists('announcements');
  await knex.schema.dropTableIfExists('vendor_remit');
  await knex.schema.dropTableIfExists('field_catalog');
  await knex.schema.dropTableIfExists('locations');
  await knex.schema.alterTable('accounts', t => { t.dropColumn('contact_name'); });
};
