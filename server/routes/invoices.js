/**
 * @file invoices.js — Invoices API Routes — /api/invoices
 * CRUD for telecom invoices.
 * Invoices link to accounts and contain line items for billing details.
 *
 * @module routes/invoices
 */
// invoices.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, invoiceRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');
const { notify } = require('../services/notifications');

// Reusable base query for invoices with account name and assigned user
function baseQuery() {
  return db('invoices as i')
    .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
    .leftJoin('users as u', 'i.assigned_users_id', 'u.users_id')
    .select('i.*', 'a.name as account_name', 'u.display_name as assigned_user_name');
}

/**
 * GET /
 * List all invoices with account, vendor, and assigned user joins.
 * @returns Array of invoice objects with joined names
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('i.accounts_id', req.query.accounts_id);
    if (req.query.vendors_id)  query = query.where('a.vendors_id', req.query.vendors_id);
    if (req.query.status)      query = query.where('i.status', req.query.status);
    const limit = Math.min(parseInt(req.query.limit) || 10000, 10000);
    const rows = await query.orderBy('i.invoice_date', 'desc').limit(limit);
    res.json(rows);
  } catch (err) { safeError(res, err, 'invoices'); }
});

/**
 * GET /:id
 * Get a single invoice by ID with account and vendor joins.
 * @returns Invoice object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const invoice = await baseQuery().where('i.invoices_id', req.params.id).first();
    if (!invoice) return res.status(404).json({ error: 'Not found' });

    const lineItems = await db('line_items as li')
      .leftJoin('inventory as inv', 'li.inventory_id', 'inv.inventory_id')
      .select('li.*', 'inv.inventory_number as inventory_identifier')
      .where('li.invoices_id', req.params.id);

    res.json({ ...invoice, line_items: lineItems });
  } catch (err) { safeError(res, err, 'invoices'); }
});

/**
 * POST /
 * Create a new invoice.
 * @auth Requires role: Admin, Manager
 * @body accounts_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, assigned_users_id
 * @returns 201 with created invoice
 */
router.post('/', requireRole('Admin', 'Manager'), invoiceRules, validate, auditCreate('invoices', 'invoices_id'), async (req, res) => {
  try {
    const { accounts_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date, assigned_users_id } = req.body;
    const id = await db.insertReturningId('invoices', {
      accounts_id, invoice_number, invoice_date, due_date,
      period_start, period_end, total_amount,
      status: status || 'Open',
      payment_date: payment_date || null,
      assigned_users_id: assigned_users_id || null,
    });

    // Notify assignee if set at creation time
    if (assigned_users_id) {
      const invoiceLabel = invoice_number || `#${id}`;
      await notify({
        users_id:    Number(assigned_users_id),
        type:        'info',
        title:       'Invoice Assigned to You',
        message:     `Invoice ${invoiceLabel} has been assigned to you.`,
        entity_type: 'invoice',
        entity_id:   id,
        category:    'invoice_assigned',
      });
    }

    const row = await baseQuery().where('i.invoices_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'invoices'); }
});

/**
 * PUT /:id
 * Update an existing invoice. Sends notification if assigned_users_id changes.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields + billing_account
 * @returns Updated invoice object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...invoiceRules, validate, auditUpdate('invoices', 'invoices_id'), async (req, res) => {
  try {
    const { accounts_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date, assigned_users_id } = req.body;

    // Detect assignee change to send a notification
    const prev = await db('invoices').where('invoices_id', req.params.id).first();
    const newAssignee = assigned_users_id ? Number(assigned_users_id) : null;
    const assigneeChanged = prev && prev.assigned_users_id !== newAssignee;

    await db('invoices').where('invoices_id', req.params.id).update({
      accounts_id, invoice_number, invoice_date, due_date,
      period_start, period_end, total_amount, status,
      payment_date: payment_date || null,
      assigned_users_id: assigned_users_id || null,
    });

    // Notify newly assigned user (not when unassigning)
    if (assigneeChanged && newAssignee) {
      const invoiceLabel = invoice_number || `#${req.params.id}`;
      await notify({
        users_id:    newAssignee,
        type:        'info',
        title:       'Invoice Assigned to You',
        message:     `Invoice ${invoiceLabel} has been assigned to you.`,
        entity_type: 'invoice',
        entity_id:   Number(req.params.id),
        category:    'invoice_assigned',
      });
    }

    const row = await baseQuery().where('i.invoices_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'invoices'); }
});

/**
 * DELETE /:id
 * Delete an invoice. Blocked by cascadeGuard if line items or disputes exist.
 * @auth Requires role: Admin
 * @returns { success: true } or 409
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('invoices', 'invoices_id'), auditDelete('invoices', 'invoices_id'), async (req, res) => {
  try {
    await db('invoices').where('invoices_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'invoices'); }
});

// ── POST /:id/recalculate ───────────────────────────────
/**
 * POST /:id/recalculate
 * Sum all line-item amounts and update the invoice total_amount.
 * @auth Requires role: Admin, Manager
 * @returns { total_amount, line_item_count } with the updated invoice
 */
router.post('/:id/recalculate', requireRole('Admin', 'Manager'), idParam, validate, async (req, res) => {
  try {
    const invoice = await db('invoices').where('invoices_id', req.params.id).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const result = await db('line_items')
      .where('invoices_id', req.params.id)
      .sum('amount as total')
      .count('* as count')
      .first();

    const total = Number(result.total) || 0;
    const count = Number(result.count) || 0;

    await db('invoices').where('invoices_id', req.params.id).update({ total_amount: total });

    const row = await baseQuery().where('i.invoices_id', req.params.id).first();
    res.json({ ...row, line_item_count: count });
  } catch (err) { safeError(res, err, 'invoices'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple invoices.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('invoices', 'invoices_id', {
  allowed: ['accounts_id', 'invoice_number', 'invoice_date', 'due_date', 'period_start', 'period_end', 'total_amount', 'status', 'payment_date', 'assigned_users_id'],
}));

module.exports = router;
