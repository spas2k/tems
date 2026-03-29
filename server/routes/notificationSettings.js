/**
 * @file notificationSettings.js — Notification Types / Settings API — /api/notification-settings
 * Admin management of notification type definitions (enable/disable, edit descriptions).
 *
 * @module routes/notificationSettings
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');
const { idParam, validate } = require('./_validators');
const { body } = require('express-validator');

const updateRules = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().trim(),
  body('in_app_enabled').optional().isBoolean(),
  body('email_enabled').optional().isBoolean(),
];

/**
 * GET /
 * List all notification types.
 * @returns Array of notification_types rows
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db('notification_types').orderBy('category').orderBy('name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'notification-settings'); }
});

/**
 * GET /:id
 * Get a single notification type.
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('notification_types')
      .where('notification_types_id', req.params.id)
      .first();
    if (!row) return res.status(404).json({ error: 'Notification type not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'notification-settings'); }
});

/**
 * PUT /:id
 * Update a notification type (toggle enabled, edit description).
 * @auth Admin only
 */
router.put('/:id', requireRole('Admin'), idParam, ...updateRules, validate, async (req, res) => {
  try {
    const { name, description, in_app_enabled, email_enabled } = req.body;
    const updates = { updated_at: db.fn.now() };
    if (name !== undefined)           updates.name = name;
    if (description !== undefined)    updates.description = description;
    if (in_app_enabled !== undefined) updates.in_app_enabled = in_app_enabled;
    if (email_enabled !== undefined)  updates.email_enabled = email_enabled;

    await db('notification_types')
      .where('notification_types_id', req.params.id)
      .update(updates);

    const row = await db('notification_types')
      .where('notification_types_id', req.params.id)
      .first();
    res.json(row);
  } catch (err) { safeError(res, err, 'notification-settings'); }
});

/**
 * POST /
 * Create a custom notification type (non-system).
 * @auth Admin only
 */
router.post('/', requireRole('Admin'), [
  body('key').isString().trim().isLength({ min: 1, max: 50 }),
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().trim(),
  body('category').optional().isString().trim(),
  body('default_type').optional().isIn(['info', 'warning', 'success', 'error']),
  body('in_app_enabled').optional().isBoolean(),
  body('email_enabled').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    const { key, name, description, category, default_type, in_app_enabled, email_enabled } = req.body;
    const id = await db.insertReturningId('notification_types', {
      key,
      name,
      description: description || null,
      category: category || 'system',
      default_type: default_type || 'info',
      in_app_enabled: in_app_enabled !== false,
      email_enabled: email_enabled === true,
      is_system: false,
    });
    const row = await db('notification_types').where('notification_types_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'notification-settings'); }
});

/**
 * DELETE /:id
 * Delete a custom notification type (cannot delete system types).
 * @auth Admin only
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, async (req, res) => {
  try {
    const row = await db('notification_types')
      .where('notification_types_id', req.params.id)
      .first();
    if (!row) return res.status(404).json({ error: 'Notification type not found' });
    if (row.is_system) return res.status(400).json({ error: 'Cannot delete system notification types' });
    await db('notification_types').where('notification_types_id', req.params.id).delete();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'notification-settings'); }
});

module.exports = router;
