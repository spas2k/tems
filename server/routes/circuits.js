const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, circuitRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// Reusable base query for circuits with joined names
function baseQuery() {
  return db('circuits as ci')
    .leftJoin('accounts as a', 'ci.accounts_id', 'a.accounts_id')
    .leftJoin('contracts as co', 'ci.contracts_id', 'co.contracts_id')
    .leftJoin('orders as o', 'ci.orders_id', 'o.orders_id')
    .select('ci.*', 'a.name as account_name', 'co.contract_number', 'o.order_number');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('ci.accounts_id', req.query.accounts_id);
    if (req.query.status)      query = query.where('ci.status', req.query.status);
    const rows = await query.orderBy('ci.location');
    res.json(rows);
  } catch (err) { safeError(res, err, 'circuits'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('ci.cir_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'circuits'); }
});

router.post('/', circuitRules, validate, auditCreate('circuits', 'cir_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, orders_id, circuit_id, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    const id = await db.insertReturningId('circuits', {
      accounts_id,
      contracts_id: contracts_id || null,
      orders_id:    orders_id    || null,
      circuit_id,
      type:            type            || null,
      bandwidth:       bandwidth       || null,
      location:        location        || null,
      contracted_rate: contracted_rate !== '' && contracted_rate != null ? contracted_rate : null,
      status:          status          || 'Pending',
      install_date:    install_date    || null,
      disconnect_date: disconnect_date || null,
    });
    const row = await baseQuery().where('ci.cir_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'circuits'); }
});

router.put('/:id', idParam, ...circuitRules, validate, auditUpdate('circuits', 'cir_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, orders_id, circuit_id, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    await db('circuits').where('cir_id', req.params.id).update({
      accounts_id,
      contracts_id:    contracts_id    || null,
      orders_id:       orders_id       || null,
      circuit_id,
      type:            type            || null,
      bandwidth:       bandwidth       || null,
      location:        location        || null,
      contracted_rate: contracted_rate !== '' && contracted_rate != null ? contracted_rate : null,
      status,
      install_date:    install_date    || null,
      disconnect_date: disconnect_date || null,
    });
    const row = await baseQuery().where('ci.cir_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'circuits'); }
});

router.get('/:id/invoices', idParam, validate, async (req, res) => {
  try {
    const rows = await db('invoices as i')
      .join('line_items as li', 'li.invoices_id', 'i.invoices_id')
      .join('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .select(
        'i.invoices_id', 'i.accounts_id', 'i.invoice_number', 'i.invoice_date',
        'i.due_date', 'i.period_start', 'i.period_end', 'i.total_amount',
        'i.status', 'i.payment_date', 'a.name as account_name',
      )
      .count('li.line_items_id as line_item_count')
      .sum('li.amount as circuit_total')
      .where('li.cir_id', req.params.id)
      .groupBy(
        'i.invoices_id', 'i.accounts_id', 'i.invoice_number', 'i.invoice_date',
        'i.due_date', 'i.period_start', 'i.period_end', 'i.total_amount',
        'i.status', 'i.payment_date', 'a.name',
      )
      .orderBy('i.invoice_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'circuits'); }
});

router.delete('/:id', idParam, validate, cascadeGuard('circuits', 'cir_id'), auditDelete('circuits', 'cir_id'), async (req, res) => {
  try {
    await db('circuits').where('cir_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'circuits'); }
});

module.exports = router;
