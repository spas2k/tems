// invoices.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, invoiceRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// Reusable base query for invoices with account name and assigned user
function baseQuery() {
  return db('invoices as i')
    .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
    .leftJoin('users as u', 'i.assigned_users_id', 'u.users_id')
    .select('i.*', 'a.name as account_name', 'u.display_name as assigned_user_name');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('i.accounts_id', req.query.accounts_id);
    if (req.query.status)      query = query.where('i.status', req.query.status);
    const rows = await query.orderBy('i.invoice_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'invoices'); }
});

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

router.post('/', invoiceRules, validate, auditCreate('invoices', 'invoices_id'), async (req, res) => {
  try {
    const { accounts_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date, assigned_users_id } = req.body;
    const id = await db.insertReturningId('invoices', {
      accounts_id, invoice_number, invoice_date, due_date,
      period_start, period_end, total_amount,
      status: status || 'Open',
      payment_date: payment_date || null,
      assigned_users_id: assigned_users_id || null,
    });
    const row = await baseQuery().where('i.invoices_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'invoices'); }
});

router.put('/:id', idParam, ...invoiceRules, validate, auditUpdate('invoices', 'invoices_id'), async (req, res) => {
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

    // Insert notification for newly assigned user (not when unassigning)
    if (assigneeChanged && newAssignee) {
      const invoiceLabel = invoice_number || `#${req.params.id}`;
      await db.insertReturningId('notifications', {
        users_id:    newAssignee,
        type:        'info',
        title:       'Invoice Assigned',
        message:     `Invoice ${invoiceLabel} has been assigned to you.`,
        entity_type: 'invoice',
        entity_id:   Number(req.params.id),
      });
    }

    const row = await baseQuery().where('i.invoices_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'invoices'); }
});

router.delete('/:id', idParam, validate, cascadeGuard('invoices', 'invoices_id'), auditDelete('invoices', 'invoices_id'), async (req, res) => {
  try {
    await db('invoices').where('invoices_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'invoices'); }
});

module.exports = router;
