// ============================================================
// Roles & Permissions API Routes
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { requireRole, resetDevUserCache } = require('../middleware/auth');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// GET /api/roles — list all roles with permission count (Admin+)
router.get('/', requireRole('Admin'), async (req, res) => {
  try {
    const rows = await db('roles as r')
      .leftJoin(
        db('role_permissions').select('roles_id').count('* as perm_count').groupBy('roles_id').as('rp'),
        'r.roles_id', 'rp.roles_id'
      )
      .select('r.*', db.raw('COALESCE(rp.perm_count, 0) as permission_count'))
      .orderBy('r.roles_id');
    res.json(rows);
  } catch (err) { safeError(res, err, 'roles'); }
});

// GET /api/roles/:id — role detail with permissions
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const role = await db('roles').where('roles_id', req.params.id).first();
    if (!role) return res.status(404).json({ error: 'Not found' });

    const permissions = await db('role_permissions as rp')
      .join('permissions as p', 'rp.permissions_id', 'p.permissions_id')
      .where('rp.roles_id', req.params.id)
      .select('p.*');
    role.permissions = permissions;
    res.json(role);
  } catch (err) { safeError(res, err, 'roles'); }
});

// GET /api/permissions — list all permissions (Admin+)
router.get('/permissions/all', requireRole('Admin'), async (req, res) => {
  try {
    const rows = await db('permissions').orderBy('resource').orderBy('action');
    res.json(rows);
  } catch (err) { safeError(res, err, 'permissions'); }
});

// POST /api/roles — Admin only
router.post('/', requireRole('Admin'), [
  require('express-validator').body('name').trim().notEmpty().withMessage('Role name required').isLength({ max: 60 }),
  require('express-validator').body('description').optional().trim().isLength({ max: 255 }),
  require('express-validator').body('permission_ids').optional().isArray(),
], validate, auditCreate('roles', 'roles_id'), async (req, res) => {
  try {
    const { name, description, permission_ids } = req.body;
    const id = await db.insertReturningId('roles', { name, description });

    // Assign permissions if provided
    if (permission_ids && permission_ids.length) {
      const inserts = permission_ids.map(pid => ({ roles_id: id, permissions_id: pid }));
      await db('role_permissions').insert(inserts);
    }

    const role = await db('roles').where('roles_id', id).first();
    const permissions = await db('role_permissions as rp')
      .join('permissions as p', 'rp.permissions_id', 'p.permissions_id')
      .where('rp.roles_id', id)
      .select('p.*');
    role.permissions = permissions;
    resetDevUserCache();
    res.status(201).json(role);
  } catch (err) { safeError(res, err, 'roles'); }
});

// PUT /api/roles/:id — Admin only
router.put('/:id', requireRole('Admin'), idParam, [
  require('express-validator').body('name').trim().notEmpty().withMessage('Role name required').isLength({ max: 60 }),
  require('express-validator').body('description').optional().trim().isLength({ max: 255 }),
  require('express-validator').body('permission_ids').optional().isArray(),
], validate, auditUpdate('roles', 'roles_id'), async (req, res) => {
  try {
    const { name, description, permission_ids } = req.body;
    await db('roles').where('roles_id', req.params.id).update({ name, description });

    // Replace permissions if provided
    if (permission_ids !== undefined) {
      await db('role_permissions').where('roles_id', req.params.id).del();
      if (permission_ids.length) {
        const inserts = permission_ids.map(pid => ({ roles_id: req.params.id, permissions_id: pid }));
        await db('role_permissions').insert(inserts);
      }
    }

    const role = await db('roles').where('roles_id', req.params.id).first();
    const permissions = await db('role_permissions as rp')
      .join('permissions as p', 'rp.permissions_id', 'p.permissions_id')
      .where('rp.roles_id', req.params.id)
      .select('p.*');
    role.permissions = permissions;
    resetDevUserCache();
    res.json(role);
  } catch (err) { safeError(res, err, 'roles'); }
});

// DELETE /api/roles/:id — Admin only, cannot delete if users assigned
router.delete('/:id', requireRole('Admin'), idParam, validate, auditDelete('roles', 'roles_id'), async (req, res) => {
  try {
    const usersWithRole = await db('users').where('roles_id', req.params.id).count('* as cnt').first();
    if (Number(usersWithRole.cnt) > 0) {
      return res.status(409).json({
        error: 'Cannot delete role',
        message: `${usersWithRole.cnt} user(s) are assigned to this role. Reassign them first.`,
      });
    }
    await db('role_permissions').where('roles_id', req.params.id).del();
    await db('roles').where('roles_id', req.params.id).del();
    resetDevUserCache();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'roles'); }
});

// GET /api/roles/audit-log/resource/:resource/:id — history for a specific record
// Accessible to any authenticated user (they already have access to that record).
router.get('/audit-log/resource/:resource/:id', async (req, res) => {
  try {
    const { resource, id } = req.params;

    // Whitelist to prevent enumeration attacks via arbitrary table names
    const ALLOWED_RESOURCES = new Set([
      'accounts', 'inventory', 'contracts', 'disputes', 'invoices',
      'orders', 'usoc_codes', 'locations', 'vendor_remit', 'roles', 'users',
      'field_catalog', 'spend_categories', 'announcements', 'allocations',
      'contract_rates', 'cost_savings', 'tickets',
    ]);
    if (!ALLOWED_RESOURCES.has(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }
    const resourceId = parseInt(id, 10);
    if (!Number.isFinite(resourceId) || resourceId <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const rows = await db('audit_log as al')
      .leftJoin('users as u', 'al.users_id', 'u.users_id')
      .select('al.*', 'u.display_name', 'u.email')
      .where('al.resource', resource)
      .where('al.resource_id', resourceId)
      .orderBy('al.created_at', 'desc');

    res.json(rows);
  } catch (err) { safeError(res, err, 'audit_log'); }
});

// GET /api/audit-log — Admin only, paginated
router.get('/audit-log', requireRole('Admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      db('audit_log as al')
        .leftJoin('users as u', 'al.users_id', 'u.users_id')
        .select('al.*', 'u.display_name', 'u.email')
        .orderBy('al.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('audit_log').count('* as total').first(),
    ]);

    res.json({
      data: rows,
      pagination: { page, limit, total: Number(countResult.total) },
    });
  } catch (err) { safeError(res, err, 'audit_log'); }
});

module.exports = router;
