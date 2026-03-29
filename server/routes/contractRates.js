/**
 * @file contractRates.js — Contract Rates API Routes — /api/contract-rates
 * CRUD for rate schedules tied to contracts and USOC codes.
 * Used for rate validation (comparing billed amounts to contracted rates).
 *
 * @module routes/contractRates
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, contractRateRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

// Reusable base query with USOC code + contract info
function baseQuery() {
  return db('contract_rates as cr')
    .leftJoin('contracts as c', 'cr.contracts_id', 'c.contracts_id')
    .leftJoin('usoc_codes as u', 'cr.usoc_codes_id', 'u.usoc_codes_id')
    .leftJoin('vendors as a', 'c.vendors_id', 'a.vendors_id')
    .select(
      'cr.*',
      'c.contract_number', 'c.contract_name',
      'u.usoc_code', 'u.description as usoc_description', 'u.category as usoc_category',
      'a.name as account_name'
    );
}

// GET all contract rates (optional filter: ?contracts_id=&usoc_codes_id=)
/**
 * GET /
 * List contract rates with optional ?contracts_id filter. Joins USOC codes and contracts.
 * @returns Array of rate objects with usoc_code, contract_number
 */
router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.contracts_id) query = query.where('cr.contracts_id', req.query.contracts_id);
    if (req.query.usoc_codes_id) query = query.where('cr.usoc_codes_id', req.query.usoc_codes_id);
    const rows = await query.orderBy('cr.effective_date');
    res.json(rows);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// GET single contract rate
/**
 * GET /:id
 * Get a single contract rate by ID.
 * @returns Contract rate object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('cr.contract_rates_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// POST create contract rate
/**
 * POST /
 * Create a new contract rate.
 * @auth Requires role: Admin, Manager
 * @body contracts_id, usoc_codes_id, mrc, nrc, effective_date, expiration_date, notes
 * @returns 201 with created rate
 */
router.post('/', requireRole('Admin', 'Manager'), contractRateRules, validate, auditCreate('contract_rates', 'contract_rates_id'), async (req, res) => {
  try {
    const { contracts_id, usoc_codes_id, mrc, nrc, effective_date, expiration_date, notes } = req.body;
    const id = await db.insertReturningId('contract_rates', {
      contracts_id, usoc_codes_id,
      mrc: mrc || 0, nrc: nrc || 0,
      effective_date, expiration_date, notes,
    });
    const row = await baseQuery().where('cr.contract_rates_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// PUT update contract rate
/**
 * PUT /:id
 * Update an existing contract rate.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated rate object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...contractRateRules, validate, auditUpdate('contract_rates', 'contract_rates_id'), async (req, res) => {
  try {
    const { contracts_id, usoc_codes_id, mrc, nrc, effective_date, expiration_date, notes } = req.body;
    await db('contract_rates').where('contract_rates_id', req.params.id).update({
      contracts_id, usoc_codes_id,
      mrc, nrc, effective_date, expiration_date, notes,
    });
    const row = await baseQuery().where('cr.contract_rates_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// DELETE contract rate
/**
 * DELETE /:id
 * Delete a contract rate.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('contract_rates', 'contract_rates_id'), auditDelete('contract_rates', 'contract_rates_id'), async (req, res) => {
  try {
    await db('contract_rates').where('contract_rates_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'contractRates'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple contract rates.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('contract_rates', 'contract_rates_id', {
  allowed: ['contracts_id', 'usoc_codes_id', 'rate', 'effective_date', 'expiration_date', 'description', 'status'],
}));

module.exports = router;
