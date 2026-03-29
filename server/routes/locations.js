/**
 * @file locations.js — Locations API Routes — /api/locations
 * CRUD for physical site locations.
 * Locations are referenced by inventory items for installation addresses.
 *
 * @module routes/locations
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

const SITE_TYPES = ['Data Center', 'Office', 'Remote', 'Warehouse', 'Colocation', 'Other'];

const locationRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('site_code').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 40 }),
  body('site_type').optional({ nullable: true, values: 'falsy' }).isIn([...SITE_TYPES, '']),
  body('status').optional().isIn(['Active', 'Inactive']),
];

/**
 * GET /
 * List all locations ordered by name.
 * @returns Array of location objects
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db('locations').orderBy('name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'locations'); }
});

/**
 * GET /:id
 * Get a single location by ID.
 * @returns Location object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('locations').where('locations_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'locations'); }
});

/**
 * POST /
 * Create a new location.
 * @auth Requires role: Admin, Manager
 * @body name, address_line1, address_line2, city, state, zip, country, location_type, status
 * @returns 201 with created location
 */
router.post('/', requireRole('Admin', 'Manager'), locationRules, validate, auditCreate('locations', 'locations_id'), async (req, res) => {
  try {
    const { name, site_code, site_type, address, city, state, zip, country,
            contact_name, contact_phone, contact_email, status, notes } = req.body;
    const id = await db.insertReturningId('locations', {
      name, site_code, site_type, address, city, state, zip,
      country: country || 'USA', contact_name, contact_phone, contact_email,
      status: status || 'Active', notes,
    });
    const row = await db('locations').where('locations_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'locations'); }
});

/**
 * PUT /:id
 * Update an existing location.
 * @auth Requires role: Admin, Manager
 * @body Same as POST fields
 * @returns Updated location object
 */
router.put('/:id', requireRole('Admin', 'Manager'), idParam, locationRules, validate, auditUpdate('locations', 'locations_id'), async (req, res) => {
  try {
    const { name, site_code, site_type, address, city, state, zip, country,
            contact_name, contact_phone, contact_email, status, notes } = req.body;
    await db('locations').where('locations_id', req.params.id).update({
      name, site_code, site_type, address, city, state, zip, country,
      contact_name, contact_phone, contact_email, status, notes,
    });
    const row = await db('locations').where('locations_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'locations'); }
});

/**
 * DELETE /:id
 * Delete a location.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, auditDelete('locations', 'locations_id'), async (req, res) => {
  try {
    await db('locations').where('locations_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'locations'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
/**
 * PATCH /bulk
 * Bulk update multiple locations.
 * @auth Requires role: Admin, Manager
 * @body { ids, updates }
 * @returns { updated: number }
 */
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('locations', 'locations_id', {
  allowed: ['location_name', 'address', 'city', 'state', 'zip', 'country', 'type', 'status'],
}));

module.exports = router;
