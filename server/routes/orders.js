/**
 * @file orders.js — Orders API Routes — /api/orders
 * CRUD for telecom service orders.
 * Orders track provisioning requests linked to vendors, contracts, and inventory.
 *
 * @module routes/orders
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, orderRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

// Reusable base query for orders with joined names
function baseQuery() {
  return db('orders as o')
    .leftJoin('vendors as v', 'o.vendors_id', 'v.vendors_id')
    .leftJoin('contracts as co', 'o.contracts_id', 'co.contracts_id')
    .leftJoin('inventory as i', 'o.inventory_id', 'i.inventory_id')
    .leftJoin('users as u', 'o.assigned_users_id', 'u.users_id')
    .select('o.*', 'v.name as vendor_name', 'co.contract_number', 'i.inventory_number', 'u.display_name as assigned_user_name');
}

/**
 * GET /
 * List all orders with vendor, contract, and assigned user joins.
 * @returns Array of order objects
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.vendors_id) query = query.where('o.vendors_id', req.query.vendors_id);
    if (req.query.status) query = query.where('o.status', req.query.status);
    const limit = Math.min(parseInt(req.query.limit) || 10000, 10000);
    const rows = await query.orderBy('o.order_date', 'desc').limit(limit);
    res.json(rows);
  } catch (err) { safeError(res, err, 'orders'); }
});

/**
 * GET /:id
 * Get a single order by ID with joins.
 * @returns Order object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('o.orders_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'orders'); }
});

/**
 * POST /
 * Create a new service order.
 * @auth Requires role: Admin, Manager
 * @body vendors_id, contracts_id, inventory_id, order_number, description, contracted_rate, order_date, due_date, status, notes, assigned_users_id
 * @returns 201 with created order
 */
router.post('/', requireRole('Admin', 'Manager'), orderRules, validate, auditCreate('orders', 'orders_id'), async (req, res) => {
  try {
    const { vendors_id, contracts_id, inventory_id, order_number, description, contracted_rate, order_date, due_date, status, notes, assigned_users_id } = req.body;
    const id = await db.insertReturningId('orders', {
      vendors_id,
      contracts_id,
      inventory_id: inventory_id || null,
      order_number,
      description: description || '',
      contracted_rate: contracted_rate || null,
      order_date: order_date || null,
      due_date: due_date || null,
      status: status || 'In Progress',
      notes: notes || '',
      assigned_users_id: assigned_users_id || null,
    });
    const row = await baseQuery().where('o.orders_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'orders'); }
});

/**
 * PUT /:id
 * Update an existing order.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated order object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...orderRules, validate, auditUpdate('orders', 'orders_id'), async (req, res) => {
  try {
    const { vendors_id, contracts_id, inventory_id, order_number, description, contracted_rate, order_date, due_date, status, notes, assigned_users_id } = req.body;
    await db('orders').where('orders_id', req.params.id).update({
      vendors_id,
      contracts_id,
      inventory_id: inventory_id || null,
      order_number,
      description: description || '',
      contracted_rate: contracted_rate || null,
      order_date: order_date || null,
      due_date: due_date || null,
      status,
      notes: notes || '',
      assigned_users_id: assigned_users_id || null,
    });
    const row = await baseQuery().where('o.orders_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'orders'); }
});

router.get('/:id/inventory', idParam, validate, async (req, res) => {
  try {
    const rows = await db('inventory as i')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .leftJoin('contracts as co', 'i.contracts_id', 'co.contracts_id')
      .select('i.*', 'a.name as account_name', 'co.contract_number')
      .where('i.orders_id', req.params.id)
      .orderBy('i.install_date', 'desc')
      .orderBy('i.inventory_number');
    res.json(rows);
  } catch (err) { safeError(res, err, 'orders'); }
});

/**
 * DELETE /:id
 * Delete an order. Blocked by cascadeGuard if inventory is linked.
 * @auth Requires role: Admin
 * @returns { success: true } or 409
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('orders', 'orders_id'), auditDelete('orders', 'orders_id'), async (req, res) => {
  try {
    await db('orders').where('orders_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'orders'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple orders.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('orders', 'orders_id', {
  allowed: ['vendors_id', 'contracts_id', 'inventory_id', 'order_number', 'description', 'contracted_rate', 'order_date', 'due_date', 'status', 'notes', 'assigned_users_id'],
}));

module.exports = router;
