const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, contractRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// Reusable base query for contracts with account name
function baseQuery() {
  return db('contracts as c')
    .leftJoin('accounts as a', 'c.accounts_id', 'a.accounts_id')
    .select('c.*', 'a.name as account_name');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('c.accounts_id', req.query.accounts_id);
    const rows = await query.orderBy('c.name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('c.contracts_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.post('/', contractRules, validate, auditCreate('contracts', 'contracts_id'), async (req, res) => {
  try {
    const { accounts_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, minimum_spend, etf_amount, commitment_type, status, auto_renew } = req.body;
    const id = await db.insertReturningId('contracts', {
      accounts_id, name, contract_number, start_date, end_date,
      contracted_rate, rate_unit, term_months,
      minimum_spend: minimum_spend || null,
      etf_amount: etf_amount || null,
      commitment_type: commitment_type || null,
      status: status || 'Active',
      auto_renew: auto_renew ? 1 : 0,
    });
    const row = await baseQuery().where('c.contracts_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.put('/:id', idParam, ...contractRules, validate, auditUpdate('contracts', 'contracts_id'), async (req, res) => {
  try {
    const { accounts_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, minimum_spend, etf_amount, commitment_type, status, auto_renew } = req.body;
    await db('contracts').where('contracts_id', req.params.id).update({
      accounts_id, name, contract_number, start_date, end_date,
      contracted_rate, rate_unit, term_months,
      minimum_spend: minimum_spend || null,
      etf_amount: etf_amount || null,
      commitment_type: commitment_type || null,
      status,
      auto_renew: auto_renew ? 1 : 0,
    });
    const row = await baseQuery().where('c.contracts_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.get('/:id/inventory', idParam, validate, async (req, res) => {
  try {
    const rows = await db('inventory as ci')
      .leftJoin('accounts as a', 'ci.accounts_id', 'a.accounts_id')
      .select('ci.*', 'a.name as account_name')
      .where('ci.contracts_id', req.params.id)
      .orderBy('ci.status')
      .orderBy('ci.location');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.get('/:id/orders', idParam, validate, async (req, res) => {
  try {
    const rows = await db('orders as o')
      .leftJoin('accounts as a', 'o.accounts_id', 'a.accounts_id')
      .select('o.*', 'a.name as account_name')
      .where('o.contracts_id', req.params.id)
      .orderBy('o.order_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.delete('/:id', idParam, validate, cascadeGuard('contracts', 'contracts_id'), auditDelete('contracts', 'contracts_id'), async (req, res) => {
  try {
    await db('contracts').where('contracts_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'contracts'); }
});

module.exports = router;
