/**
 * TEMS — Initial Database Schema Migration
 *
 * Creates all 8 tables in dependency order.
 * Supports PostgreSQL through Knex's
 * database-agnostic schema builder.
 *
 * Naming conventions:
 *   PK  → {table_name}_id   (e.g. accounts_id, circuits_id)
 *   FK  → {referenced_table}_id  (e.g. accounts_id, contracts_id)
 *   Business identifier → {entity}_number (e.g. circuit_number)
 *
 * Run:  npx knex migrate:latest
 * Undo: npx knex migrate:rollback
 */

exports.up = async function (knex) {
  const currentDate = knex.fn.now();

  // ── accounts ──────────────────────────────────────────────
  await knex.schema.createTable('accounts', (t) => {
    t.increments('accounts_id').primary();
    t.string('name', 120).notNullable();
    t.string('account_number', 80);
    t.string('vendor_type', 60);
    t.string('contact_email', 120);
    t.string('contact_phone', 40);
    t.string('status', 30).notNullable().defaultTo('Active');
    t.timestamp('created_at').notNullable().defaultTo(currentDate);

    t.index('status', 'idx_accounts_status');
  });

  // ── contracts ─────────────────────────────────────────────
  await knex.schema.createTable('contracts', (t) => {
    t.increments('contracts_id').primary();
    t.integer('accounts_id').unsigned().notNullable()
      .references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.string('name', 160).notNullable();
    t.string('contract_number', 80);
    t.date('start_date');
    t.date('end_date');
    t.decimal('contracted_rate', 12, 2);
    t.string('rate_unit', 60);
    t.integer('term_months');
    t.string('status', 30).notNullable().defaultTo('Active');
    t.boolean('auto_renew').notNullable().defaultTo(false);

    t.index('accounts_id', 'idx_contracts_account');
    t.index('status', 'idx_contracts_status');
  });

  // ── orders (created before circuits — circuits FK → orders) ──
  await knex.schema.createTable('orders', (t) => {
    t.increments('orders_id').primary();
    t.integer('accounts_id').unsigned().notNullable()
      .references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.integer('contracts_id').unsigned().notNullable()
      .references('contracts_id').inTable('contracts').onDelete('RESTRICT');
    t.integer('circuits_id').unsigned().defaultTo(null);
    // circuits_id is a soft reference (no FK) — the circuit may not exist yet
    t.string('order_number', 80).notNullable();
    t.string('description', 255);
    t.decimal('contracted_rate', 12, 2);
    t.date('order_date');
    t.date('due_date');
    t.string('status', 40).notNullable().defaultTo('In Progress');
    t.text('notes');

    t.index('accounts_id', 'idx_orders_account');
    t.index('contracts_id', 'idx_orders_contract');
    t.index('status', 'idx_orders_status');
  });

  // ── circuits ──────────────────────────────────────────────
  await knex.schema.createTable('circuits', (t) => {
    t.increments('circuits_id').primary();
    t.integer('accounts_id').unsigned().notNullable()
      .references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.integer('contracts_id').unsigned().notNullable()
      .references('contracts_id').inTable('contracts').onDelete('RESTRICT');
    t.integer('orders_id').unsigned().defaultTo(null)
      .references('orders_id').inTable('orders').onDelete('SET NULL');
    t.string('circuit_number', 100).notNullable();
    t.string('type', 60);
    t.string('bandwidth', 40);
    t.string('location', 200);
    t.decimal('contracted_rate', 12, 2);
    t.string('status', 40).notNullable().defaultTo('Pending');
    t.date('install_date');
    t.date('disconnect_date');

    t.index('accounts_id', 'idx_circuits_account');
    t.index('contracts_id', 'idx_circuits_contract');
    t.index('status', 'idx_circuits_status');
  });

  // ── invoices ──────────────────────────────────────────────
  await knex.schema.createTable('invoices', (t) => {
    t.increments('invoices_id').primary();
    t.integer('accounts_id').unsigned().notNullable()
      .references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.string('invoice_number', 80).notNullable();
    t.date('invoice_date');
    t.date('due_date');
    t.date('period_start');
    t.date('period_end');
    t.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    t.string('status', 40).notNullable().defaultTo('Open');
    t.date('payment_date');

    t.index('accounts_id', 'idx_invoices_account');
    t.index('status', 'idx_invoices_status');
  });

  // ── line_items ────────────────────────────────────────────
  await knex.schema.createTable('line_items', (t) => {
    t.increments('line_items_id').primary();
    t.integer('invoices_id').unsigned().notNullable()
      .references('invoices_id').inTable('invoices').onDelete('CASCADE');
    t.integer('circuits_id').unsigned().defaultTo(null)
      .references('circuits_id').inTable('circuits').onDelete('SET NULL');
    t.string('description', 255);
    t.string('charge_type', 60);
    t.decimal('amount', 12, 2).notNullable();
    t.decimal('contracted_rate', 12, 2);
    t.decimal('variance', 12, 2);
    t.date('period_start');
    t.date('period_end');

    t.index('invoices_id', 'idx_li_invoice');
    t.index('circuits_id', 'idx_li_circuit');
  });

  // ── allocations ───────────────────────────────────────────
  await knex.schema.createTable('allocations', (t) => {
    t.increments('allocations_id').primary();
    t.integer('line_items_id').unsigned().notNullable()
      .references('line_items_id').inTable('line_items').onDelete('CASCADE');
    t.string('cost_center', 120);
    t.string('department', 120);
    t.decimal('percentage', 5, 2);
    t.decimal('allocated_amount', 12, 2);
    t.text('notes');

    t.index('line_items_id', 'idx_alloc_li');
  });

  // ── cost_savings ──────────────────────────────────────────
  await knex.schema.createTable('cost_savings', (t) => {
    t.increments('cost_savings_id').primary();
    t.integer('accounts_id').unsigned().notNullable()
      .references('accounts_id').inTable('accounts').onDelete('RESTRICT');
    t.integer('circuits_id').unsigned().defaultTo(null)
      .references('circuits_id').inTable('circuits').onDelete('SET NULL');
    t.integer('line_items_id').unsigned().defaultTo(null)
      .references('line_items_id').inTable('line_items').onDelete('SET NULL');
    t.integer('invoices_id').unsigned().defaultTo(null)
      .references('invoices_id').inTable('invoices').onDelete('SET NULL');
    t.string('category', 80);
    t.text('description');
    t.date('identified_date');
    t.string('status', 40).notNullable().defaultTo('Identified');
    t.decimal('projected_savings', 12, 2);
    t.decimal('realized_savings', 12, 2).defaultTo(0);
    t.text('notes');

    t.index('accounts_id', 'idx_cs_account');
    t.index('status', 'idx_cs_status');
  });
};

exports.down = async function (knex) {
  // Drop in reverse dependency order
  await knex.schema.dropTableIfExists('cost_savings');
  await knex.schema.dropTableIfExists('allocations');
  await knex.schema.dropTableIfExists('line_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('circuits');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('contracts');
  await knex.schema.dropTableIfExists('accounts');
};
