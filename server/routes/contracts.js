/**
 * @file contracts.js — Contracts API Routes — /api/contracts
 * CRUD for vendor contracts.
 * Contracts define terms, rates, and durations for telecom services.
 *
 * @module routes/contracts
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, contractRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

function baseQuery() {
  return db('contracts as c')
    .leftJoin('vendors as v', 'c.vendors_id', 'v.vendors_id')
    .select('c.*', 'v.name as vendor_name');
}

/**
 * GET /
 * List all contracts with vendor name join, ordered by contract_number.
 * @returns Array of contract objects with vendor_name
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.vendors_id) query = query.where('c.vendors_id', req.query.vendors_id);
    const rows = await query.orderBy('c.contract_name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contracts'); }
});

/**
 * GET /:id
 * Get a single contract by ID with vendor join.
 * @returns Contract object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('c.contracts_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'contracts'); }
});

/**
 * POST /
 * Create a new contract.
 * @auth Requires role: Admin, Manager
 * @body vendors_id, contract_name, contract_number, type, subtype, start_date, expiration_date, status, ...
 * @returns 201 with created contract
 */
router.post('/', requireRole('Admin', 'Manager'), contractRules, validate, auditCreate('contracts', 'contracts_id'), async (req, res) => {
  try {
    const {
      vendors_id, contract_number, contract_name, type, subtype, parent_contract_id,
      currency_id, contract_record_url, start_date, expiration_date, term_type, renew_date,
      contracted_rate, rate_unit, term_months, minimum_spend, etf_amount, commitment_type,
      contract_value, tax_assessed, product_service_types, business_line, status, auto_renew
    } = req.body;
    
    const id = await db.insertReturningId('contracts', {
      vendors_id, contract_number: contract_number || null, contract_name: contract_name || null,
      type: type || null, subtype: subtype || null,
      parent_contract_id: parent_contract_id || null, currency_id: currency_id || null,
      contract_record_url: contract_record_url || null, start_date: start_date || null,
      expiration_date: expiration_date || null, term_type: term_type || null, renew_date: renew_date || null,
      contracted_rate: contracted_rate || null, rate_unit: rate_unit || null,
      term_months: term_months || null, minimum_spend: minimum_spend || null,
      etf_amount: etf_amount || null, commitment_type: commitment_type || null,
      contract_value: contract_value || null, tax_assessed: tax_assessed || null,
      product_service_types: product_service_types || null, business_line: business_line || null,
      status: status || 'Active', auto_renew: auto_renew ? 1 : 0
    });
    const row = await baseQuery().where('c.contracts_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'contracts'); }
});

/**
 * PUT /:id
 * Update an existing contract.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated contract object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...contractRules, validate, auditUpdate('contracts', 'contracts_id'), async (req, res) => {
  try {
    const {
      vendors_id, contract_number, contract_name, type, subtype, parent_contract_id,
      currency_id, contract_record_url, start_date, expiration_date, term_type, renew_date,
      contracted_rate, rate_unit, term_months, minimum_spend, etf_amount, commitment_type,
      contract_value, tax_assessed, product_service_types, business_line, status, auto_renew
    } = req.body;
    
    await db('contracts').where('contracts_id', req.params.id).update({
      vendors_id, contract_number: contract_number || null, contract_name: contract_name || null,
      type: type || null, subtype: subtype || null,
      parent_contract_id: parent_contract_id || null, currency_id: currency_id || null,
      contract_record_url: contract_record_url || null, start_date: start_date || null,
      expiration_date: expiration_date || null, term_type: term_type || null, renew_date: renew_date || null,
      contracted_rate: contracted_rate || null, rate_unit: rate_unit || null,
      term_months: term_months || null, minimum_spend: minimum_spend || null,
      etf_amount: etf_amount || null, commitment_type: commitment_type || null,
      contract_value: contract_value || null, tax_assessed: tax_assessed || null,
      product_service_types: product_service_types || null, business_line: business_line || null,
      status: status || 'Active', auto_renew: auto_renew ? 1 : 0
    });
    const row = await baseQuery().where('c.contracts_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.get('/:id/inventory', idParam, validate, async (req, res) => {
  try {
    const rows = await db('inventory as i')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .select('i.*', 'a.account_number')
      .where('i.contracts_id', req.params.id)
      .orderBy('i.status')
      .orderBy('i.location');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contracts'); }
});

router.get('/:id/orders', idParam, validate, async (req, res) => {
  try {
    const rows = await db('orders as o')
      .leftJoin('vendors as v', 'o.vendors_id', 'v.vendors_id')
      .select('o.*', 'v.name as vendor_name')
      .where('o.contracts_id', req.params.id)
      .orderBy('o.order_date', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contracts'); }
});

/**
 * DELETE /:id
 * Delete a contract. Blocked by cascadeGuard if dependent records exist.
 * @auth Requires role: Admin
 * @returns { success: true } or 409
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('contracts', 'contracts_id'), auditDelete('contracts', 'contracts_id'), async (req, res) => {
  try {
    await db('contracts').where('contracts_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'contracts'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple contracts.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('contracts', 'contracts_id', {
  allowed: ['vendors_id', 'contract_number', 'contract_name', 'type', 'subtype', 'parent_contract_id', 'currency_id', 'start_date', 'expiration_date', 'term_type', 'renew_date', 'contracted_rate', 'rate_unit', 'term_months', 'minimum_spend', 'etf_amount', 'commitment_type', 'contract_value', 'tax_assessed', 'product_service_types', 'business_line', 'status', 'auto_renew'],
}));

module.exports = router;
