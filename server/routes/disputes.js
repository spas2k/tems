const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, disputeRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

/* ── helpers ───────────────────────────────────────────── */
const baseQuery = () =>
  db('disputes as d')
    .leftJoin('invoices as i',   'd.invoices_id',   'i.invoices_id')
    .leftJoin('accounts as a',   'd.accounts_id',   'a.accounts_id')
    .leftJoin('line_items as li', 'd.line_items_id', 'li.line_items_id')
    .select(
      'd.*',
      'a.name as account_name',
      'i.invoice_number',
      'li.description as line_item_description',
    );

/* ── LIST ──────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery().orderBy('d.filed_date', 'desc');
    if (req.query.accounts_id) query = query.where('d.accounts_id', req.query.accounts_id);
    const rows = await query;
    res.json(rows);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/* ── GET BY ID ─────────────────────────────────────────── */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery()
      .where('d.disputes_id', req.params.id)
      .first();
    if (!row) return res.status(404).json({ error: 'Dispute not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/* ── CREATE ────────────────────────────────────────────── */
router.post('/', disputeRules, validate, auditCreate('disputes', 'disputes_id'), async (req, res) => {
  try {
    const {
      line_items_id, invoices_id, accounts_id, dispute_type,
      amount, status, filed_date, resolved_date, resolution_notes,
      credit_amount, reference_number, notes,
    } = req.body;
    const [id] = await db('disputes').insert({
      line_items_id, invoices_id, accounts_id,
      dispute_type: dispute_type || 'Overcharge',
      amount: amount || 0,
      status: status || 'Open',
      filed_date: filed_date || new Date().toISOString().slice(0, 10),
      resolved_date, resolution_notes, credit_amount, reference_number, notes,
    });
    const created = await baseQuery().where('d.disputes_id', id).first();
    res.status(201).json(created);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/* ── UPDATE ────────────────────────────────────────────── */
router.put('/:id', idParam, ...disputeRules, validate, auditUpdate('disputes', 'disputes_id'), async (req, res) => {
  try {
    const {
      line_items_id, invoices_id, accounts_id, dispute_type,
      amount, status, filed_date, resolved_date, resolution_notes,
      credit_amount, reference_number, notes,
    } = req.body;
    await db('disputes').where('disputes_id', req.params.id).update({
      line_items_id, invoices_id, accounts_id, dispute_type,
      amount, status, filed_date, resolved_date,
      resolution_notes, credit_amount, reference_number, notes,
    });
    const updated = await baseQuery().where('d.disputes_id', req.params.id).first();
    res.json(updated);
  } catch (err) { safeError(res, err, 'disputes'); }
});

/* ── DELETE ────────────────────────────────────────────── */
router.delete('/:id', idParam, validate, cascadeGuard('disputes', 'disputes_id'), auditDelete('disputes', 'disputes_id'), async (req, res) => {
  try {
    await db('disputes').where('disputes_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'disputes'); }
});

module.exports = router;
