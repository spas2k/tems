/**
 * @file emailConfig.js — Email Config API Routes — /api/email-config
 * SMTP configuration management and test email sending.
 * Admin-only. Config is stored in the email_config DB table.
 *
 * @module routes/emailConfig
 */
// ============================================================
// Email Configuration API Routes (Admin only)
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate } = require('./_validators');
const { body } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const { auditUpdate } = require('../middleware/audit');
const { sendTest, flushConfigCache, getConfig } = require('../services/email');

// GET /api/email-config — fetch current email configuration
/**
 * GET /
 * Get the current email configuration. Masks SMTP password.
 * @returns Email config object with smtp_pass masked
 */
router.get('/', requireRole('Admin'), async (req, res) => {
  try {
    const cfg = await db('email_config').first();
    if (!cfg) return res.json(null);
    // Mask the SMTP password in responses
    const masked = { ...cfg, smtp_pass: cfg.smtp_pass ? '••••••••' : '' };
    res.json(masked);
  } catch (err) { safeError(res, err, 'email_config'); }
});

// PUT /api/email-config — update the config (single-row upsert)
/**
 * PUT /
 * Update email configuration. Flushes transporter cache.
 * @auth Requires role: Admin
 * @body smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, from_name, from_address, reply_to, enabled, notify_* toggles
 * @returns Updated config
 */
router.put('/', requireRole('Admin'), [
  body('enabled').isBoolean(),
  body('smtp_host').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('smtp_port').optional().isInt({ min: 1, max: 65535 }),
  body('smtp_secure').optional().isBoolean(),
  body('smtp_user').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('smtp_pass').optional({ nullable: true }).isLength({ max: 512 }),
  body('from_address').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('from_name').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('reply_to').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('require_tls').optional().isBoolean(),
  body('reject_unauthorized').optional().isBoolean(),
  body('notify_invoice_assigned').optional().isBoolean(),
  body('notify_approval_needed').optional().isBoolean(),
  body('notify_status_changed').optional().isBoolean(),
  body('notify_user_created').optional().isBoolean(),
  body('notify_user_suspended').optional().isBoolean(),
  body('notify_role_changed').optional().isBoolean(),
  body('notify_announcements').optional().isBoolean(),
  body('notify_digest').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    // Whitelist allowed fields to prevent mass assignment
    const ALLOWED = ['enabled','smtp_host','smtp_port','smtp_secure','smtp_user','smtp_pass',
      'from_address','from_name','reply_to','require_tls','reject_unauthorized',
      'notify_invoice_assigned','notify_approval_needed','notify_status_changed',
      'notify_user_created','notify_user_suspended','notify_role_changed',
      'notify_announcements','notify_digest'];
    const fields = {};
    for (const k of ALLOWED) { if (req.body[k] !== undefined) fields[k] = req.body[k]; }
    // Don't overwrite password with mask string
    if (fields.smtp_pass === '••••••••' || fields.smtp_pass === '') {
      delete fields.smtp_pass;
    }
    fields.updated_at = db.fn.now();

    const existing = await db('email_config').first();
    if (existing) {
      await db('email_config').where('email_config_id', existing.email_config_id).update(fields);
    } else {
      await db('email_config').insert(fields);
    }

    flushConfigCache();

    // Return updated config (masked)
    const cfg = await db('email_config').first();
    res.json({ ...cfg, smtp_pass: cfg.smtp_pass ? '••••••••' : '' });
  } catch (err) { safeError(res, err, 'email_config'); }
});

// POST /api/email-config/test — send a test email
/**
 * POST /test
 * Send a test email to the specified address.
 * @auth Requires role: Admin
 * @body { to }
 * @returns Email log record
 */
router.post('/test', requireRole('Admin'), [
  body('to').trim().isEmail().withMessage('Valid email address required'),
], validate, async (req, res) => {
  try {
    const result = await sendTest(req.body.to);
    res.json(result);
  } catch (err) { safeError(res, err, 'email_config'); }
});

// GET /api/email-config/log — recent email send log
router.get('/log', requireRole('Admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      db('email_log as el')
        .leftJoin('users as u', 'el.users_id', 'u.users_id')
        .select('el.*', 'u.display_name', 'u.email as user_email')
        .orderBy('el.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('email_log').count('* as total').first(),
    ]);

    res.json({
      data: rows,
      pagination: { page, limit, total: Number(countResult.total) },
    });
  } catch (err) { safeError(res, err, 'email_log'); }
});

module.exports = router;
