/**
 * @file inventory.js — Inventory API Routes — /api/inventory
 * CRUD for telecom circuit/service inventory items.
 * Each inventory item belongs to an account and optionally a contract/order.
 *
 * @module routes/inventory
 */
﻿const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, inventoryItemRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

// Reusable base query for inventory with joined names
function baseQuery() {
  return db('inventory as i')
    .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
    .leftJoin('contracts as co', 'i.contracts_id', 'co.contracts_id')
    .leftJoin('orders as o', 'i.orders_id', 'o.orders_id')
    .select('i.*', 'a.name as account_name', 'co.contract_number', 'o.order_number');
}

/**
 * GET /
 * List all inventory items with account, contract, and vendor joins.
 * @returns Array of inventory objects with joined names
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.accounts_id) query = query.where('i.accounts_id', req.query.accounts_id);
    if (req.query.status)      query = query.where('i.status', req.query.status);
    const limit = Math.min(parseInt(req.query.limit) || 10000, 10000);
    const rows = await query.orderBy('i.inventory_number').limit(limit);
    res.json(rows);
  } catch (err) { safeError(res, err, 'inventory'); }
});

/**
 * GET /:id
 * Get a single inventory item by ID with joins.
 * @returns Inventory object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('i.inventory_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'inventory'); }
});

/**
 * POST /
 * Create a new inventory item.
 * @auth Requires role: Admin, Manager
 * @body accounts_id, contracts_id, orders_id, inventory_number, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date
 * @returns 201 with created inventory item
 */
router.post('/', requireRole('Admin', 'Manager'), inventoryItemRules, validate, auditCreate('inventory', 'inventory_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, orders_id, inventory_number, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    const id = await db.insertReturningId('inventory', {
      accounts_id,
      contracts_id:contracts_id || null,
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

/**
 * PUT /:id
 * Update an existing inventory item.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated inventory object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...inventoryItemRules, validate, auditUpdate('inventory', 'inventory_id'), async (req, res) => {
  try {
    const { accounts_id, contracts_id, orders_id, inventory_number, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date } = req.body;
    await db('inventory').where('inventory_id', req.params.id).update({
      accounts_id,
      contracts_id:contracts_id || null,
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

/**
 * DELETE /:id
 * Delete an inventory item. Blocked by cascadeGuard if line items exist.
 * @auth Requires role: Admin
 * @returns { success: true } or 409
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('inventory', 'inventory_id'), auditDelete('inventory', 'inventory_id'), async (req, res) => {
  try {
    await db('inventory').where('inventory_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'inventory'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple inventory items.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('inventory', 'inventory_id', {
  allowed: ['accounts_id', 'contracts_id', 'orders_id', 'inventory_number', 'type', 'bandwidth', 'location', 'contracted_rate', 'status', 'install_date', 'disconnect_date'],
}));

module.exports = router;
