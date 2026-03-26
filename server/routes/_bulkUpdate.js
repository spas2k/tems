const db = require('../db');
const safeError = require('./_safeError');

/**
 * Factory: returns an Express handler for PATCH /<resource>/bulk
 *
 * @param {string} table      – DB table name, e.g. 'vendors'
 * @param {string} idColumn   – Primary key column, e.g. 'vendors_id'
 * @param {Object} [opts]
 * @param {string[]} opts.allowed  – Whitelist of updatable column names.
 *                                   If omitted, all keys in `updates` are sent (still strips id column).
 */
module.exports = function bulkUpdate(table, idColumn, opts = {}) {
  return async (req, res) => {
    try {
      const { ids, updates } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids must be a non-empty array' });
      }
      if (ids.length > 500) {
        return res.status(400).json({ error: 'Cannot bulk-update more than 500 records at once' });
      }
      // Validate all ids are positive integers
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        return res.status(400).json({ error: 'All ids must be positive integers' });
      }
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res.status(400).json({ error: 'updates must be a non-empty object' });
      }

      // Build clean payload — strip id column, __proto__, constructor
      const forbidden = new Set([idColumn, '__proto__', 'constructor', 'prototype', 'created_at']);
      const clean = {};
      for (const [key, value] of Object.entries(updates)) {
        if (forbidden.has(key)) continue;
        if (opts.allowed && !opts.allowed.includes(key)) continue;
        // Only include fields that were explicitly set (not undefined)
        if (value !== undefined) {
          clean[key] = value === '' ? null : value;
        }
      }

      if (Object.keys(clean).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Add updated_at if the table has the column
      try {
        const hasUpdatedAt = await db.schema.hasColumn(table, 'updated_at');
        if (hasUpdatedAt) clean.updated_at = new Date().toISOString();
      } catch { /* skip if schema check fails */ }

      const count = await db(table)
        .whereIn(idColumn, ids)
        .update(clean);

      // Audit log entry for bulk update
      if (req.user) {
        try {
          await db('audit_log').insert({
            user_id: req.user.users_id,
            action: 'BULK_UPDATE',
            resource: table,
            detail: JSON.stringify({
              ids,
              fields: Object.keys(clean).filter(k => k !== 'updated_at'),
              count,
            }),
          });
        } catch { /* audit failure is non-fatal */ }
      }

      res.json({ updated: count });
    } catch (err) {
      safeError(res, err, table);
    }
  };
};
