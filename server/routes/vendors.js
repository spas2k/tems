const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, accountRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

router.get('/', async (req, res) => {
  try {
    const rows = await db('accounts').orderBy('name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('accounts').where('accounts_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.post('/', accountRules, validate, auditCreate('accounts', 'accounts_id'), async (req, res) => {
  try {
    const { name, account_number, vendor_type, contact_name, contact_email, contact_phone, status } = req.body;
    const id = await db.insertReturningId('accounts', {
      name, account_number, vendor_type, contact_name, contact_email, contact_phone,
      status: status || 'Active',
    });
    const row = await db('accounts').where('accounts_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.put('/:id', idParam, ...accountRules, validate, auditUpdate('accounts', 'accounts_id'), async (req, res) => {
  try {
    const { name, account_number, vendor_type, contact_name, contact_email, contact_phone, status } = req.body;
    await db('accounts').where('accounts_id', req.params.id).update({
      name, account_number, vendor_type, contact_name, contact_email, contact_phone, status,
    });
    const row = await db('accounts').where('accounts_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.get('/:id/circuits', idParam, validate, async (req, res) => {
  try {
    const rows = await db('circuits as ci')
      .leftJoin('contracts as co', 'ci.contracts_id', 'co.contracts_id')
      .select('ci.*', 'co.contract_number')
      .where('ci.accounts_id', req.params.id)
      .orderBy('ci.status')
      .orderBy('ci.location');
    res.json(rows);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.delete('/:id', idParam, validate, cascadeGuard('accounts', 'accounts_id'), auditDelete('accounts', 'accounts_id'), async (req, res) => {
  try {
    await db('accounts').where('accounts_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'vendors'); }
});

module.exports = router;
