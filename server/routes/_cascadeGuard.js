// ============================================================
// Delete cascade protection — checks for dependent child records
// before allowing a DELETE, returning 409 Conflict if any exist.
// ============================================================
const db = require('../db');

// Dependency map: { parentTable: [{ table, fk, label }] }
const DEPS = {
  accounts: [
    { table: 'contracts',    fk: 'accounts_id',  label: 'contracts' },
    { table: 'circuits',     fk: 'accounts_id',  label: 'circuits' },
    { table: 'orders',       fk: 'accounts_id',  label: 'orders' },
    { table: 'invoices',     fk: 'accounts_id',  label: 'invoices' },
    { table: 'cost_savings', fk: 'accounts_id',  label: 'cost savings' },
    { table: 'disputes',     fk: 'accounts_id',  label: 'disputes' },
  ],
  contracts: [
    { table: 'circuits',       fk: 'contracts_id', label: 'circuits' },
    { table: 'orders',         fk: 'contracts_id', label: 'orders' },
    { table: 'contract_rates', fk: 'contracts_id', label: 'contract rates' },
  ],
  circuits: [
    { table: 'line_items',   fk: 'circuits_id',  label: 'line items' },
    { table: 'cost_savings', fk: 'circuits_id',  label: 'cost savings' },
  ],
  orders: [
    { table: 'circuits', fk: 'orders_id', label: 'circuits' },
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
 * Returns an express middleware that checks for child records before DELETE.
 * @param {string} parentTable – e.g. 'accounts'
 * @param {string} pkColumn    – e.g. 'accounts_id'
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
