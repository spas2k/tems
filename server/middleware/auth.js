// ============================================================
// Auth Middleware — Session & Role Enforcement
// ============================================================
//
// DEV MODE (AUTH_MODE=dev or unset):
//   Automatically attaches the first Admin user from the DB
//   to every request. No login required.
//
// SSO MODE (AUTH_MODE=sso):
//   Reads a JWT from the Authorization header (Bearer token).
//   Validates it against SSO_ISSUER / SSO_AUDIENCE.
//   Maps the token's `sub` claim to a local user via sso_subject.
//
// ── Future SSO transition checklist ──────────────────────
//   1. Set AUTH_MODE=sso in .env
//   2. Set SSO_ISSUER, SSO_AUDIENCE, SSO_JWKS_URI in .env
//   3. Install: npm install jsonwebtoken jwks-rsa
//   4. Uncomment the SSO block in authenticate() below
//   5. Register users with sso_subject matching IdP "sub" claim
// ============================================================

const db = require('../db');

// ── Default admin cache ──────────────────────────────────
let _devUser = null;
let _devUserLoaded = false;

// ── Per-user cache for demo impersonation ────────────────
// Keyed by users_id (string). Cleared by resetDevUserCache().
const _userCache = {};

/**
 * Load and cache the default dev/admin user from DB.
 */
async function getDevUser() {
  if (_devUserLoaded) return _devUser;
  try {
    const adminRole = await db('roles').where('name', 'Admin').first();
    if (adminRole) {
      _devUser = await db('users')
        .where('roles_id', adminRole.roles_id)
        .where('status', 'Active')
        .first();
    }
    if (_devUser) {
      const perms = await db('role_permissions as rp')
        .join('permissions as p', 'rp.permissions_id', 'p.permissions_id')
        .where('rp.roles_id', _devUser.roles_id)
        .select('p.resource', 'p.action');
      _devUser.permissions = perms.map(p => `${p.resource}:${p.action}`);
      _devUser.role_name = adminRole.name;
    }
  } catch {
    _devUser = null;
  }
  _devUserLoaded = true;
  return _devUser;
}

/**
 * Load a specific user by ID (for demo impersonation).
 * Results are cached; cache is cleared by resetDevUserCache().
 */
async function getUserById(userId) {
  const key = String(userId);
  if (_userCache[key]) return _userCache[key];
  try {
    const user = await db('users as u')
      .leftJoin('roles as r', 'u.roles_id', 'r.roles_id')
      .select('u.*', 'r.name as role_name')
      .where('u.users_id', userId)
      .where('u.status', 'Active')
      .first();
    if (user) {
      const perms = await db('role_permissions as rp')
        .join('permissions as p', 'rp.permissions_id', 'p.permissions_id')
        .where('rp.roles_id', user.roles_id)
        .select('p.resource', 'p.action');
      user.permissions = perms.map(p => `${p.resource}:${p.action}`);
      _userCache[key] = user;
    }
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Middleware: attach req.user with { users_id, email, display_name, role_name, permissions }
 *
 * In dev mode: honours the X-Dev-User-Id header so the frontend can
 * impersonate a specific demo user without restarting the server.
 */
async function authenticate(req, res, next) {
  const mode = process.env.AUTH_MODE || 'dev';

  if (mode === 'dev') {
    // ── DEV BYPASS (with optional impersonation) ────────
    const impersonateId = req.headers['x-dev-user-id'];
    let user = null;

    if (impersonateId) {
      user = await getUserById(impersonateId);
    }
    if (!user) {
      user = await getDevUser();
    }

    req.user = user || {
      users_id: null,
      email: 'anonymous@dev',
      display_name: 'Dev User',
      role_name: 'Admin',
      permissions: ['*'],
    };
    return next();
  }

  // ── SSO MODE ───────────────────────────────────────────
  // Uncomment this block when SSO is configured:
  //
  // const jwt = require('jsonwebtoken');
  // const jwksClient = require('jwks-rsa');
  //
  // const authHeader = req.headers.authorization;
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return res.status(401).json({ error: 'Authentication required' });
  // }
  // const token = authHeader.split(' ')[1];
  //
  // try {
  //   // Decode header to get kid
  //   const decoded = jwt.decode(token, { complete: true });
  //   const client = jwksClient({ jwksUri: process.env.SSO_JWKS_URI });
  //   const key = await client.getSigningKey(decoded.header.kid);
  //
  //   const payload = jwt.verify(token, key.getPublicKey(), {
  //     issuer: process.env.SSO_ISSUER,
  //     audience: process.env.SSO_AUDIENCE,
  //   });
  //
  //   // Map SSO subject to local user
  //   const user = await db('users')
  //     .join('roles', 'users.roles_id', 'roles.roles_id')
  //     .where('users.sso_subject', payload.sub)
  //     .where('users.status', 'Active')
  //     .select('users.*', 'roles.name as role_name')
  //     .first();
  //
  //   if (!user) {
  //     return res.status(403).json({ error: 'User not found or inactive. Contact your administrator.' });
  //   }
  //
  //   // Load permissions
  //   const perms = await db('role_permissions as rp')
  //     .join('permissions as p', 'rp.permissions_id', 'p.permissions_id')
  //     .where('rp.roles_id', user.roles_id)
  //     .select('p.resource', 'p.action');
  //   user.permissions = perms.map(p => `${p.resource}:${p.action}`);
  //
  //   req.user = user;
  //   return next();
  // } catch (err) {
  //   console.error('SSO token validation failed:', err.message);
  //   return res.status(401).json({ error: 'Invalid or expired token' });
  // }

  // If SSO mode is set but code is still commented out:
  return res.status(501).json({ error: 'SSO authentication not yet configured' });
}

/**
 * Middleware factory: require a specific permission.
 * Usage: requirePermission('accounts', 'delete')
 */
function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const perms = req.user.permissions || [];
    // Wildcard (dev fallback) or explicit match
    if (perms.includes('*') || perms.includes(`${resource}:${action}`)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `You do not have permission to ${action} ${resource}.`,
    });
  };
}

/**
 * Middleware factory: require one of the listed roles.
 * Usage: requireRole('Admin', 'Manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.includes(req.user.role_name)) {
      return next();
    }
    return res.status(403).json({
      error: 'Forbidden',
      message: `This action requires one of these roles: ${roles.join(', ')}`,
    });
  };
}

/**
 * Reset cached dev user (call after user/role changes).
 * Also clears the per-user impersonation cache.
 */
function resetDevUserCache() {
  _devUser = null;
  _devUserLoaded = false;
  Object.keys(_userCache).forEach(k => delete _userCache[k]);
}

module.exports = { authenticate, requirePermission, requireRole, resetDevUserCache };

// nodemon trigger
