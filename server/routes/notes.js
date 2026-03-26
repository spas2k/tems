const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');

const ALLOWED_ENTITY_TYPES = new Set([
  'account', 'contract', 'inventoryItem', 'order', 'invoice', 'dispute', 'cost_saving',
  'vendor', 'vendor_remit', 'location',
]);

// GET /notes?entity_type=account&entity_id=123
router.get('/', requireRole('Admin', 'Manager', 'Analyst', 'Viewer'), async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id required' });
    if (!ALLOWED_ENTITY_TYPES.has(entity_type)) return res.status(400).json({ error: 'Invalid entity_type' });
    const eid = parseInt(entity_id, 10);
    if (!Number.isInteger(eid) || eid < 1) return res.status(400).json({ error: 'entity_id must be a positive integer' });
    const rows = await db('notes')
      .where({ entity_type, entity_id: eid })
      .orderBy('created_at', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'notes'); }
});

// POST /notes
router.post('/', requireRole('Admin', 'Manager', 'Analyst', 'Viewer'), async (req, res) => {
  try {
    const { entity_type, entity_id, content, note_type } = req.body;
    if (!entity_type || !entity_id || !content) {
      return res.status(400).json({ error: 'entity_type, entity_id, and content required' });
    }
    if (!ALLOWED_ENTITY_TYPES.has(entity_type)) return res.status(400).json({ error: 'Invalid entity_type' });
    const eid = parseInt(entity_id, 10);
    if (!Number.isInteger(eid) || eid < 1) return res.status(400).json({ error: 'entity_id must be a positive integer' });
    // author is always derived server-side — never trusted from the client
    const author = req.user?.display_name || req.user?.username || 'System';
    const id = await db.insertReturningId('notes', {
      entity_type,
      entity_id: eid,
      content,
      author,
      note_type: note_type || 'note',
    });
    const row = await db('notes').where('notes_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'notes'); }
});

// DELETE /notes/:id
router.delete('/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });
    await db('notes').where('notes_id', id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'notes'); }
});

module.exports = router;
