/**
 * @file systemSettings.js — System Settings API Routes — /api/system-settings
 * Admin-managed app-wide configuration (e.g. default dashboard layout).
 *
 * @module routes/systemSettings
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');

const ALLOWED_KEYS = new Set(['defaultDashboardLayout']);

/**
 * GET /api/system-settings/:key
 * Read a single system setting by key. Available to all authenticated users.
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.has(key)) {
      return res.status(400).json({ error: `Unknown setting key: ${key}` });
    }
    const row = await db('system_settings').where('key', key).first();
    res.json({ key, value: row ? row.value : null });
  } catch (err) {
    safeError(res, err, 'system_settings');
  }
});

/**
 * PUT /api/system-settings/:key
 * Create or update a system setting. Admin only.
 */
router.put('/:key', requireRole('Admin'), async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.has(key)) {
      return res.status(400).json({ error: `Unknown setting key: ${key}` });
    }
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Request body must include "value"' });
    }

    const exists = await db('system_settings').where('key', key).first();
    if (exists) {
      await db('system_settings').where('key', key).update({
        value: JSON.stringify(value),
        updated_at: db.fn.now(),
      });
    } else {
      await db('system_settings').insert({
        key,
        value: JSON.stringify(value),
      });
    }

    res.json({ key, value });
  } catch (err) {
    safeError(res, err, 'system_settings');
  }
});

/**
 * DELETE /api/system-settings/:key
 * Remove a system setting. Admin only.
 */
router.delete('/:key', requireRole('Admin'), async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.has(key)) {
      return res.status(400).json({ error: `Unknown setting key: ${key}` });
    }
    await db('system_settings').where('key', key).del();
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, 'system_settings');
  }
});

module.exports = router;
