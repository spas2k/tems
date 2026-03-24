const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, inventoryItemRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// Reusable base query for inventory with joined names
function baseQuery() {
  return db('inventory as i')
    .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
    .leftJoin('contracts as co', 'i.contracts_id', 'co.contracts_id')
    .leftJoin('orders as o', 'i.orders_id', 'o.orders_id')
    .select('i.*', 'a.name as account_name', 'co.contract_number', 'o.order_number');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('i.accounts_id', req.query.accounts_id);
    if (req.query.status)      query = query.where('i.status', req.query.status);
    const rows = await query.orderBy('i.inventory_number');
    res.json(rows);
  } catch (err) { safeError(res, err, 'inventory'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('i.inventory_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'inventory'); }
});

router.post('/', inventoryItemRules, validate, auditCreate('inventory', 'inventory_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, orders_id, inventory_number, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    const id = await db.insertReturningId('inventory', {
      accounts_id,
      contracts_id,
      orders_id:    orders_id    || null,
      inventory_number,
      type:            type            || null,
      bandwidth:       bandwidth       || null,
      location:        location        || null,
      contracted_rate: contracted_rate !== '' && contracted_rate != null ? contracted_rate : null,
      status:          status          || 'Pending',
      install_date:    install_date    || null,
      disconnect_date: disconnect_date || null,
    });
    const row = await baseQuery().where('i.inventory_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'inventory'); }
});

router.put('/:id', idParam, ...inventoryItemRules, validate, auditUpdate('inventory', 'inventory_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, orders_id, inventory_number, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    await db('inventory').where('inventory_id', req.params.id).update({
      accounts_id,
      contracts_id,
      orders_id:       orders_id       || null,
      inventory_number,
      type:            type            || null,
      bandwidth:       bandwidth       || null,
      location:        location        || null,
      contracted_rate: contracted_rate !== '' && contracted_rate != null ? contracted_rate : null,
      status,
      install_date:    install_date    || null,
      disconnect_date: disconnect_date || null,
    });
    const row = await baseQuery().where('i.inventory_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'inventory'); }
});

router.get('/:id/invoices', idParam, validate, async (req, res) => {
  try {
    const rows = await db('invoices as inv')
      .join('line_items as li', 'li.invoices_id', 'inv.invoices_id')
      .join('accounts as a', 'inv.accounts_id', 'a.accounts_id')
      .select(
        'inv.invoices_id', 'inv.accounts_id', 'inv.invoice_number', 'inv.invoice_date',
        'inv.due_date', 'inv.period_start', 'inv.period_end', 'inv.total_amount',
        'inv.status', 'inv.payment_date', 'a.name as account_name',
      )
      .count('li.line_items_id as line_item_count')
      .sum('li.amount as inventoryItem_total')
      .where('li.inventory_id', req.params.id)
      .groupBy(
        'inv.invoices_id', 'inv.accounts_id', 'inv.invoice_number', 'inv.invoice_date',
        'inv.due_date', 'inv.period_start', 'inv.period_end', 'inv.total_amount',
        'inv.status', 'inv.payment_date', 'a.name'
      )
      .orderBy('inv.invoice_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'inventory'); }
});

router.delete('/:id', idParam, validate, cascadeGuard('inventory', 'inventory_id'), auditDelete('inventory', 'inventory_id'), async (req, res) => {
  try {
    await db('inventory').where('inventory_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'inventory'); }
});

module.exports = router;
