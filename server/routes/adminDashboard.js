/**
 * @file adminDashboard.js — Admin Dashboard API Routes — /api/admin-dashboard
 * System health, maintenance tools, and cascade entity purge.
 * All endpoints require Admin role.
 *
 * @module routes/adminDashboard
 */
/**
 * Admin Dashboard API
 * GET /api/admin-dashboard — aggregated system health & activity data
 */
const express = require('express');
const router  = express.Router();
const os      = require('os');
const v8      = require('v8');
const db      = require('../db');
const { requireRole } = require('../middleware/auth');
const { DEPS } = require('./_cascadeGuard');

/**
 * GET /
 * Aggregated admin dashboard: 23 parallel table counts, system stats (Node.js, OS, v8 heap), recent activity.
 * @returns Full admin dashboard payload
 */
router.get('/', requireRole('Admin'), async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);  weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

    // ── Run all queries in parallel ────────────────────────
    const [
      userStats,
      roleBreakdown,
      recentLogins,
      auditCountToday,
      auditCountWeek,
      auditCountMonth,
      auditByAction,
      auditByResource,
      recentAudit,
      emailStats,
      emailRecentFailed,
      emailCountWeek,
      notifStats,
      workflowStats,
      recentWorkflows,
      ticketStats,
      readerStats,
      exceptionStats,
      activeAnnouncements,
      savedReportCount,
      emailConfig,
      auditTimeline,
      topActiveUsers,
      activeSessions,
    ] = await Promise.all([
      // ── Users ──
      db('users')
        .select('status')
        .count('* as count')
        .groupBy('status'),

      db('users as u')
        .join('roles as r', 'u.roles_id', 'r.roles_id')
        .select('r.name as role', 'r.color')
        .count('* as count')
        .groupBy('r.name', 'r.color')
        .orderBy('count', 'desc'),

      db('users')
        .whereNotNull('last_login')
        .orderBy('last_login', 'desc')
        .limit(10)
        .select('users_id', 'display_name', 'email', 'last_login', 'status'),

      // ── Audit Log ──
      db('audit_log').where('created_at', '>=', today).count('* as c').first(),
      db('audit_log').where('created_at', '>=', weekAgo).count('* as c').first(),
      db('audit_log').where('created_at', '>=', monthAgo).count('* as c').first(),

      db('audit_log')
        .where('created_at', '>=', weekAgo)
        .select('action')
        .count('* as count')
        .groupBy('action'),

      db('audit_log')
        .where('created_at', '>=', weekAgo)
        .select('resource')
        .count('* as count')
        .groupBy('resource')
        .orderBy('count', 'desc')
        .limit(10),

      db('audit_log as a')
        .leftJoin('users as u', 'a.users_id', 'u.users_id')
        .select('a.audit_log_id', 'a.action', 'a.resource', 'a.resource_id',
                'a.created_at', 'u.display_name', 'a.ip_address')
        .orderBy('a.created_at', 'desc')
        .limit(20),

      // ── Email ──
      db('email_log')
        .select('status')
        .count('* as count')
        .groupBy('status'),

      db('email_log')
        .where('status', 'failed')
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('email_log_id', 'to_address', 'subject', 'error_message', 'created_at'),

      db('email_log')
        .where('created_at', '>=', weekAgo)
        .count('* as c')
        .first(),

      // ── Notifications ──
      db.raw(`
        SELECT
          COUNT(*) FILTER (WHERE is_read = false) AS unread,
          COUNT(*) FILTER (WHERE is_read = true)  AS read_count,
          COUNT(*) AS total
        FROM notifications
      `).then(r => r.rows?.[0] || {}),

      // ── Workflows ──
      db('workflow_runs')
        .select('status')
        .count('* as count')
        .groupBy('status'),

      db('workflow_runs as wr')
        .leftJoin('users as u', 'wr.triggered_by', 'u.users_id')
        .select('wr.workflow_runs_id', 'wr.workflow_name', 'wr.status',
                'wr.started_at', 'wr.finished_at', 'wr.error_message',
                'u.display_name as triggered_by_name')
        .orderBy('wr.started_at', 'desc')
        .limit(10),

      // ── Tickets ──
      db.raw(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('Open', 'In Progress', 'Pending Vendor', 'Pending Internal', 'On Hold', 'In Review')) AS open_count,
          COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS resolved_count,
          COUNT(*) FILTER (WHERE priority IN ('High', 'Critical')) AS high_priority,
          COUNT(*) AS total
        FROM tickets
      `).then(r => r.rows?.[0] || {}),

      // ── Invoice Reader ──
      db.raw(`
        SELECT
          COUNT(*) AS total_uploads,
          COALESCE(SUM(inserted_invoices), 0) AS total_invoices_created,
          COALESCE(SUM(error_count), 0) AS total_errors,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed
        FROM invoice_reader_uploads
      `).then(r => r.rows?.[0] || {}),

      // ── Exceptions ──
      db.raw(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open') AS open_count,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
          COUNT(*) FILTER (WHERE status = 'ignored') AS ignored_count,
          COUNT(*) AS total
        FROM invoice_reader_exceptions
      `).then(r => r.rows?.[0] || {}),

      // ── Announcements ──
      db('announcements').where('is_active', true).count('* as c').first(),

      // ── Saved Reports ──
      db('saved_reports').count('* as c').first(),

      // ── Email Config Status ──
      db('email_config').first().then(row => ({
        enabled: row?.enabled || false,
        host: row?.smtp_host || null,
      })),

      // ── Audit Timeline (last 14 days) ──
      db.raw(`
        SELECT date_trunc('day', created_at)::date AS day,
               COUNT(*) FILTER (WHERE action = 'CREATE') AS creates,
               COUNT(*) FILTER (WHERE action = 'UPDATE') AS updates,
               COUNT(*) FILTER (WHERE action = 'DELETE') AS deletes,
               COUNT(*) AS total
        FROM audit_log
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY 1 ORDER BY 1
      `).then(r => r.rows || []),

      // ── Top Active Users (last 7 days) ──
      db('audit_log as a')
        .join('users as u', 'a.users_id', 'u.users_id')
        .where('a.created_at', '>=', weekAgo)
        .select('u.display_name', 'u.email')
        .count('* as actions')
        .groupBy('u.display_name', 'u.email')
        .orderBy('actions', 'desc')
        .limit(8),

      // ── Active Sessions (activity within last 15 min) ──
      db.raw(`
        SELECT DISTINCT ON (u.users_id)
               u.users_id, u.display_name, u.email, u.avatar_url,
               r.name AS role_name, r.color AS role_color,
               a.created_at AS last_activity, a.resource, a.action,
               a.ip_address
        FROM audit_log a
        JOIN users u ON a.users_id = u.users_id
        JOIN roles r ON u.roles_id = r.roles_id
        WHERE a.created_at >= NOW() - INTERVAL '15 minutes'
        ORDER BY u.users_id, a.created_at DESC
      `).then(r => r.rows || []),
    ]);

    // ── Assemble ────────────────────────────────────────────
    const userStatusMap = {};
    userStats.forEach(s => { userStatusMap[s.status] = Number(s.count); });
    const totalUsers = Object.values(userStatusMap).reduce((a, b) => a + b, 0);

    const emailStatusMap = {};
    emailStats.forEach(s => { emailStatusMap[s.status] = Number(s.count); });

    const workflowStatusMap = {};
    workflowStats.forEach(s => { workflowStatusMap[s.status] = Number(s.count); });

    const auditActionMap = {};
    auditByAction.forEach(s => { auditActionMap[s.action] = Number(s.count); });

    res.json({
      users: {
        total: totalUsers,
        active: userStatusMap.Active || 0,
        inactive: userStatusMap.Inactive || 0,
        suspended: userStatusMap.Suspended || 0,
        roleBreakdown: roleBreakdown.map(r => ({
          role: r.role,
          color: r.color,
          count: Number(r.count),
        })),
        recentLogins,
      },
      audit: {
        today: Number(auditCountToday?.c || 0),
        week: Number(auditCountWeek?.c || 0),
        month: Number(auditCountMonth?.c || 0),
        byAction: auditActionMap,
        byResource: auditByResource.map(r => ({
          resource: r.resource,
          count: Number(r.count),
        })),
        recent: recentAudit,
        timeline: auditTimeline.map(r => ({
          day: r.day,
          creates: Number(r.creates),
          updates: Number(r.updates),
          deletes: Number(r.deletes),
          total: Number(r.total),
        })),
        topActiveUsers: topActiveUsers.map(r => ({
          name: r.display_name,
          email: r.email,
          actions: Number(r.actions),
        })),
      },
      email: {
        enabled: emailConfig.enabled,
        host: emailConfig.host,
        sent: emailStatusMap.sent || 0,
        pending: emailStatusMap.pending || 0,
        failed: emailStatusMap.failed || 0,
        weekVolume: Number(emailCountWeek?.c || 0),
        recentFailed: emailRecentFailed,
      },
      notifications: {
        total: Number(notifStats.total || 0),
        unread: Number(notifStats.unread || 0),
        read: Number(notifStats.read_count || 0),
      },
      workflows: {
        running: workflowStatusMap.running || 0,
        success: workflowStatusMap.success || 0,
        failed: workflowStatusMap.failed || 0,
        recent: recentWorkflows,
      },
      tickets: {
        open: Number(ticketStats.open_count || 0),
        resolved: Number(ticketStats.resolved_count || 0),
        highPriority: Number(ticketStats.high_priority || 0),
        total: Number(ticketStats.total || 0),
      },
      invoiceReader: {
        totalUploads: Number(readerStats.total_uploads || 0),
        invoicesCreated: Number(readerStats.total_invoices_created || 0),
        errors: Number(readerStats.total_errors || 0),
        completed: Number(readerStats.completed || 0),
        failed: Number(readerStats.failed || 0),
      },
      exceptions: {
        open: Number(exceptionStats.open_count || 0),
        resolved: Number(exceptionStats.resolved_count || 0),
        ignored: Number(exceptionStats.ignored_count || 0),
        total: Number(exceptionStats.total || 0),
      },
      announcements: {
        active: Number(activeAnnouncements?.c || 0),
      },
      reports: {
        saved: Number(savedReportCount?.c || 0),
      },
      activeSessions: activeSessions.map(s => ({
        userId: s.users_id,
        name: s.display_name,
        email: s.email,
        avatarUrl: s.avatar_url,
        role: s.role_name,
        roleColor: s.role_color,
        lastActivity: s.last_activity,
        lastResource: s.resource,
        lastAction: s.action,
        ipAddress: s.ip_address,
      })),
      system: {
        nodeVersion: process.version,
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        hostname: os.hostname(),
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        processMemory: {
          ...process.memoryUsage(),
          heapSizeLimit: v8.getHeapStatistics().heap_size_limit,
        },
        processUptime: process.uptime(),
        systemUptime: os.uptime(),
        loadAvg: os.loadavgs ? os.loadavgs() : os.loadavg(),
        pid: process.pid,
        env: process.env.NODE_ENV || 'development',
      },
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load admin dashboard' });
  }
});

