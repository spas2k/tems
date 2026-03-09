const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, orderRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// Reusable base query for orders with joined names
function baseQuery() {
  return db('orders as o')
    .leftJoin('accounts as a', 'o.accounts_id', 'a.accounts_id')
    .leftJoin('contracts as co', 'o.contracts_id', 'co.contracts_id')
    .leftJoin('circuits as ci', 'o.cir_id', 'ci.cir_id')
    .leftJoin('users as u', 'o.assigned_users_id', 'u.users_id')
    .select('o.*', 'a.name as account_name', 'co.contract_number', 'ci.circuit_id as circuit_identifier', 'u.display_name as assigned_user_name');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('o.accounts_id', req.query.accounts_id);
    if (req.query.status)      query = query.where('o.status', req.query.status);
    const rows = await query.orderBy('o.order_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'orders'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('o.orders_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'orders'); }
});

router.post('/', orderRules, validate, auditCreate('orders', 'orders_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, cir_id, order_number, description, contracted_rate, order_date, due_date, status, notes, assigned_users_id } = req.body;
    const id = await db.insertReturningId('orders', {
      accounts_id, contracts_id, cir_id: cir_id || null,
      order_number, description, contracted_rate, order_date,
      due_date: due_date || null,
      status: status || 'In Progress',
      notes: notes || '',
      assigned_users_id: assigned_users_id || null,
    });
    const row = await baseQuery().where('o.orders_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'orders'); }
});

router.put('/:id', idParam, ...orderRules, validate, auditUpdate('orders', 'orders_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, cir_id, order_number, description, contracted_rate, order_date, due_date, status, notes, assigned_users_id } = req.body;
    await db('orders').where('orders_id', req.params.id).update({
      accounts_id, contracts_id, cir_id: cir_id || null,
      order_number, description, contracted_rate, order_date,
      due_date: due_date || null, status, notes: notes || '',
      assigned_users_id: assigned_users_id || null,
    });
    const row = await baseQuery().where('o.orders_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'orders'); }
});

router.get('/:id/circuits', idParam, validate, async (req, res) => {
  try {
    const rows = await db('circuits as ci')
      .leftJoin('accounts as a', 'ci.accounts_id', 'a.accounts_id')
      .leftJoin('contracts as co', 'ci.contracts_id', 'co.contracts_id')
      .select('ci.*', 'a.name as account_name', 'co.contract_number')
      .where('ci.orders_id', req.params.id)
      .orderBy('ci.install_date', 'desc')
      .orderBy('ci.circuit_id');
    res.json(rows);
  } catch (err) { safeError(res, err, 'orders'); }
});

router.delete('/:id', idParam, validate, cascadeGuard('orders', 'orders_id'), auditDelete('orders', 'orders_id'), async (req, res) => {
  try {
    await db('orders').where('orders_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'orders'); }
});

module.exports = router;
