/**
 * @file disputes.js — Disputes API Routes — /api/disputes
 * CRUD for billing disputes (overcharges, duplicates, wrong rates, etc.).
 * Disputes link to invoices, vendors, and optionally line items.
 *
 * @module routes/disputes
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, disputeRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

function baseQuery() {
  return db('disputes as d')
    .leftJoin('invoices as i', 'd.invoices_id', 'i.invoices_id')
    .leftJoin('vendors as v', 'd.vendors_id', 'v.vendors_id')
    .select('d.*', 'i.invoice_number', 'v.name as vendor_name');
}

/**
 * GET /
 * List all disputes with vendor and invoice joins, ordered by filed_date desc.
 * @returns Array of dispute objects with vendor_name, invoice_number
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.vendors_id) query = query.where('d.vendors_id', req.query.vendors_id);
    if (req.query.invoices_id) query = query.where('d.invoices_id', req.query.invoices_id);
    if (req.query.status) query = query.where('d.status', req.query.status);
    const limit = Math.min(parseInt(req.query.limit) || 10000, 10000);
    const rows = await query.orderBy('d.filed_date', 'desc').limit(limit);
    res.json(rows);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/**
 * GET /:id
 * Get a single dispute by ID with joins.
 * @returns Dispute object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('d.disputes_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/**
 * POST /
 * Create a new dispute.
 * @auth Requires role: Admin, Manager
 * @body line_items_id, invoices_id, vendors_id, dispute_type, amount, status, filed_date, resolved_date, resolution_notes, credit_amount, reference_number
 * @returns 201 with created dispute
 */
router.post('/', requireRole('Admin', 'Manager'), disputeRules, validate, auditCreate('disputes', 'disputes_id'), async (req, res) => {
  try {
    const { line_items_id, invoices_id, vendors_id, dispute_type, amount, status, filed_date, resolved_date, resolution_notes, credit_amount, reference_number, notes } = req.body;
    const id = await db.insertReturningId('disputes', {
      line_items_id: line_items_id || null, invoices_id, vendors_id,
      dispute_type: dispute_type || 'Overcharge',
      amount, status: status || 'Open', filed_date,
      resolved_date: resolved_date || null,
      resolution_notes, credit_amount: credit_amount || null,
      reference_number, notes
    });
    const row = await baseQuery().where('d.disputes_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/**
 * PUT /:id
 * Update an existing dispute.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated dispute object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...disputeRules, validate, auditUpdate('disputes', 'disputes_id'), async (req, res) => {
  try {
    const { line_items_id, invoices_id, vendors_id, dispute_type, amount, status, filed_date, resolved_date, resolution_notes, credit_amount, reference_number, notes } = req.body;
    await db('disputes').where('disputes_id', req.params.id).update({
      line_items_id: line_items_id || null, invoices_id, vendors_id,
      dispute_type, amount, status, filed_date,
      resolved_date: resolved_date || null,
      resolution_notes, credit_amount: credit_amount || null,
      reference_number, notes
    });
    const row = await baseQuery().where('d.disputes_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/**
 * DELETE /:id
 * Delete a dispute.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('disputes', 'disputes_id'), auditDelete('disputes', 'disputes_id'), async (req, res) => {
  try {
    await db('disputes').where('disputes_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'disputes'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple disputes.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('disputes', 'disputes_id', {
  allowed: ['vendors_id', 'invoices_id', 'type', 'disputed_amount', 'status', 'filed_date', 'resolved_date', 'resolution', 'credit_amount', 'description'],
}));

module.exports = router;