// ── Database table statistics ──────────────────────────────
/**
 * GET /db-stats
 * PostgreSQL table sizes, row counts, dead rows, connection pool stats, migration history.
 * @returns { tableStats, pool, migrations }
 */
router.get('/db-stats', requireRole('Admin'), async (req, res) => {
  try {
    const tableStats = await db.raw(`
      SELECT
        relname                              AS table_name,
        n_live_tup                           AS row_count,
        pg_total_relation_size(quote_ident(relname)) AS total_bytes,
        pg_relation_size(quote_ident(relname))       AS data_bytes,
        pg_indexes_size(quote_ident(relname))        AS index_bytes,
        n_dead_tup                           AS dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(quote_ident(relname)) DESC
    `);

    const pool = db.client.pool;
    const poolStats = {
      used: pool.numUsed(),
      free: pool.numFree(),
      pending: pool.numPendingAcquires(),
      total: pool.numUsed() + pool.numFree(),
    };

    const migrations = await db('knex_migrations')
      .select('name', 'batch', 'migration_time')
      .orderBy('migration_time', 'desc');

    res.json({
      tables: tableStats.rows.map(t => ({
        name: t.table_name,
        rows: Number(t.row_count),
        totalBytes: Number(t.total_bytes),
        dataBytes: Number(t.data_bytes),
        indexBytes: Number(t.index_bytes),
        deadRows: Number(t.dead_rows),
        lastVacuum: t.last_vacuum || t.last_autovacuum || null,
        lastAnalyze: t.last_analyze,
      })),
      pool: poolStats,
      migrations,
    });
  } catch (err) {
    console.error('DB stats error:', err);
    res.status(500).json({ error: 'Failed to load database statistics' });
  }
});

