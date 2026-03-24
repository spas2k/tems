const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, contractRateRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// Reusable base query with USOC code + contract info
function baseQuery() {
  return db('contract_rates as cr')
    .leftJoin('contracts as c', 'cr.contracts_id', 'c.contracts_id')
    .leftJoin('usoc_codes as u', 'cr.usoc_codes_id', 'u.usoc_codes_id')
    .leftJoin('vendors as a', 'c.vendors_id', 'a.vendors_id')
    .select(
      'cr.*',
      'c.contract_number', 'c.name as contract_name',
      'u.usoc_code', 'u.description as usoc_description', 'u.category as usoc_category',
      'a.name as account_name'
    );
}

// GET all contract rates (optional filter: ?contracts_id=&usoc_codes_id=)
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.contracts_id) query = query.where('cr.contracts_id', req.query.contracts_id);
    if (req.query.usoc_codes_id) query = query.where('cr.usoc_codes_id', req.query.usoc_codes_id);
    const rows = await query.orderBy('cr.effective_date');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// GET single contract rate
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('cr.contract_rates_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// POST create contract rate
router.post('/', contractRateRules, validate, auditCreate('contract_rates', 'contract_rates_id'), async (req, res) => {
  try {
    const { contracts_id, usoc_codes_id, mrc, nrc, effective_date, expiration_date, notes } = req.body;
    const id = await db.insertReturningId('contract_rates', {
      contracts_id, usoc_codes_id,
      mrc: mrc || 0, nrc: nrc || 0,
      effective_date, expiration_date, notes,
    });
    const row = await baseQuery().where('cr.contract_rates_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// PUT update contract rate
router.put('/:id', idParam, ...contractRateRules, validate, auditUpdate('contract_rates', 'contract_rates_id'), async (req, res) => {
  try {
    const { contracts_id, usoc_codes_id, mrc, nrc, effective_date, expiration_date, notes } = req.body;
    await db('contract_rates').where('contract_rates_id', req.params.id).update({
      contracts_id, usoc_codes_id,
      mrc, nrc, effective_date, expiration_date, notes,
    });
    const row = await baseQuery().where('cr.contract_rates_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// DELETE contract rate
router.delete('/:id', idParam, validate, cascadeGuard('contract_rates', 'contract_rates_id'), auditDelete('contract_rates', 'contract_rates_id'), async (req, res) => {
  try {
    await db('contract_rates').where('contract_rates_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'contractRates'); }
});

module.exports = router;
