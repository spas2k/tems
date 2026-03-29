/**
 * @file usocCodes.js — USOC Codes API Routes — /api/usoc-codes
 * CRUD for Universal Service Order Codes.
 * USOC codes classify telecom service types and their default charges.
 *
 * @module routes/usocCodes
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, usocCodeRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

// GET all USOC codes (optional filter: ?category=&status=)
/**
 * GET /
 * List all USOC codes ordered by usoc_code.
 * @returns Array of USOC code objects
 */
router.get('/', async (req, res) => {
  try {
    let query = db('usoc_codes');
    if (req.query.category) query = query.where('category', req.query.category);
    if (req.query.status) query = query.where('status', req.query.status);
    const rows = await query.orderBy('usoc_code');
    res.json(rows);
  } catch (err) { safeError(res, err, 'usocCodes'); }
});

// GET single USOC code
/**
 * GET /:id
 * Get a single USOC code by ID.
 * @returns USOC code object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('usoc_codes').where('usoc_codes_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'usocCodes'); }
});

// POST create USOC code
/**
 * POST /
 * Create a new USOC code.
 * @auth Requires role: Admin, Manager
 * @body usoc_code, description, category, sub_category, default_mrc, default_nrc, unit, status
 * @returns 201 with created USOC code
 */
router.post('/', requireRole('Admin', 'Manager'), usocCodeRules, validate, auditCreate('usoc_codes', 'usoc_codes_id'), async (req, res) => {
  try {
    const { usoc_code, description, category, sub_category, default_mrc, default_nrc, unit, status } = req.body;
    const id = await db.insertReturningId('usoc_codes', {
      usoc_code, description, category, sub_category,
      default_mrc: default_mrc || 0,
      default_nrc: default_nrc || 0,
      unit, status: status || 'Active',
    });
    const row = await db('usoc_codes').where('usoc_codes_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'usocCodes'); }
});

// PUT update USOC code
/**
 * PUT /:id
 * Update an existing USOC code.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated USOC code object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...usocCodeRules, validate, auditUpdate('usoc_codes', 'usoc_codes_id'), async (req, res) => {
  try {
    const { usoc_code, description, category, sub_category, default_mrc, default_nrc, unit, status } = req.body;
    await db('usoc_codes').where('usoc_codes_id', req.params.id).update({
      usoc_code, description, category, sub_category,
      default_mrc, default_nrc, unit, status,
    });
    const row = await db('usoc_codes').where('usoc_codes_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'usocCodes'); }
});

// DELETE USOC code
/**
 * DELETE /:id
 * Delete a USOC code. Blocked by cascadeGuard if contract rates or line items reference it.
 * @auth Requires role: Admin
 * @returns { success: true } or 409
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('usoc_codes', 'usoc_codes_id'), auditDelete('usoc_codes', 'usoc_codes_id'), async (req, res) => {
  try {
    await db('usoc_codes').where('usoc_codes_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'usocCodes'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple USOC codes.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('usoc_codes', 'usoc_codes_id', {
  allowed: ['usoc_code', 'description', 'charge_type', 'category', 'sub_category', 'rate', 'status'],
}));

module.exports = router;
