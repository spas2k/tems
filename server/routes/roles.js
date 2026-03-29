/**
 * @file roles.js — Roles API Routes — /api/roles
 * Role management and permission assignment.
 * Admin-only. Resets auth cache on permission changes.
 *
 * @module routes/roles
 */
// ============================================================
// Roles & Permissions API Routes
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { requireRole, requirePermission, resetDevUserCache } = require('../middleware/auth');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

// GET /api/roles — list all roles with permission count and user count
/**
 * GET /
 * List all roles with user count and permission count.
 * @returns Array of role objects with userCount, permissionCount
 */
router.get('/', requirePermission('roles', 'read'), async (req, res) => {
  try {
    const rows = await db('roles as r')
      .leftJoin(
        db('role_permissions').select('roles_id').count('* as perm_count').groupBy('roles_id').as('rp'),
        'r.roles_id', 'rp.roles_id'
      )
      .leftJoin(
        db('users').select('roles_id').count('* as usr_count').groupBy('roles_id').as('uc'),
        'r.roles_id', 'uc.roles_id'
      )
      .select('r.*', db.raw('COALESCE(rp.perm_count, 0) as permission_count'), db.raw('COALESCE(uc.usr_count, 0) as user_count'))
      .orderBy('r.roles_id');
    res.json(rows);
  } catch (err) { safeError(res, err, 'roles'); }
});

// GET /api/permissions — list all permissions
router.get('/permissions/all', requirePermission('roles', 'read'), async (req, res) => {
  try {
    const rows = await db('permissions').orderBy('resource').orderBy('action');
    res.json(rows);
  } catch (err) { safeError(res, err, 'permissions'); }
});

// GET /api/audit-log — paginated
router.get('/audit-log', requirePermission('roles', 'read'), async (req, res) => {
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

// GET /api/roles/audit-log/resource/:resource/:id — history for a specific record
router.get('/audit-log/resource/:resource/:id', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
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

// GET /api/roles/:id — role detail with permissions
/**
 * GET /:id
 * Get a single role with its full permissions list.
 * @returns Role object with permissions array
 */
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

// GET /api/roles/:id/users — all users assigned to this role
router.get('/:id/users', idParam, validate, async (req, res) => {
  try {
    const rows = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .leftJoin(
        db('audit_log')
          .select('users_id')
          .max('created_at as last_action_at')
          .groupBy('users_id')
          .as('al'),
        'u.users_id', 'al.users_id'
      )
      .where('u.roles_id', req.params.id)
      .select(
        'u.users_id', 'u.display_name', 'u.email', 'u.status',
        'u.last_login', 'u.created_at', 'u.avatar_url',
        'r.name as role_name',
        'al.last_action_at'
      )
      .orderBy('u.display_name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'roles'); }
});

// POST /api/roles — Admin only
/**
 * POST /
 * Create a new role with permissions.
 * @auth Requires role: Admin
 * @body name, description, color, permissions: [{ resource, action }]
 * @returns 201 with created role + permissions
 */
router.post('/', requireRole('Admin'), [
  require('express-validator').body('name').trim().notEmpty().withMessage('Role name required').isLength({ max: 60 }),
  require('express-validator').body('description').optional().trim().isLength({ max: 255 }),
  require('express-validator').body('color').optional().trim().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a valid hex color'),
  require('express-validator').body('permission_ids').optional().isArray(),
], validate, auditCreate('roles', 'roles_id'), async (req, res) => {
  try {
    const { name, description, color, permission_ids } = req.body;
    const id = await db.insertReturningId('roles', { name, description, color: color || null });

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
/**
 * PUT /:id
 * Update a role and its permissions. Resets auth cache.
 * @auth Requires role: Admin
 * @body Same as POST
 * @returns Updated role + permissions
 */
router.put('/:id', requireRole('Admin'), idParam, [
  require('express-validator').body('name').trim().notEmpty().withMessage('Role name required').isLength({ max: 60 }),
  require('express-validator').body('description').optional().trim().isLength({ max: 255 }),
  require('express-validator').body('color').optional().trim().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a valid hex color'),
  require('express-validator').body('permission_ids').optional().isArray(),
], validate, auditUpdate('roles', 'roles_id'), async (req, res) => {
  try {
    const { name, description, color, permission_ids } = req.body;
    const update = { name, description };
    if (color !== undefined) update.color = color || null;
    await db('roles').where('roles_id', req.params.id).update(update);

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
/**
 * DELETE /:id
 * Delete a role. Blocked if users are assigned to it.
 * @auth Requires role: Admin
 * @returns { success: true } or 409
 */
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

module.exports = router;
