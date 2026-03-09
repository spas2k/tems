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

const userRules = [
  body('email').trim().isEmail().withMessage('Valid email required').isLength({ max: 255 }),
  body('display_name').trim().notEmpty().withMessage('Display name required').isLength({ max: 120 }),
  body('roles_id').notEmpty().withMessage('Role is required').isInt({ min: 1 }),
  body('status').optional().isIn(['Active', 'Inactive', 'Suspended']).withMessage('Status must be Active, Inactive, or Suspended'),
  body('sso_subject').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 255 }),
  body('sso_provider').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 80 }),
];

// GET /api/users — list all users with role name
router.get('/', async (req, res) => {
  try {
    const rows = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .orderBy('u.display_name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'users'); }
});

// GET /api/users/demo-users — list the three switchable demo personas (dev mode only)
// Must be defined BEFORE /:id so it isn't swallowed by that route.
router.get('/demo-users', async (req, res) => {
  if ((process.env.AUTH_MODE || 'dev') === 'sso') {
    return res.status(404).json({ error: 'Not available in production mode' });
  }
  try {
    const rows = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.users_id', 'u.display_name', 'u.email', 'r.name as role_name')
      .whereIn('u.email', ['admin@tems.local', 'manager@tems.local', 'viewer@tems.local'])
      .orderBy('u.users_id');
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

    if (!user) return res.status(404).json({ error: 'User not found' });

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
      .leftJoin('accounts as a', 'o.accounts_id', 'a.accounts_id')
      .select('o.orders_id', 'o.order_number', 'o.order_date',
              'o.status', 'a.name as account_name')
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
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'users'); }
});

// PUT /api/users/:id — Admin only
router.put('/:id', requireRole('Admin'), idParam, ...userRules, validate, auditUpdate('users', 'users_id'), async (req, res) => {
  try {
    const { email, display_name, roles_id, status, sso_subject, sso_provider } = req.body;
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
    res.json(row);
  } catch (err) { safeError(res, err, 'users'); }
});

// DELETE /api/users/:id — Admin only
router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('users', 'users_id'), auditDelete('users', 'users_id'), async (req, res) => {
  try {
    await db('users').where('users_id', req.params.id).del();
    resetDevUserCache();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'users'); }
});

module.exports = router;