// ── Data purge — delete old records from high-growth tables ─
/**
 * POST /purge
 * Time-based data purge for audit_log, email_log, notifications, workflow_runs. Minimum 7-day retention.
 * @body { target, olderThanDays }
 * @returns { deleted: number, target, olderThanDays }
 */
router.post('/purge', requireRole('Admin'), async (req, res) => {
  try {
    const { target, olderThanDays } = req.body;
    const days = parseInt(olderThanDays, 10);
    if (!target || !days || days < 7) {
      return res.status(400).json({ error: 'target and olderThanDays (>=7) are required' });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const allowedTargets = {
      audit_log:          { dateCol: 'created_at' },
      email_log:          { dateCol: 'created_at' },
      notifications:      { dateCol: 'created_at' },
      workflow_runs:      { dateCol: 'started_at' },
    };

    const cfg = allowedTargets[target];
    if (!cfg) return res.status(400).json({ error: `Invalid target. Allowed: ${Object.keys(allowedTargets).join(', ')}` });

    let deleted;
    if (target === 'workflow_runs') {
      // Cascade: delete steps first via the run IDs
      const runIds = await db('workflow_runs')
        .where(cfg.dateCol, '<', cutoff)
        .whereIn('status', ['success', 'failed'])
        .select('workflow_runs_id');
      const ids = runIds.map(r => r.workflow_runs_id);
      if (ids.length > 0) {
        await db('workflow_steps').whereIn('workflow_runs_id', ids).del();
      }
      deleted = await db('workflow_runs')
        .where(cfg.dateCol, '<', cutoff)
        .whereIn('status', ['success', 'failed'])
        .del();
    } else if (target === 'notifications') {
      deleted = await db('notifications')
        .where(cfg.dateCol, '<', cutoff)
        .where('is_read', true)
        .del();
    } else {
      deleted = await db(target).where(cfg.dateCol, '<', cutoff).del();
    }

    res.json({ target, olderThanDays: days, deleted });
  } catch (err) {
    console.error('Purge error:', err);
    res.status(500).json({ error: 'Purge failed' });
  }
});

// ── Retry failed emails ────────────────────────────────────
/**
 * POST /retry-emails
 * Re-send up to 20 failed emails with retry_count < 5.
 * @returns { retried: number, succeeded: number, failed: number, results: [] }
 */
router.post('/retry-emails', requireRole('Admin'), async (req, res) => {
  try {
    const emailService = require('../services/email');
    const failed = await db('email_log')
      .where('status', 'failed')
      .where('retry_count', '<', 5)
      .orderBy('created_at', 'desc')
      .limit(20)
      .select('email_log_id', 'to_address', 'subject', 'body', 'users_id', 'notifications_id');

    let retried = 0, succeeded = 0;
    for (const row of failed) {
      retried++;
      try {
        const result = await emailService.send({
          to: row.to_address,
          subject: row.subject,
          html: row.body,
          users_id: row.users_id,
          notifications_id: row.notifications_id,
        });
        if (result?.status === 'sent') succeeded++;
        // Mark the original row as superseded
        await db('email_log').where('email_log_id', row.email_log_id)
          .update({ status: 'retried', error_message: `Retried → new log row created` });
      } catch {
        // individual failure is fine, continue
      }
    }

    res.json({ retried, succeeded, failed: retried - succeeded });
  } catch (err) {
    console.error('Email retry error:', err);
    res.status(500).json({ error: 'Email retry failed' });
  }
});

// ── Entity cascade purge — preview & delete ─────────────────
// Allowed top-level entities for cascade purge
const PURGEABLE = {
  vendors:   { pk: 'vendors_id',   label: 'Vendor',    nameCol: 'name',             naturalKey: 'name' },
  invoices:  { pk: 'invoices_id',  label: 'Invoice',   nameCol: 'invoice_number',   naturalKey: 'invoice_number' },
  inventory: { pk: 'inventory_id', label: 'Inventory',  nameCol: 'inventory_number', naturalKey: 'inventory_number' },
};

/**
 * Recursively count all dependent records for a given entity/id.
 * Returns an array of { table, label, fk, count } — deepest children first.
 */
async function collectDependencies(table, pk, id, visited = new Set()) {
  const key = `${table}:${id}`;
  if (visited.has(key)) return [];
  visited.add(key);

  const deps = DEPS[table] || [];
  const results = [];

  for (const dep of deps) {
    const exists = await db.schema.hasTable(dep.table);
    if (!exists) continue;

    const rows = await db(dep.table).where(dep.fk, id).select(`${dep.table}_id`);
    if (rows.length === 0) continue;

    // Recurse into each child's dependents
    const childPk = `${dep.table}_id`;
    for (const row of rows) {
      const childDeps = await collectDependencies(dep.table, childPk, row[childPk], visited);
      results.push(...childDeps);
    }

    results.push({
      table: dep.table,
      label: dep.label,
      fk: dep.fk,
      count: rows.length,
      parentTable: table,
      parentId: id,
    });
  }

  return results;
}

/**
 * Recursively delete all dependent records for a given entity/id.
 * Deletes deepest children first (post-order traversal).
 */
async function cascadeDelete(trx, table, pk, id, visited = new Set()) {
  const key = `${table}:${id}`;
  if (visited.has(key)) return 0;
  visited.add(key);

  const deps = DEPS[table] || [];
  let totalDeleted = 0;

  for (const dep of deps) {
    const exists = await trx.schema.hasTable(dep.table);
    if (!exists) continue;

    const childPk = `${dep.table}_id`;
    const rows = await trx(dep.table).where(dep.fk, id).select(childPk);

    // Recurse into grandchildren first
    for (const row of rows) {
      totalDeleted += await cascadeDelete(trx, dep.table, childPk, row[childPk], visited);
    }

    // Now delete the children
    const deleted = await trx(dep.table).where(dep.fk, id).del();
    totalDeleted += deleted;
  }

  return totalDeleted;
}

// GET /api/admin-dashboard/purge-preview/:entity/:id
/**
 * GET /purge-preview/:entity/:id
 * Preview cascading dependencies for a vendor/invoice/inventory item before deletion.
 * @returns { id, entity, name, label, dependencies: [], totalDependentRecords }
 */
router.get('/purge-preview/:entity/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { entity, id } = req.params;
    const cfg = PURGEABLE[entity];
    if (!cfg) return res.status(400).json({ error: `Invalid entity. Allowed: ${Object.keys(PURGEABLE).join(', ')}` });

    // Try numeric PK first, then fall back to natural key (invoice_number, inventory_number, name)
    const numericId = parseInt(id, 10);
    let record;
    let recordId;
    if (numericId && String(numericId) === String(id)) {
      record = await db(entity).where(cfg.pk, numericId).first();
      recordId = numericId;
    }
    if (!record && cfg.naturalKey) {
      record = await db(entity).where(cfg.naturalKey, id).first();
      if (record) recordId = record[cfg.pk];
    }
    if (!record) {
      // Check other entity types for a helpful suggestion
      const suggestions = [];
      for (const [otherEntity, otherCfg] of Object.entries(PURGEABLE)) {
        if (otherEntity === entity) continue;
        const otherNum = parseInt(id, 10);
        let found = false;
        if (otherNum && String(otherNum) === String(id)) {
          found = !!(await db(otherEntity).where(otherCfg.pk, otherNum).first());
        }
        if (!found && otherCfg.naturalKey) {
          found = !!(await db(otherEntity).where(otherCfg.naturalKey, id).first());
        }
        if (found) suggestions.push(otherCfg.label);
      }
      const hint = suggestions.length
        ? ` — found as ${suggestions.join(' / ')} (switch entity type)`
        : '';
      return res.status(404).json({ error: `${cfg.label} "${id}" not found${hint}` });
    }

    // Collect all dependencies recursively
    const dependencies = await collectDependencies(entity, cfg.pk, recordId);

    // Deduplicate by table (sum counts)
    const summaryMap = new Map();
    for (const dep of dependencies) {
      const existing = summaryMap.get(dep.table);
      if (existing) {
        existing.count += dep.count;
      } else {
        summaryMap.set(dep.table, { table: dep.table, label: dep.label, count: dep.count });
      }
    }

    const summary = [...summaryMap.values()].sort((a, b) => b.count - a.count);
    const totalRecords = summary.reduce((sum, d) => sum + d.count, 0);

    res.json({
      entity,
      id: recordId,
      name: record[cfg.nameCol] || record.display_name || `#${recordId}`,
      label: cfg.label,
      dependencies: summary,
      totalDependentRecords: totalRecords,
    });
  } catch (err) {
    console.error('Purge preview error:', err);
    res.status(500).json({ error: 'Failed to generate purge preview' });
  }
});

