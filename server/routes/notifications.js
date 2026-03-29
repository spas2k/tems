/**
 * @file notifications.js — Notifications API Routes — /api/notifications
 * In-app notification management for the authenticated user.
 * Notifications are created by the notification service and consumed here.
 *
 * @module routes/notifications
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { idParam, validate } = require('./_validators');

// GET /api/notifications — fetch current user's notifications (most recent 50)
/**
 * GET /
 * List notifications for the current user (last 50), most recent first.
 * @returns Array of notification objects
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.users_id;
    if (!userId) return res.json([]);
    const rows = await db('notifications')
      .where('users_id', userId)
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json(rows);
  } catch (err) { safeError(res, err, 'notifications'); }
});

// PATCH /api/notifications/read-all — mark all as read for current user
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user?.users_id;
    if (!userId) return res.json({ success: true });
    await db('notifications').where('users_id', userId).where('is_read', false).update({ is_read: true });
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'notifications'); }
});

// PATCH /api/notifications/:id/read — mark one notification as read
router.patch('/:id/read', idParam, validate, async (req, res) => {
  try {
    const userId = req.user?.users_id;
    await db('notifications')
      .where('notifications_id', req.params.id)
      .where('users_id', userId) // security: users can only mark their own
      .update({ is_read: true });
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'notifications'); }
});

module.exports = router;
