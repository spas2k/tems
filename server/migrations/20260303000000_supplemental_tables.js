/**
 * TEMS — Supplemental Tables Migration
 *
 * Adds the contact_name column to accounts and creates all tables that
 * were not included in the initial migrations:
 *
 *   accounts        — adds contact_name column
 *   locations       — physical site directory
 *   field_catalog   — configurable dropdown / field value catalog
 *   vendor_remit    — vendor payment / remittance addresses
 *   spend_categories — hierarchical cost category tree
 *   announcements   — system-wide banner announcements
 *   notes           — inline notes threaded to any entity
 *   user_favorites  — per-user saved filter bookmarks
 *
 * All createTable calls are guarded with hasTable so this migration is
 * safe to run against a database that already has some of these tables
 * (e.g. created by the old runtime ensureTable() pattern).
 *
 * Run:  npx knex migrate:latest
 * Undo: npx knex migrate:rollback
 */

exports.up = async function (knex) {
  const now = knex.fn.now();

  // ── accounts: add contact_name ───────────────────────────
  if (!(await knex.schema.hasColumn('accounts', 'contact_name'))) {
    await knex.schema.alterTable('accounts', t => {
      t.string('contact_name', 120).nullable();
    });
  }

  // ── locations ────────────────────────────────────────────
  if (!(await knex.schema.hasTable('locations'))) {
    await knex.schema.createTable('locations', t => {
      t.increments('locations_id').primary();
      t.string('name', 120).notNullable();
      t.string('site_code', 40).nullable();
      t.string('site_type', 60).nullable();    // Data Center, Office, Remote, etc.
      t.text('address').nullable();
      t.string('city', 80).nullable();
      t.string('state', 40).nullable();
      t.string('zip', 20).nullable();
      t.string('country', 60).notNullable().defaultTo('USA');
      t.string('contact_name', 120).nullable();
      t.string('contact_phone', 40).nullable();
      t.string('contact_email', 120).nullable();
      t.string('status', 30).notNullable().defaultTo('Active');
      t.text('notes').nullable();
      t.timestamp('created_at').notNullable().defaultTo(now);

      t.index('status', 'idx_locations_status');
      t.index('site_type', 'idx_locations_type');
    });
  }

  // ── field_catalog ─────────────────────────────────────────
  if (!(await knex.schema.hasTable('field_catalog'))) {
    await knex.schema.createTable('field_catalog', t => {
      t.increments('field_catalog_id').primary();
      t.string('category', 80).notNullable();   // e.g. circuit_type, vendor_type, bandwidth
      t.string('label', 120).notNullable();      // human-readable label shown in dropdowns
      t.string('value', 200).notNullable();      // stored value
      t.text('description').nullable();
      t.integer('sort_order').notNullable().defaultTo(0);
      t.boolean('is_active').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(now);

      t.index('category', 'idx_fc_category');
      t.index('is_active', 'idx_fc_active');
    });
  }

  // ── vendor_remit ──────────────────────────────────────────
  if (!(await knex.schema.hasTable('vendor_remit'))) {
    await knex.schema.createTable('vendor_remit', t => {
      t.increments('vendor_remit_id').primary();
      t.integer('accounts_id').unsigned().nullable()
        .references('accounts_id').inTable('accounts').onDelete('SET NULL');
      t.string('remit_name', 120).notNullable();
      t.string('remit_code', 80).nullable();
      t.string('payment_method', 30).notNullable().defaultTo('ACH'); // ACH, Check, Wire, EFT, Credit Card
      t.string('bank_name', 120).nullable();
      // NOTE: routing_number and bank_account_number are intentionally stored
      //       as strings here for operational use. Ensure DB-level encryption
      //       (TDE) or column-level encryption is enabled in production.
      t.string('routing_number', 20).nullable();
      t.string('bank_account_number', 60).nullable();
      t.string('remit_address', 255).nullable();
      t.string('remit_city', 80).nullable();
      t.string('remit_state', 40).nullable();
      t.string('remit_zip', 20).nullable();
      t.string('status', 30).notNullable().defaultTo('Active');
      t.text('notes').nullable();
      t.timestamp('created_at').notNullable().defaultTo(now);

      t.index('accounts_id', 'idx_vr_account');
      t.index('status', 'idx_vr_status');
    });
  }

  // ── spend_categories ──────────────────────────────────────
  if (!(await knex.schema.hasTable('spend_categories'))) {
    await knex.schema.createTable('spend_categories', t => {
      t.increments('spend_categories_id').primary();
      t.string('name', 120).notNullable();
      t.string('code', 40).nullable();
      t.text('description').nullable();
      // Self-referencing FK for sub-categories; no FK constraint to avoid circular issues
      t.integer('parent_id').unsigned().nullable();
      t.boolean('is_active').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(now);

      t.index('parent_id', 'idx_sc_parent');
      t.index('is_active', 'idx_sc_active');
    });
  }

  // ── announcements ─────────────────────────────────────────
  if (!(await knex.schema.hasTable('announcements'))) {
    await knex.schema.createTable('announcements', t => {
      t.increments('announcements_id').primary();
      t.string('title', 200).notNullable();
      t.text('message').notNullable();
      t.string('type', 30).notNullable().defaultTo('info'); // info, warning, danger, success
      t.boolean('is_active').notNullable().defaultTo(true);
      t.date('start_date').nullable();
      t.date('end_date').nullable();
      t.integer('created_by').unsigned().nullable()
        .references('users_id').inTable('users').onDelete('SET NULL');
      t.timestamp('created_at').notNullable().defaultTo(now);

      t.index('is_active', 'idx_ann_active');
    });
  }

  // ── notes ─────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('notes'))) {
    await knex.schema.createTable('notes', t => {
      t.increments('notes_id').primary();
      t.string('entity_type', 50).notNullable();  // account, contract, circuit, order, invoice, dispute
      t.integer('entity_id').unsigned().notNullable();
      t.text('content').notNullable();
      t.string('author', 150).notNullable().defaultTo('System');
      t.string('note_type', 50).notNullable().defaultTo('note'); // note, status_change, system
      t.timestamp('created_at').notNullable().defaultTo(now);

      t.index(['entity_type', 'entity_id'], 'idx_notes_entity');
    });
  }

  // ── user_favorites ────────────────────────────────────────
  if (!(await knex.schema.hasTable('user_favorites'))) {
    await knex.schema.createTable('user_favorites', t => {
      t.increments('user_favorites_id').primary();
      t.integer('users_id').unsigned().notNullable()
        .references('users_id').inTable('users').onDelete('CASCADE');
      t.string('name', 120).notNullable();
      t.string('path', 255).notNullable();
      t.json('filters').nullable();
      t.string('filter_summary', 500).nullable();
      t.string('icon', 60).nullable();
      t.timestamp('created_at').notNullable().defaultTo(now);

      t.index('users_id', 'idx_uf_user');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_favorites');
  await knex.schema.dropTableIfExists('notes');
  await knex.schema.dropTableIfExists('announcements');
  await knex.schema.dropTableIfExists('spend_categories');
  await knex.schema.dropTableIfExists('vendor_remit');
  await knex.schema.dropTableIfExists('field_catalog');
  await knex.schema.dropTableIfExists('locations');

  if (await knex.schema.hasColumn('accounts', 'contact_name')) {
    await knex.schema.alterTable('accounts', t => {
      t.dropColumn('contact_name');
    });
  }
};
