/**
 * @file _cascadeGuard.js — Delete cascade protection middleware.
 *
 * Before allowing a DELETE on a parent record, checks for dependent child
 * records in related tables. Returns 409 Conflict with a list of blocking
 * dependencies if any child records exist.
 *
 * Also exports the DEPS map for reuse by the admin purge endpoint.
 *
 * @module _cascadeGuard
 */
// ============================================================
// Delete cascade protection — checks for dependent child records
// before allowing a DELETE, returning 409 Conflict if any exist.
// ============================================================
const db = require('../db');

/**
 * Dependency map: defines which child tables reference each parent table.
 * Used by cascadeGuard middleware and admin purge endpoints.
 *
 * @type {Object<string, Array<{ table: string, fk: string, label: string }>>}
 *
 * @example
 *   DEPS['vendors'] → [{ table: 'accounts', fk: 'vendors_id', label: 'accounts' }, ...]
 */
// Dependency map: { parentTable: [{ table, fk, label }] }
const DEPS = {
  vendors: [
    { table: 'accounts',                fk: 'vendors_id',  label: 'accounts' },
    { table: 'contracts',               fk: 'vendors_id',  label: 'contracts' },
    { table: 'vendor_remit',            fk: 'vendors_id',  label: 'vendor remit' },
    { table: 'orders',                  fk: 'vendors_id',  label: 'orders' },
    { table: 'cost_savings',            fk: 'vendors_id',  label: 'cost savings' },
    { table: 'disputes',                fk: 'vendors_id',  label: 'disputes' },
    { table: 'invoice_reader_uploads',  fk: 'vendors_id',  label: 'reader uploads' },
    { table: 'invoice_reader_profiles', fk: 'vendors_id',  label: 'reader profiles' },
  ],
  accounts: [
    { table: 'contracts',    fk: 'accounts_id',  label: 'contracts' },
    { table: 'inventory',     fk: 'accounts_id',  label: 'inventory' },
    { table: 'orders',       fk: 'accounts_id',  label: 'orders' },
    { table: 'invoices',     fk: 'accounts_id',  label: 'invoices' },
    { table: 'cost_savings', fk: 'accounts_id',  label: 'cost savings' },
    { table: 'disputes',     fk: 'accounts_id',  label: 'disputes' },
  ],
  contracts: [
    { table: 'inventory',       fk: 'contracts_id', label: 'inventory' },
    { table: 'orders',         fk: 'contracts_id', label: 'orders' },
    { table: 'contract_rates', fk: 'contracts_id', label: 'contract rates' },
  ],
  inventory: [
    { table: 'line_items',   fk: 'inventory_id',  label: 'line items' },
    { table: 'cost_savings', fk: 'inventory_id',  label: 'cost savings' },
  ],
  orders: [
    { table: 'inventory', fk: 'orders_id', label: 'inventory' },
  ],
  invoices: [
    { table: 'line_items', fk: 'invoices_id', label: 'line items' },
    { table: 'disputes',   fk: 'invoices_id', label: 'disputes' },
  ],
  line_items: [
    { table: 'allocations',  fk: 'line_items_id', label: 'allocations' },
    { table: 'cost_savings', fk: 'line_items_id', label: 'cost savings' },
    { table: 'disputes',     fk: 'line_items_id', label: 'disputes' },
  ],
  usoc_codes: [
    { table: 'contract_rates', fk: 'usoc_codes_id', label: 'contract rates' },
    { table: 'line_items',     fk: 'usoc_codes_id', label: 'line items' },
  ],
  contract_rates: [],  // no children
  allocations: [],     // no children
  cost_savings: [],    // no children
  disputes: [],        // no children
};

/**
 * Express middleware factory: checks for dependent child records before
 * a DELETE is processed. Returns 409 Conflict with a list of blockers
 * if any child records reference the target row.
 *
 * @param {string} parentTable — Parent table name (must be a key in DEPS)
 * @param {string} pkColumn    — Primary key column of the parent table
 * @returns {Function} Express middleware (req, res, next)
 *
 * @example
 *   router.delete('/:id', cascadeGuard('accounts', 'accounts_id'), async (req, res) => { ... });
 *
 * @response 409 — {
 *   error: string,
 *   dependents: string[],
 *   message: string
 * }
 */
function cascadeGuard(parentTable, pkColumn) {
  return async (req, res, next) => {
    const id = req.params.id;
    const deps = DEPS[parentTable] || [];
    if (deps.length === 0) return next();

    try {
      const checks = await Promise.all(
        deps.map(async ({ table, fk, label }) => {
          const exists = await db.schema.hasTable(table);
          if (!exists) return null;
          const { cnt } = await db(table).where(fk, id).count('* as cnt').first();
          return Number(cnt) > 0 ? label : null;
        }),
      );

      const blockers = checks.filter(Boolean);
      if (blockers.length > 0) {
        return res.status(409).json({
          error: 'Cannot delete — dependent records exist',
          dependents: blockers,
          message: `This ${parentTable.replace(/_/g, ' ').replace(/s$/, '')} has ${blockers.join(', ')} linked to it. Remove or reassign them first.`,
        });
      }

      next();
    } catch (err) {
      console.error(`[cascadeGuard:${parentTable}]`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = cascadeGuard;
module.exports.DEPS = DEPS;
