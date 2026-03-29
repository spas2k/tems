const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

const currencyRules = [
  body('currency_code').trim().notEmpty().withMessage('Currency code is required').isLength({ max: 3 }),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('symbol').trim().notEmpty().withMessage('Symbol is required').isLength({ max: 10 }),
  body('exchange_rate').optional({ nullable: true }).isFloat({ min: 0 }),
  body('status').optional().isIn(['Active', 'Inactive']),
];

router.get('/', async (req, res) => {
  try {
    const rows = await db('currencies').orderBy('currency_code');
    res.json(rows);
  } catch (err) { safeError(res, err, 'currencies'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('currencies').where('currencies_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'currencies'); }
});

router.post('/', requireRole('Admin', 'Manager'), currencyRules, validate, auditCreate('currencies', 'currencies_id'), async (req, res) => {
  try {
    const { currency_code, name, symbol, exchange_rate, status } = req.body;
    const id = await db.insertReturningId('currencies', {
      currency_code, name, symbol, exchange_rate: exchange_rate ?? 1, status: status || 'Active',
    });
    const row = await db('currencies').where('currencies_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'currencies'); }
});

router.put('/:id', requireRole('Admin', 'Manager'), idParam, currencyRules, validate, auditUpdate('currencies', 'currencies_id'), async (req, res) => {
  try {
    const { currency_code, name, symbol, exchange_rate, status } = req.body;
    await db('currencies').where('currencies_id', req.params.id).update({
      currency_code, name, symbol, exchange_rate, status,
    });
    const row = await db('currencies').where('currencies_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'currencies'); }
});

router.delete('/:id', requireRole('Admin'), idParam, validate, auditDelete('currencies', 'currencies_id'), async (req, res) => {
  try {
    await db('currencies').where('currencies_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'currencies'); }
});

router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('currencies', 'currencies_id', {
  allowed: ['currency_code', 'name', 'symbol', 'exchange_rate', 'status'],
}));

module.exports = router;
