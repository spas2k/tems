const fs = require('fs');

const reqCostSavings = `const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, costSavingsRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

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

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.vendors_id) query = query.where('cs.vendors_id', req.query.vendors_id);
    if (req.query.status) query = query.where('cs.status', req.query.status);
    const rows = await query.orderBy('cs.identified_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'costSavings'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('cs.cost_savings_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'costSavings'); }
});

router.post('/', costSavingsRules, validate, auditCreate('cost_savings', 'cost_savings_id'), async (req, res) => {
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

router.put('/:id', idParam, ...costSavingsRules, validate, auditUpdate('cost_savings', 'cost_savings_id'), async (req, res) => {
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

router.delete('/:id', idParam, validate, cascadeGuard('cost_savings', 'cost_savings_id'), auditDelete('cost_savings', 'cost_savings_id'), async (req, res) => {
  try {
    await db('cost_savings').where('cost_savings_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'costSavings'); }
});

module.exports = router;
`

const reqDisputes = `const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, disputeRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

function baseQuery() {
  return db('disputes as d')
    .leftJoin('invoices as i', 'd.invoices_id', 'i.invoices_id')
    .leftJoin('vendors as v', 'd.vendors_id', 'v.vendors_id')
    .select('d.*', 'i.invoice_number', 'v.name as vendor_name');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.vendors_id) query = query.where('d.vendors_id', req.query.vendors_id);
    if (req.query.invoices_id) query = query.where('d.invoices_id', req.query.invoices_id);
    if (req.query.status) query = query.where('d.status', req.query.status);
    const rows = await query.orderBy('d.filed_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'disputes'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('d.disputes_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'disputes'); }
});

router.post('/', disputeRules, validate, auditCreate('disputes', 'disputes_id'), async (req, res) => {
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

router.put('/:id', idParam, ...disputeRules, validate, auditUpdate('disputes', 'disputes_id'), async (req, res) => {
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

router.delete('/:id', idParam, validate, cascadeGuard('disputes', 'disputes_id'), auditDelete('disputes', 'disputes_id'), async (req, res) => {
  try {
    await db('disputes').where('disputes_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'disputes'); }
});

module.exports = router;
`

fs.writeFileSync('server/routes/costSavings.js', reqCostSavings);
fs.writeFileSync('server/routes/disputes.js', reqDisputes);
