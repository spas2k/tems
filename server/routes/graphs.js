/**
 * @file graphs.js — Saved Graphs API Routes — /api/graphs
 * CRUD for saved graph configurations (separate from saved_reports).
 *
 * @module routes/graphs
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { requirePermission } = require('../middleware/auth');

// GET / — list saved graphs
router.get('/', async (req, res) => {
  try {
    const hasTable = await db.schema.hasTable('saved_graphs');
    if (!hasTable) return res.json([]);
    const rows = await db('saved_graphs as sg')
      .leftJoin('users as u', 'sg.created_by', 'u.users_id')
      .select('sg.*', 'u.display_name as created_by_name')
      .orderBy('sg.updated_at', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'saved_graphs'); }
});

// GET /:id — single saved graph
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const row = await db('saved_graphs as sg')
      .leftJoin('users as u', 'sg.created_by', 'u.users_id')
      .select('sg.*', 'u.display_name as created_by_name')
      .where('sg.saved_graphs_id', id)
      .first();
    if (!row) return res.status(404).json({ error: 'Graph not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'saved_graphs'); }
});

// POST /save — save a new graph
router.post('/save', requirePermission('reports', 'create'), async (req, res) => {
  try {
    const { name, description, config } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!config || !config.tableKey) return res.status(400).json({ error: 'Invalid graph config' });

    const hasTable = await db.schema.hasTable('saved_graphs');
    if (!hasTable) return res.status(503).json({ error: 'Database not ready — run migrations' });

    const id = await db.insertReturningId('saved_graphs', {
      name:        name.trim().slice(0, 200),
      description: description ? description.slice(0, 2000) : null,
      config:      JSON.stringify(config),
      created_by:  req.user?.users_id || null,
    });
    const row = await db('saved_graphs').where('saved_graphs_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'saved_graphs'); }
});

// PUT /:id — update saved graph
router.put('/:id', requirePermission('reports', 'update'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const { name, description, config } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const row = await db('saved_graphs').where('saved_graphs_id', id).first();
    if (!row) return res.status(404).json({ error: 'Graph not found' });

    await db('saved_graphs').where('saved_graphs_id', id).update({
      name:        name.trim().slice(0, 200),
      description: description ? description.slice(0, 2000) : null,
      config:      JSON.stringify(config),
      updated_at:  db.fn.now(),
    });
    const updated = await db('saved_graphs').where('saved_graphs_id', id).first();
    res.json(updated);
  } catch (err) { safeError(res, err, 'saved_graphs'); }
});

// DELETE /:id — delete saved graph
router.delete('/:id', requirePermission('reports', 'delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const row = await db('saved_graphs').where('saved_graphs_id', id).first();
    if (!row) return res.status(404).json({ error: 'Graph not found' });
    await db('saved_graphs').where('saved_graphs_id', id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'saved_graphs'); }
});

module.exports = router;
