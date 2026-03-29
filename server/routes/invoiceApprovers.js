/**
 * @file invoiceApprovers.js — Invoice Approvers API Routes — /api/invoice-approvers
 * Manages approval levels (dollar thresholds) and per-user approver assignments.
 *
 * @module routes/invoiceApprovers
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');

// ── Approval Levels (thresholds) ─────────────────────────

/**
 * GET /levels
 * List all approval levels with their dollar thresholds.
 * @returns Array of approval_levels rows
 */
router.get('/levels', async (req, res) => {
  try {
    const rows = await db('approval_levels').orderBy('level');
    res.json(rows);
  } catch (err) { safeError(res, err, 'approval_levels'); }
});

/**
 * PUT /levels/:id
 * Update an approval level's name or dollar thresholds.
 * @auth Requires role: Admin
 * @body { name, min_amount, max_amount }
 * @returns Updated approval_levels row
 */
router.put('/levels/:id', requireRole('Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid level ID' });
    const { name } = req.body;
    if (name && typeof name !== 'string') return res.status(400).json({ error: 'name must be a string' });
    if (name && name.length > 255) return res.status(400).json({ error: 'name must be 255 characters or fewer' });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (req.body.min_amount !== undefined) {
      const v = parseFloat(req.body.min_amount);
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: 'min_amount must be a non-negative number' });
      updates.min_amount = v;
    }
    if (req.body.max_amount !== undefined) {
      const v = parseFloat(req.body.max_amount);
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: 'max_amount must be a non-negative number' });
      updates.max_amount = v;
    }
    if (updates.min_amount != null && updates.max_amount != null && updates.min_amount > updates.max_amount) {
      return res.status(400).json({ error: 'min_amount cannot exceed max_amount' });
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    await db('approval_levels').where('approval_levels_id', id).update(updates);
    const row = await db('approval_levels').where('approval_levels_id', id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'approval_levels'); }
});

// ── Approver Assignments ─────────────────────────────────

/**
 * GET /
 * List all approver assignments with user display names joined.
 * @returns Array of invoice_approvers rows with joined user names
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db('invoice_approvers as ia')
      .leftJoin('users as u',  'ia.users_id',             'u.users_id')
      .leftJoin('users as p',  'ia.primary_approver_id',  'p.users_id')
      .leftJoin('users as a',  'ia.alternate_approver_id', 'a.users_id')
      .select(
        'ia.*',
        'u.display_name as user_name',
        'u.email as user_email',
        'p.display_name as primary_approver_name',
        'a.display_name as alternate_approver_name',
      )
      .orderBy(['ia.users_id', 'ia.level']);
    res.json(rows);
  } catch (err) { safeError(res, err, 'invoice_approvers'); }
});

/**
 * GET /user/:userId
 * Get all 3 level assignments for a specific user.
 * @returns Array of up to 3 invoice_approvers rows
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user ID' });
    const rows = await db('invoice_approvers as ia')
      .leftJoin('users as p', 'ia.primary_approver_id', 'p.users_id')
      .leftJoin('users as a', 'ia.alternate_approver_id', 'a.users_id')
      .select(
        'ia.*',
        'p.display_name as primary_approver_name',
        'a.display_name as alternate_approver_name',
      )
      .where('ia.users_id', userId)
      .orderBy('ia.level');
    res.json(rows);
  } catch (err) { safeError(res, err, 'invoice_approvers'); }
});

/**
 * PUT /user/:userId
 * Upsert all 3 level assignments for a user in one call.
 * @auth Requires role: Admin, Manager
 * @body { levels: [{ level, primary_approver_id, alternate_approver_id }, ...] }
 * @returns Array of saved invoice_approvers rows
 */
router.put('/user/:userId', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { levels } = req.body;
    if (!Array.isArray(levels)) return res.status(400).json({ error: 'levels array required' });

    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user ID' });
    const results = [];

    for (const entry of levels) {
      const { level, primary_approver_id, alternate_approver_id } = entry;
      if (![1, 2, 3].includes(level)) continue;

      const existing = await db('invoice_approvers')
        .where({ users_id: userId, level })
        .first();

      const data = {
        users_id: userId,
        level,
        primary_approver_id: primary_approver_id || null,
        alternate_approver_id: alternate_approver_id || null,
      };

      if (existing) {
        await db('invoice_approvers')
          .where('invoice_approvers_id', existing.invoice_approvers_id)
          .update(data);
        results.push({ ...existing, ...data });
      } else {
        const id = await db.insertReturningId('invoice_approvers', data);
        results.push({ invoice_approvers_id: id, ...data });
      }
    }

    res.json(results);
  } catch (err) { safeError(res, err, 'invoice_approvers'); }
});

/**
 * DELETE /user/:userId
 * Remove all approver assignments for a user.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/user/:userId', requireRole('Admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ error: 'Invalid user ID' });
    await db('invoice_approvers').where('users_id', userId).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'invoice_approvers'); }
});

module.exports = router;
