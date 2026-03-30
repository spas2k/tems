/**
 * @file reportJobs.js — Report Export Jobs API — /api/report-jobs
 * Manages background report export jobs: create, list, status, download.
 *
 * @module routes/reportJobs
 */
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const db       = require('../db');
const safeError = require('./_safeError');
const { requirePermission } = require('../middleware/auth');
const { processJob, cleanupOldExports, EXPORT_DIR, MAX_ROWS } = require('../services/reportExporter');

/**
 * POST / — Create a new background export job.
 * @body { name, config, format ('csv'|'xlsx'), emailTo? }
 */
router.post('/', requirePermission('reports', 'read'), async (req, res) => {
  try {
    const { name, config, format, emailTo } = req.body;
    if (!config || !config.tableKey) return res.status(400).json({ error: 'Invalid report config' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Report name is required' });

    const fmt = (format === 'xlsx') ? 'xlsx' : 'csv';

    const jobId = await db.insertReturningId('report_jobs', {
      users_id:  req.user?.users_id || null,
      name:      name.trim().slice(0, 200),
      config:    JSON.stringify(config),
      format:    fmt,
      status:    'queued',
      row_limit: MAX_ROWS,
      email_to:  emailTo ? String(emailTo).trim().slice(0, 500) : null,
    });

    const job = await db('report_jobs').where('report_jobs_id', jobId).first();
    res.status(201).json(job);

    // Process in background (non-blocking)
    setImmediate(async () => {
      try {
        await processJob(jobId);
      } catch (err) {
        console.error(`Report job ${jobId} failed:`, err.message);
      }
    });
  } catch (err) { safeError(res, err, 'report-jobs'); }
});

/**
 * GET / — List the current user's export jobs (most recent first).
 */
router.get('/', requirePermission('reports', 'read'), async (req, res) => {
  try {
    const rows = await db('report_jobs')
      .where('users_id', req.user?.users_id)
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json(rows);
  } catch (err) { safeError(res, err, 'report-jobs'); }
});

/**
 * GET /:id — Get a single job's status.
 */
router.get('/:id', requirePermission('reports', 'read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const job = await db('report_jobs').where('report_jobs_id', id).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Only allow own jobs or admin
    if (job.users_id !== req.user?.users_id && req.user?.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(job);
  } catch (err) { safeError(res, err, 'report-jobs'); }
});

/**
 * GET /:id/download — Download the generated file.
 */
router.get('/:id/download', requirePermission('reports', 'read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const job = await db('report_jobs').where('report_jobs_id', id).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (job.users_id !== req.user?.users_id && req.user?.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (job.status !== 'completed' || !job.file_path) {
      return res.status(404).json({ error: 'File not available' });
    }

    const filePath = path.join(EXPORT_DIR, path.basename(job.file_path));
    if (!filePath.startsWith(path.resolve(EXPORT_DIR))) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File has expired — exports are available for 24 hours' });
    }

    const contentType = job.format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    const safeFilename = encodeURIComponent(path.basename(job.file_path));
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { safeError(res, err, 'report-jobs'); }
});

/**
 * DELETE /:id — Delete a job and its file.
 */
router.delete('/:id', requirePermission('reports', 'delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const job = await db('report_jobs').where('report_jobs_id', id).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Only allow own jobs or admin
    if (job.users_id !== req.user?.users_id && req.user?.role_name !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Clean up file
    if (job.file_path) {
      const fp = path.join(EXPORT_DIR, path.basename(job.file_path));
      if (fp.startsWith(path.resolve(EXPORT_DIR)) && fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await db('report_jobs').where('report_jobs_id', id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'report-jobs'); }
});

/**
 * POST /cleanup — Manually trigger old export cleanup (Admin).
 */
router.post('/cleanup', requirePermission('reports', 'delete'), async (_req, res) => {
  try {
    await cleanupOldExports();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'report-jobs-cleanup'); }
});

module.exports = router;
