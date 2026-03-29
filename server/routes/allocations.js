/**
 * @file allocations.js — Allocations API Routes — /api/allocations
 * CRUD for cost allocations (splitting line item charges across cost centers/departments).
 *
 * @module routes/allocations
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, allocationRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

// Reusable base query for allocations with joined context
function baseQuery() {
  return db('allocations as al')
    .leftJoin('line_items as li', 'al.line_items_id', 'li.line_items_id')
    .leftJoin('invoices as i', 'li.invoices_id', 'i.invoices_id')
    .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
    .select(
      'al.*',
      'li.description as line_item_description',
      'li.amount as line_item_amount',
      'i.invoices_id as invoice_id',
      'i.invoice_number',
      'a.name as account_name',
    );
}

/**
 * GET /
 * List all allocations with optional ?line_items_id filter. Joins line item data.
 * @returns Array of allocation objects
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.line_items_id) query = query.where('al.line_items_id', req.query.line_items_id);
    if (req.query.invoices_id)   query = query.where('li.invoices_id', req.query.invoices_id);
    const rows = await query;
    res.json(rows);
  } catch (err) { safeError(res, err, 'allocations'); }
});

/**
 * GET /:id
 * Get a single allocation by ID.
 * @returns Allocation object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('al.allocations_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'allocations'); }
});

/**
 * POST /
 * Create a new cost allocation.
 * @auth Requires role: Admin, Manager
 * @body line_items_id, cost_center, department, percentage, allocated_amount, notes
 * @returns 201 with created allocation
 */
router.post('/', requireRole('Admin', 'Manager'), allocationRules, validate, auditCreate('allocations', 'allocations_id'), async (req, res) => {
  try {
    const { line_items_id, cost_center, department, percentage, allocated_amount, notes } = req.body;
    const id = await db.insertReturningId('allocations', {
      line_items_id, cost_center, department, percentage,
      allocated_amount, notes: notes || '',
    });
    const row = await baseQuery().where('al.allocations_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'allocations'); }
});

/**
 * PUT /:id
 * Update an existing allocation.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated allocation object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...allocationRules, validate, auditUpdate('allocations', 'allocations_id'), async (req, res) => {
  try {
    const { line_items_id, cost_center, department, percentage, allocated_amount, notes } = req.body;
    await db('allocations').where('allocations_id', req.params.id).update({
      line_items_id, cost_center, department, percentage,
      allocated_amount, notes: notes || '',
    });
    const row = await baseQuery().where('al.allocations_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'allocations'); }
});

/**
 * DELETE /:id
 * Delete an allocation.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('allocations', 'allocations_id'), auditDelete('allocations', 'allocations_id'), async (req, res) => {
  try {
    await db('allocations').where('allocations_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'allocations'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple allocations.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('allocations', 'allocations_id', {
  allowed: ['invoices_id', 'cost_center', 'department', 'percentage', 'amount', 'gl_code'],
}));

module.exports = router;
