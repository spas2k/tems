/**
 * @file users.js — Users API Routes — /api/users
 * User account management (CRUD + role assignment).
 * Resets auth cache on changes to keep permissions in sync.
 *
 * @module routes/users
 */
// ============================================================
// Users API Routes
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { requireRole, resetDevUserCache } = require('../middleware/auth');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const cascadeGuard = require('./_cascadeGuard');
const { notify } = require('../services/notifications');

const userRules = [
  body('email').trim().isEmail().withMessage('Valid email required').isLength({ max: 255 }),
  body('display_name').trim().notEmpty().withMessage('Display name required').isLength({ max: 120 }),
  body('roles_id').notEmpty().withMessage('Role is required').isInt({ min: 1 }),
  body('status').optional().isIn(['Active', 'Inactive', 'Suspended']).withMessage('Status must be Active, Inactive, or Suspended'),
  body('sso_subject').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 255 }),
  body('sso_provider').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 80 }),
];

// GET /api/users — list all users with role name
/**
 * GET /
 * List all users with role name join, ordered by display_name.
 * @returns Array of user objects with role_name
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .orderBy('u.display_name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'users'); }
});

// GET /api/users/demo-users — list all active users for impersonation (dev mode only)
// Must be defined BEFORE /:id so it isn't swallowed by that route.
router.get('/demo-users', async (req, res) => {
  if ((process.env.AUTH_MODE || 'dev') === 'sso') {
    return res.status(404).json({ error: 'Not available in production mode' });
  }
  try {
    const rows = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.users_id', 'u.display_name', 'u.email', 'r.name as role_name')
      .where('u.status', 'Active')
      .orderBy('u.display_name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'users'); }
});

// GET /api/users/me — current user info (used by frontend auth context)
router.get('/me', async (req, res) => {
  try {
    if (!req.user || !req.user.users_id) {
      // Dev fallback user
      return res.json({
        users_id: null,
        email: req.user?.email || 'anonymous@dev',
        display_name: req.user?.display_name || 'Dev User',
        role_name: req.user?.role_name || 'Admin',
        permissions: req.user?.permissions || ['*'],
        status: 'Active',
      });
    }
    const user = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .where('u.users_id', req.user.users_id)
      .first();

      if (!user) {
        require('../middleware/auth').resetDevUserCache();
        return res.status(404).json({ error: 'User not found' });
      }

    // Load permissions
    const perms = await db('role_permissions as rp')
      .join('permissions as p', 'rp.permissions_id', 'p.permissions_id')
      .where('rp.roles_id', user.roles_id)
      .select('p.resource', 'p.action');
    user.permissions = perms.map(p => `${p.resource}:${p.action}`);

    res.json(user);
  } catch (err) { safeError(res, err, 'users'); }
});

// GET /api/users/:id — enriched detail
/**
 * GET /:id
 * Get a single user by ID with role join.
 * @returns User object or 404
 */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .where('u.users_id', req.params.id)
      .first();
    if (!row) return res.status(404).json({ error: 'Not found' });

    // Counts for KPI cards
    const [invCount, ordCount, actCount] = await Promise.all([
      db('invoices').where('assigned_users_id', req.params.id).count('* as cnt').first(),
      db('orders').where('assigned_users_id', req.params.id).count('* as cnt').first(),
      db('audit_log').where('users_id', req.params.id).count('* as cnt').first(),
    ]);
    row.assigned_invoices_count = Number(invCount?.cnt || 0);
    row.assigned_orders_count   = Number(ordCount?.cnt || 0);
    row.audit_actions_count     = Number(actCount?.cnt || 0);

    res.json(row);
  } catch (err) { safeError(res, err, 'users'); }
});

// GET /api/users/:id/invoices — invoices assigned to user
router.get('/:id/invoices', idParam, validate, async (req, res) => {
  try {
    const rows = await db('invoices as i')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .select('i.invoices_id', 'i.invoice_number', 'i.invoice_date',
              'i.total_amount', 'i.status', 'a.name as account_name')
      .where('i.assigned_users_id', req.params.id)
      .orderBy('i.invoice_date', 'desc')
      .limit(100);
    res.json(rows);
  } catch (err) { safeError(res, err, 'users'); }
});

// GET /api/users/:id/orders — orders assigned to user
router.get('/:id/orders', idParam, validate, async (req, res) => {
  try {
    const rows = await db('orders as o')
      .leftJoin('vendors as v', 'o.vendors_id', 'v.vendors_id')
      .leftJoin('contracts as c', 'o.contracts_id', 'c.contracts_id')
      .select('o.orders_id', 'o.order_number', 'o.order_date',
              'o.status', 'v.name as vendor_name', 'c.contract_number')
      .where('o.assigned_users_id', req.params.id)
      .orderBy('o.order_date', 'desc')
      .limit(100);
    res.json(rows);
  } catch (err) { safeError(res, err, 'users'); }
});

// GET /api/users/:id/activity — recent audit actions by user
router.get('/:id/activity', idParam, validate, async (req, res) => {
  try {
    const rows = await db('audit_log')
      .where('users_id', req.params.id)
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json(rows);
  } catch (err) { safeError(res, err, 'users'); }
});

