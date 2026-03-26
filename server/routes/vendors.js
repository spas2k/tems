const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, vendorRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

router.get('/', async (req, res) => {
  try {
    const rows = await db('vendors').orderBy('name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('vendors').where('vendors_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.post('/', requireRole('Admin', 'Manager'), vendorRules, validate, auditCreate('vendors', 'vendors_id'), async (req, res) => {
  try {
    const { name, vendor_number, vendor_type, contact_name, contact_email, contact_phone, status } = req.body;
    const id = await db.insertReturningId('vendors', {
      name, vendor_number, vendor_type, contact_name, contact_email, contact_phone,
      status: status || 'Active',
    });
    const row = await db('vendors').where('vendors_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...vendorRules, validate, auditUpdate('vendors', 'vendors_id'), async (req, res) => {
  try {
    const { name, vendor_number, vendor_type, contact_name, contact_email, contact_phone, status } = req.body;
    await db('vendors').where('vendors_id', req.params.id).update({
      name, vendor_number, vendor_type, contact_name, contact_email, contact_phone, status,
    });
    const row = await db('vendors').where('vendors_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.get('/:id/inventory', idParam, validate, async (req, res) => {
  try {
    const rows = await db('inventory as ci')
      .leftJoin('contracts as co', 'ci.contracts_id', 'co.contracts_id')
      .leftJoin('accounts as a', 'ci.accounts_id', 'a.accounts_id')
      .select('ci.*', 'co.contract_number')
      .where('a.vendors_id', req.params.id)
      .orderBy('ci.status')
      .orderBy('ci.location');
    res.json(rows);
  } catch (err) { safeError(res, err, 'vendors'); }
});

router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('vendors', 'vendors_id'), auditDelete('vendors', 'vendors_id'), async (req, res) => {
  try {
    await db('vendors').where('vendors_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'vendors'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('vendors', 'vendors_id'));

module.exports = router;
