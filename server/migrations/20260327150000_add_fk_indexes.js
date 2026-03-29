/**
 * Add indexes on critical foreign key columns to prevent full table scans
 * on JOIN and WHERE queries. Only primary keys and unique columns had
 * implicit indexes before this migration.
 */
exports.up = async function (knex) {
  // ── Accounts ──
  await knex.schema.alterTable('accounts', t => {
    t.index('vendors_id', 'idx_accounts_vendors_id');
  });

  // ── Contracts ──
  await knex.schema.alterTable('contracts', t => {
    t.index('vendors_id', 'idx_contracts_vendors_id');
  });

  // ── Inventory ──
  await knex.schema.alterTable('inventory', t => {
    t.index('accounts_id', 'idx_inventory_accounts_id');
    t.index('contracts_id', 'idx_inventory_contracts_id');
    t.index('orders_id', 'idx_inventory_orders_id');
  });

  // ── Orders ──
  await knex.schema.alterTable('orders', t => {
    t.index('vendors_id', 'idx_orders_vendors_id');
    t.index('contracts_id', 'idx_orders_contracts_id');
  });

  // ── Invoices ──
  await knex.schema.alterTable('invoices', t => {
    t.index('accounts_id', 'idx_invoices_accounts_id');
    t.index('invoice_number', 'idx_invoices_invoice_number');
  });

  // ── Line Items ──
  await knex.schema.alterTable('line_items', t => {
    t.index('invoices_id', 'idx_line_items_invoices_id');
    t.index('inventory_id', 'idx_line_items_inventory_id');
    t.index('usoc_codes_id', 'idx_line_items_usoc_codes_id');
  });

  // ── Disputes ──
  await knex.schema.alterTable('disputes', t => {
    t.index('vendors_id', 'idx_disputes_vendors_id');
    t.index('invoices_id', 'idx_disputes_invoices_id');
  });

  // ── Allocations ──
  await knex.schema.alterTable('allocations', t => {
    t.index('line_items_id', 'idx_allocations_line_items_id');
  });

  // ── Cost Savings ──
  await knex.schema.alterTable('cost_savings', t => {
    t.index('vendors_id', 'idx_cost_savings_vendors_id');
  });

  // ── Vendor Remit ──
  await knex.schema.alterTable('vendor_remit', t => {
    t.index('vendors_id', 'idx_vendor_remit_vendors_id');
  });

  // ── Contract Rates ──
  await knex.schema.alterTable('contract_rates', t => {
    t.index('contracts_id', 'idx_contract_rates_contracts_id');
  });

  // ── Tickets ──
  await knex.schema.alterTable('tickets', t => {
    t.index('assigned_users_id', 'idx_tickets_assigned_users_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('accounts', t => { t.dropIndex(null, 'idx_accounts_vendors_id'); });
  await knex.schema.alterTable('contracts', t => { t.dropIndex(null, 'idx_contracts_vendors_id'); });
  await knex.schema.alterTable('inventory', t => {
    t.dropIndex(null, 'idx_inventory_accounts_id');
    t.dropIndex(null, 'idx_inventory_contracts_id');
    t.dropIndex(null, 'idx_inventory_orders_id');
  });
  await knex.schema.alterTable('orders', t => {
    t.dropIndex(null, 'idx_orders_vendors_id');
    t.dropIndex(null, 'idx_orders_contracts_id');
  });
  await knex.schema.alterTable('invoices', t => {
    t.dropIndex(null, 'idx_invoices_accounts_id');
    t.dropIndex(null, 'idx_invoices_invoice_number');
  });
  await knex.schema.alterTable('line_items', t => {
    t.dropIndex(null, 'idx_line_items_invoices_id');
    t.dropIndex(null, 'idx_line_items_inventory_id');
    t.dropIndex(null, 'idx_line_items_usoc_codes_id');
  });
  await knex.schema.alterTable('disputes', t => {
    t.dropIndex(null, 'idx_disputes_vendors_id');
    t.dropIndex(null, 'idx_disputes_invoices_id');
  });
  await knex.schema.alterTable('allocations', t => { t.dropIndex(null, 'idx_allocations_line_items_id'); });
  await knex.schema.alterTable('cost_savings', t => { t.dropIndex(null, 'idx_cost_savings_vendors_id'); });
  await knex.schema.alterTable('vendor_remit', t => { t.dropIndex(null, 'idx_vendor_remit_vendors_id'); });
  await knex.schema.alterTable('contract_rates', t => { t.dropIndex(null, 'idx_contract_rates_contracts_id'); });
  await knex.schema.alterTable('tickets', t => { t.dropIndex(null, 'idx_tickets_assigned_users_id'); });
};
