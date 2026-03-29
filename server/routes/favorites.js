/**
 * @file favorites.js — Favorites API Routes — /api/favorites
 * CRUD for user-bookmarked entities.
 * Favorites are scoped to the authenticated user (users_id).
 *
 * @module routes/favorites
 */
// ============================================================
// Favorites API Routes  — /api/favorites
// Favorites are scoped to the authenticated user (users_id).
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');

const TABLE = 'user_favorites';

// ── All routes require at least Viewer role ──────────────
router.use(requireRole('Admin', 'Manager', 'Analyst', 'Viewer'));

// Resolve current user id — works in both dev and SSO mode
function getUserId(req) {
  return req.user?.users_id || null;
}

// GET /api/favorites — list favorites for the current user
/**
 * GET /
 * List all favorites for the current user, ordered by position, then created_at desc.
 * @returns Array of favorite objects
 */
router.get('/', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.json([]);
    const rows = await db(TABLE)
      .where('users_id', uid)
      .orderBy('created_at', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, TABLE); }
});

// POST /api/favorites — create a new favorite
/**
 * POST /
 * Add a new favorite bookmark.
 * @body entity_type, entity_id, label, path
 * @returns 201 with created favorite
 */
router.post('/', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'User not identified' });

    const { name, path, filters, filter_summary, icon } = req.body;
    if (!name || !path) return res.status(400).json({ error: 'name and path are required' });
    if (typeof name !== 'string' || name.length > 120) return res.status(400).json({ error: 'name must be a string ≤120 chars' });
    if (typeof path !== 'string' || path.length > 255) return res.status(400).json({ error: 'path must be a string ≤255 chars' });

    const id = await db.insertReturningId(TABLE, {
      users_id: uid,
      name: name.trim(),
      path,
      filters: filters ? JSON.stringify(filters) : null,
      filter_summary: filter_summary || null,
      icon: icon || null,
    });
    const row = await db(TABLE).where('user_favorites_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, TABLE); }
});

// PUT /api/favorites/:id — rename (only name field is mutable)
/**
 * PUT /:id
 * Update a favorite (label, position, path).
 * @body label, position, path
 * @returns Updated favorite object
 */
router.put('/:id', async (req, res) => {
  try {
    const uid = getUserId(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.length > 120) {
      return res.status(400).json({ error: 'name must be a non-empty string ≤120 chars' });
    }

    // Enforce ownership
    const fav = await db(TABLE).where('user_favorites_id', id).first();
    if (!fav) return res.status(404).json({ error: 'Favorite not found' });
    if (fav.users_id !== uid) return res.status(403).json({ error: 'Forbidden' });

    await db(TABLE).where('user_favorites_id', id).update({ name: name.trim() });
    const row = await db(TABLE).where('user_favorites_id', id).first();
    res.json(row);
  } catch (err) { safeError(res, err, TABLE); }
});

// DELETE /api/favorites/:id — delete a favorite
/**
 * DELETE /:id
 * Remove a favorite bookmark.
 * @returns { success: true }
 */
router.delete('/:id', async (req, res) => {
  try {
    const uid = getUserId(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });

    const fav = await db(TABLE).where('user_favorites_id', id).first();
    if (!fav) return res.status(404).json({ error: 'Favorite not found' });
    if (fav.users_id !== uid) return res.status(403).json({ error: 'Forbidden' });

    await db(TABLE).where('user_favorites_id', id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, TABLE); }
});

module.exports = router;
