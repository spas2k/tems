// ============================================================
// Audit Logger Middleware
// Records CREATE, UPDATE, DELETE operations to the audit_log table.
//
// Usage in route files:
//   const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
//
//   router.post('/', ..., auditCreate('accounts', 'accounts_id'), async (req, res) => { ... });
//   router.put('/:id', ..., auditUpdate('accounts', 'accounts_id'), async (req, res) => { ... });
//   router.delete('/:id', ..., auditDelete('accounts', 'accounts_id'), async (req, res) => { ... });
//
// Each helper wraps res.json/res.status to intercept the response and
// log the action AFTER the route handler succeeds.
// ============================================================

const db = require('../db');

// Fields that must never be stored verbatim in audit logs
const SENSITIVE_KEYS = new Set(['routing_number', 'bank_account_number', 'password', 'token', 'secret']);

function scrubSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const key of SENSITIVE_KEYS) {
    if (key in out) out[key] = '[REDACTED]';
  }
  return out;
}

/**
 * Write an audit record.
 */
async function writeAuditLog({ userId, action, resource, resourceId, oldValues, newValues, ip }) {
  try {
    await db('audit_log').insert({
      users_id: userId || null,
      action,
      resource,
      resource_id: resourceId || null,
      old_values: oldValues ? JSON.stringify(scrubSensitive(oldValues)) : null,
      new_values: newValues ? JSON.stringify(scrubSensitive(newValues)) : null,
      ip_address: ip || null,
    });
  } catch (err) {
    // Never let audit failures break the request
    console.error('Audit log write failed:', err.message);
  }
}

/**
 * Audit middleware for CREATE (POST) routes.
 * Logs new_values from the response body after successful creation.
 *
 * @param {string} resource  - Table name (e.g. 'accounts')
 * @param {string} idKey     - PK column (e.g. 'accounts_id')
 */
function auditCreate(resource, idKey) {
  return (req, res, next) => {
    const origJson = res.json.bind(res);
    res.json = function (body) {
      // Only audit on 2xx
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = body?.[idKey] || null;
        writeAuditLog({
          userId: req.user?.users_id,
          action: 'CREATE',
          resource,
          resourceId,
          oldValues: null,
          newValues: body,
          ip: req.ip,
        });
      }
      return origJson(body);
    };
    next();
  };
}

/**
 * Audit middleware for UPDATE (PUT) routes.
 * Captures old values before the handler runs, logs diff after success.
 *
 * @param {string} resource  - Table name
 * @param {string} idKey     - PK column
 */
function auditUpdate(resource, idKey) {
  return async (req, res, next) => {
    // Capture current state before update
    let oldRecord = null;
    try {
      const id = req.params.id;
      if (id) {
        oldRecord = await db(resource).where(idKey, id).first();
      }
    } catch { /* ignore */ }

    const origJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.id || body?.[idKey] || null;
        writeAuditLog({
          userId: req.user?.users_id,
          action: 'UPDATE',
          resource,
          resourceId: Number(resourceId) || null,
          oldValues: oldRecord,
          newValues: body,
          ip: req.ip,
        });
      }
      return origJson(body);
    };
    next();
  };
}

/**
 * Audit middleware for DELETE routes.
 * Captures the record before deletion.
 *
 * @param {string} resource  - Table name
 * @param {string} idKey     - PK column
 */
function auditDelete(resource, idKey) {
  return async (req, res, next) => {
    let oldRecord = null;
    try {
      const id = req.params.id;
      if (id) {
        oldRecord = await db(resource).where(idKey, id).first();
      }
    } catch { /* ignore */ }

    const origJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        writeAuditLog({
          userId: req.user?.users_id,
          action: 'DELETE',
          resource,
          resourceId: Number(req.params.id) || null,
          oldValues: oldRecord,
          newValues: null,
          ip: req.ip,
        });
      }
      return origJson(body);
    };
    next();
  };
}

module.exports = { writeAuditLog, auditCreate, auditUpdate, auditDelete };
