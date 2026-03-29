/**
 * @file costSavings.js — Cost Savings API Routes — /api/cost-savings
 * CRUD for telecom cost savings opportunities and realizations.
 * Tracks identified/implemented/rejected savings by vendor, inventory, and invoice.
 *
 * @module routes/costSavings
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, costSavingsRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

function baseQuery() {
  return db('cost_savings as cs')
    .leftJoin('vendors as v', 'cs.vendors_id', 'v.vendors_id')
    .leftJoin('inventory as inv', 'cs.inventory_id', 'inv.inventory_id')
    .leftJoin('invoices as i', 'cs.invoices_id', 'i.invoices_id')
    .select(
      'cs.*',
      'v.name as vendor_name',
      'inv.inventory_number', 'inv.location as inventory_location',
      'i.invoice_number'
    );
}

/**
 * GET /
 * List all cost savings with vendor join, ordered by identified_date desc.
 * @returns Array of cost savings objects with vendor_name
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.vendors_id) query = query.where('cs.vendors_id', req.query.vendors_id);
    if (req.query.status) query = query.where('cs.status', req.query.status);
    const rows = await query.orderBy('cs.identified_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'costSavings'); }
});

/**
 * GET /:id
 * Get a single cost savings record by ID with vendor join.
 * @returns Cost savings object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('cs.cost_savings_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'costSavings'); }
});

/**
 * POST /
 * Create a new cost savings record.
 * @auth Requires role: Admin, Manager
 * @body vendors_id, inventory_id, line_items_id, invoices_id, category, description, identified_date, status, projected_savings, realized_savings
 * @returns 201 with created record
 */
router.post('/', requireRole('Admin', 'Manager'), costSavingsRules, validate, auditCreate('cost_savings', 'cost_savings_id'), async (req, res) => {
  try {
    const { vendors_id, inventory_id, line_items_id, invoices_id, category, description, identified_date, status, projected_savings, realized_savings, notes } = req.body;
    const id = await db.insertReturningId('cost_savings', {
      vendors_id, inventory_id: inventory_id || null,
      line_items_id: line_items_id || null, invoices_id: invoices_id || null,
      category, description, identified_date,
      status: status || 'Identified',
      projected_savings: projected_savings || null,
      realized_savings: realized_savings || null,
      notes
    });
    const row = await baseQuery().where('cs.cost_savings_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'costSavings'); }
});

/**
 * PUT /:id
 * Update an existing cost savings record.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated record
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...costSavingsRules, validate, auditUpdate('cost_savings', 'cost_savings_id'), async (req, res) => {
  try {
    const { vendors_id, inventory_id, line_items_id, invoices_id, category, description, identified_date, status, projected_savings, realized_savings, notes } = req.body;
    await db('cost_savings').where('cost_savings_id', req.params.id).update({
      vendors_id, inventory_id: inventory_id || null,
      line_items_id: line_items_id || null, invoices_id: invoices_id || null,
      category, description, identified_date, status,
      projected_savings: projected_savings || null,
      realized_savings: realized_savings || null,
      notes
    });
    const row = await baseQuery().where('cs.cost_savings_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'costSavings'); }
});

/**
 * DELETE /:id
 * Delete a cost savings record.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('cost_savings', 'cost_savings_id'), auditDelete('cost_savings', 'cost_savings_id'), async (req, res) => {
  try {
    await db('cost_savings').where('cost_savings_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'costSavings'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple cost savings records.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('cost_savings', 'cost_savings_id', {
  allowed: ['vendors_id', 'inventory_id', 'type', 'description', 'projected_savings', 'realized_savings', 'status'],
}));

module.exports = router;