// POST /api/users — Admin only
/**
 * POST /
 * Create a new user. Sends welcome notification. Resets auth cache.
 * @auth Requires role: Admin
 * @body email, display_name, roles_id, status, sso_subject
 * @returns 201 with created user
 */
router.post('/', requireRole('Admin'), userRules, validate, auditCreate('users', 'users_id'), async (req, res) => {
  try {
    const { email, display_name, roles_id, status, sso_subject, sso_provider } = req.body;
    const id = await db.insertReturningId('users', {
      email, display_name, roles_id,
      status: status || 'Active',
      sso_subject: sso_subject || null,
      sso_provider: sso_provider || null,
    });
    const row = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .where('u.users_id', id)
      .first();
    resetDevUserCache();

    // Welcome notification
    try {
      await notify({
        users_id: id,
        type: 'success',
        title: 'Welcome to TEMS',
        message: `Your account has been created. You are assigned the ${row.role_name || 'default'} role.`,
        entity_type: 'user',
        entity_id: id,
        category: 'user_created',
      });
    } catch {}

    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'users'); }
});


// PUT /api/users/me/preferences - update current user preferences
const ALLOWED_PREFS = new Set([
  'theme', 'rowsPerPage', 'sidebarCollapsed', 'dashboardLayout',
  'defaultPage', 'notifications', 'tableColumns', 'filters',
]);
router.put('/me/preferences', async (req, res) => {
  try {
    if (!req.user || !req.user.users_id) return res.json({ success: true, fake: true });
    // Whitelist preference keys to prevent mass assignment
    const incoming = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (ALLOWED_PREFS.has(k)) incoming[k] = v;
    }
    const user = await db('users').where('users_id', req.user.users_id).first();
    const prefs = user.preferences || {};
    const updated = { ...prefs, ...incoming };
    await db('users').where('users_id', req.user.users_id).update({ preferences: JSON.stringify(updated) });
    res.json(updated);
  } catch (err) {
    safeError(res, err, 'users');
  }
});

// PUT /api/users/:id — Admin only
/**
 * PUT /:id
 * Update a user. Notifies on role/status changes. Resets auth cache.
 * @auth Requires role: Admin
 * @body Same as POST fields
 * @returns Updated user
 */
router.put('/:id', requireRole('Admin'), idParam, ...userRules, validate, auditUpdate('users', 'users_id'), async (req, res) => {
  try {
    const { email, display_name, roles_id, status, sso_subject, sso_provider } = req.body;
    const before = await db('users').where('users_id', req.params.id).select('roles_id', 'status').first();
    await db('users').where('users_id', req.params.id).update({
      email, display_name, roles_id, status,
      sso_subject: sso_subject || null,
      sso_provider: sso_provider || null,
      updated_at: db.fn.now(),
    });
    const row = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .where('u.users_id', req.params.id)
      .first();
    resetDevUserCache();

    // Notify on role change
    try {
      if (before && String(before.roles_id) !== String(roles_id)) {
        await notify({
          users_id: Number(req.params.id),
          type: 'info',
          title: 'Your Role Has Changed',
          message: `Your role has been updated to ${row.role_name || 'a new role'}.`,
          entity_type: 'user',
          entity_id: Number(req.params.id),
          category: 'role_changed',
        });
      }
    } catch {}

    res.json(row);
  } catch (err) { safeError(res, err, 'users'); }
});

// PATCH /api/users/:id/status — suspend or activate without touching other fields
router.patch('/:id/status', requireRole('Admin'), idParam, [
  body('status').isIn(['Active', 'Inactive', 'Suspended']).withMessage('Status must be Active, Inactive, or Suspended'),
], validate, auditUpdate('users', 'users_id'), async (req, res) => {
  try {
    const { status } = req.body;
    // Prevent an admin from suspending themselves
    if (req.user && String(req.user.users_id) === String(req.params.id) && status === 'Suspended') {
      return res.status(400).json({ error: 'You cannot suspend your own account.' });
    }
    await db('users').where('users_id', req.params.id).update({ status, updated_at: db.fn.now() });
    const row = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .where('u.users_id', req.params.id)
      .first();
    resetDevUserCache();

    // Notify user of status change
    try {
      await notify({
        users_id: Number(req.params.id),
        type: status === 'Suspended' ? 'warning' : 'success',
        title: status === 'Suspended' ? 'Account Suspended' : 'Account Reactivated',
        message: status === 'Suspended'
          ? 'Your account has been suspended. Contact an administrator for assistance.'
          : 'Your account has been reactivated. You now have full access again.',
        entity_type: 'user',
        entity_id: Number(req.params.id),
        category: 'user_suspended',
      });
    } catch {}

    res.json(row);
  } catch (err) { safeError(res, err, 'users'); }
});

// DELETE /api/users/:id — Admin only
/**
 * DELETE /:id
 * Delete a user. Resets auth cache.
 * @auth Requires role: Admin
 * @returns { success: true }
 */
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('users', 'users_id'), auditDelete('users', 'users_id'), async (req, res) => {
  try {
    await db('users').where('users_id', req.params.id).del();
    resetDevUserCache();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'users'); }
});

module.exports = router;