// DELETE /api/admin-dashboard/purge-entity/:entity/:id
/**
 * DELETE /purge-entity/:entity/:id
 * Execute cascade delete of an entity and all dependent records in a transaction.
 * @returns { success, entity, id, name, label, dependentsDeleted, details }
 */
router.delete('/purge-entity/:entity/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { entity, id } = req.params;
    const cfg = PURGEABLE[entity];
    if (!cfg) return res.status(400).json({ error: `Invalid entity. Allowed: ${Object.keys(PURGEABLE).join(', ')}` });

    // Try numeric PK first, then fall back to natural key (invoice_number, inventory_number, name)
    const numericId = parseInt(id, 10);
    let record;
    let recordId;
    if (numericId && String(numericId) === String(id)) {
      record = await db(entity).where(cfg.pk, numericId).first();
      recordId = numericId;
    }
    if (!record && cfg.naturalKey) {
      record = await db(entity).where(cfg.naturalKey, id).first();
      if (record) recordId = record[cfg.pk];
    }
    if (!record) return res.status(404).json({ error: `${cfg.label} "${id}" not found` });

    const name = record[cfg.nameCol] || record.display_name || `#${recordId}`;

    // Run everything in a transaction
    const result = await db.transaction(async (trx) => {
      const dependentsDeleted = await cascadeDelete(trx, entity, cfg.pk, recordId);
      await trx(entity).where(cfg.pk, recordId).del();
      return dependentsDeleted;
    });

    // Audit log the purge
    try {
      await db('audit_log').insert({
        users_id: req.user?.users_id || null,
        action: 'DELETE',
        resource: entity,
        resource_id: recordId,
        old_values: JSON.stringify({ name, cascade_deleted: result }),
        ip_address: req.ip,
      });
    } catch { /* audit failure should not block */ }

    res.json({
      success: true,
      entity,
      id: recordId,
      name,
      dependentsDeleted: result,
    });
  } catch (err) {
    console.error('Purge entity error:', err);
    res.status(500).json({ error: `Failed to purge ${req.params.entity}: ${err.message}` });
  }
});

module.exports = router;
