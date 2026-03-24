const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

const remitRules = [
  body('remit_name').trim().notEmpty().withMessage('Remit Name is required').isLength({ max: 120 }),
  body('vendors_id').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }),
  body('remit_code').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 80 }),
  body('payment_method').optional({ values: 'falsy' }).isIn(['ACH', 'Check', 'Wire', 'EFT', 'Credit Card']),
  body('status').optional().isIn(['Active', 'Inactive']),
];

router.get('/', async (req, res) => {
  try {
    let query = db('vendor_remit as vr')
      .leftJoin('vendors as a', 'vr.vendors_id', 'a.vendors_id')
      .select('vr.*', 'a.name as vendor_name')
      .orderBy('vr.remit_name');
    if (req.query.vendors_id) query = query.where('vr.vendors_id', req.query.vendors_id);
    const rows = await query;
    res.json(rows);
  } catch (err) { safeError(res, err, 'vendor_remit'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('vendor_remit as vr')
      .leftJoin('vendors as a', 'vr.vendors_id', 'a.vendors_id')
      .select('vr.*', 'a.name as vendor_name')
      .where('vr.vendor_remit_id', req.params.id)
      .first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'vendor_remit'); }
});

router.post('/', remitRules, validate, auditCreate('vendor_remit', 'vendor_remit_id'), async (req, res) => {
  try {
    const { vendors_id, remit_name, remit_code, payment_method, bank_name,
            routing_number, bank_vendor_number, remit_address, remit_city,
            remit_state, remit_zip, status, notes } = req.body;
    const id = await db.insertReturningId('vendor_remit', {
      vendors_id: vendors_id || null, remit_name, remit_code,
      payment_method: payment_method || 'ACH', bank_name, routing_number,
      bank_vendor_number, remit_address, remit_city, remit_state, remit_zip,
      status: status || 'Active', notes,
    });
    const row = await db('vendor_remit as vr')
      .leftJoin('vendors as a', 'vr.vendors_id', 'a.vendors_id')
      .select('vr.*', 'a.name as vendor_name')
      .where('vr.vendor_remit_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'vendor_remit'); }
});

router.put('/:id', idParam, remitRules, validate, auditUpdate('vendor_remit', 'vendor_remit_id'), async (req, res) => {
  try {
    const { vendors_id, remit_name, remit_code, payment_method, bank_name,
            routing_number, bank_vendor_number, remit_address, remit_city,
            remit_state, remit_zip, status, notes } = req.body;
    await db('vendor_remit').where('vendor_remit_id', req.params.id).update({
      vendors_id: vendors_id || null, remit_name, remit_code, payment_method, bank_name,
      routing_number, bank_vendor_number, remit_address, remit_city,
      remit_state, remit_zip, status, notes,
    });
    const row = await db('vendor_remit as vr')
      .leftJoin('vendors as a', 'vr.vendors_id', 'a.vendors_id')
      .select('vr.*', 'a.name as vendor_name')
      .where('vr.vendor_remit_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'vendor_remit'); }
});

router.delete('/:id', idParam, validate, auditDelete('vendor_remit', 'vendor_remit_id'), async (req, res) => {
  try {
    await db('vendor_remit').where('vendor_remit_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'vendor_remit'); }
});

module.exports = router;
