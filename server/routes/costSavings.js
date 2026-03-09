const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, costSavingsRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// Reusable base query for cost savings with joined context
function baseQuery() {
  return db('cost_savings as cs')
    .leftJoin('accounts as a', 'cs.accounts_id', 'a.accounts_id')
    .leftJoin('circuits as ci', 'cs.circuits_id', 'ci.circuits_id')
    .select('cs.*', 'a.name as account_name', 'ci.circuit_number as circuit_identifier');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('cs.accounts_id', req.query.accounts_id);
    if (req.query.status)      query = query.where('cs.status', req.query.status);
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
    const { accounts_id, circuits_id, line_items_id, invoices_id, category, description, identified_date, status, projected_savings, realized_savings, notes } = req.body;
    const id = await db.insertReturningId('cost_savings', {
      accounts_id, circuits_id: circuits_id || null,
      line_items_id: line_items_id || null, invoices_id: invoices_id || null,
      category, description, identified_date,
      status: status || 'Identified',
      projected_savings, realized_savings: realized_savings || 0,
      notes: notes || '',
    });
    const row = await baseQuery().where('cs.cost_savings_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'costSavings'); }
});

router.put('/:id', idParam, ...costSavingsRules, validate, auditUpdate('cost_savings', 'cost_savings_id'), async (req, res) => {
  try {
    const { accounts_id, circuits_id, line_items_id, invoices_id, category, description, identified_date, status, projected_savings, realized_savings, notes } = req.body;
    await db('cost_savings').where('cost_savings_id', req.params.id).update({
      accounts_id, circuits_id: circuits_id || null,
      line_items_id: line_items_id || null, invoices_id: invoices_id || null,
      category, description, identified_date, status,
      projected_savings, realized_savings: realized_savings || 0,
      notes: notes || '',
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
