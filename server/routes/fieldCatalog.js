/**
 * @file fieldCatalog.js — Field Catalog API Routes — /api/field-catalog
 * CRUD for user-defined dropdown options (picklists).
 * Options are grouped by category and used across entity forms.
 *
 * @module routes/fieldCatalog
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');

const catalogRules = [
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 80 }),
  body('label').trim().notEmpty().withMessage('Label is required').isLength({ max: 120 }),
  body('value').trim().notEmpty().withMessage('Value is required').isLength({ max: 200 }),
  body('sort_order').optional({ nullable: true, values: 'falsy' }).isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
];

// GET all, optionally filter by category
/**
 * GET /
 * List all field catalog entries, or filter by ?category. Grouped by category.
 * @returns Array of field catalog objects
 */
router.get('/', async (req, res) => {
  try {
    let q = db('field_catalog').orderBy('category').orderBy('sort_order').orderBy('label');
    if (req.query.category) q = q.where('category', req.query.category);
    if (req.query.active === 'true') q = q.where('is_active', true);
    const rows = await q;
    res.json(rows);
  } catch (err) { safeError(res, err, 'field_catalog'); }
});

// GET distinct categories
router.get('/categories', async (req, res) => {
  try {
    const rows = await db('field_catalog').distinct('category').orderBy('category');
    res.json(rows.map(r => r.category));
  } catch (err) { safeError(res, err, 'field_catalog'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('field_catalog').where('field_catalog_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'field_catalog'); }
});

/**
 * POST /
 * Create a new field catalog entry.
 * @auth Requires role: Admin
 * @body category, value, label, sort_order, active
 * @returns 201 with created entry
 */
router.post('/', requireRole('Admin'), catalogRules, validate, auditCreate('field_catalog', 'field_catalog_id'), async (req, res) => {
  try {
    const { category, label, value, sort_order, is_active, description } = req.body;
    const id = await db.insertReturningId('field_catalog', {
      category, label, value,
      sort_order: sort_order ?? 0,
      is_active: is_active !== false,
      description,
    });
    const row = await db('field_catalog').where('field_catalog_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'field_catalog'); }
});

/**
 * PUT /:id
 * Update a field catalog entry.
 * @auth Requires role: Admin
 * @body Same as POST
 * @returns Updated entry
 */
router.put('/:id', requireRole('Admin'), idParam, catalogRules, validate, auditUpdate('field_catalog', 'field_catalog_id'), async (req, res) => {
  try {
    const { category, label, value, sort_order, is_active, description } = req.body;
    await db('field_catalog').where('field_catalog_id', req.params.id).update({
      category, label, value, sort_order, is_active, description,
    });
    const row = await db('field_catalog').where('field_catalog_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'field_catalog'); }
});

/**
 * DELETE /:id
 * Delete a field catalog entry.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, auditDelete('field_catalog', 'field_catalog_id'), async (req, res) => {
  try {
    await db('field_catalog').where('field_catalog_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'field_catalog'); }
});

module.exports = router;
