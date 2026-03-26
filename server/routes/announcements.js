const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');

const announcementRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['info', 'warning', 'danger', 'success']),
  body('is_active').optional().isBoolean({ loose: true }),
  body('start_date').optional({ nullable: true, values: 'falsy' }).isISO8601(),
  body('end_date').optional({ nullable: true, values: 'falsy' }).isISO8601(),
];

router.get('/', async (req, res) => {
  try {
    let q = db('announcements').orderBy('created_at', 'desc');
    if (req.query.active === 'true') {
      const today = new Date().toISOString().slice(0, 10);
      q = q.where('is_active', true)
           .where(function () {
             this.whereNull('start_date').orWhere('start_date', '<=', today);
           })
           .where(function () {
             this.whereNull('end_date').orWhere('end_date', '>=', today);
           });
    }
    const rows = await q;
    res.json(rows);
  } catch (err) { safeError(res, err, 'announcements'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('announcements').where('announcements_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'announcements'); }
});

router.post('/', requireRole('Admin'), announcementRules, validate, auditCreate('announcements', 'announcements_id'), async (req, res) => {
  try {
    const { title, message, type, is_active, start_date, end_date } = req.body;
    const created_by = req.user?.users_id || null;
    const id = await db.insertReturningId('announcements', {
      title, message, type: type || 'info',
      is_active: is_active !== false,
      start_date: start_date || null,
      end_date: end_date || null,
      created_by,
    });
    const row = await db('announcements').where('announcements_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'announcements'); }
});

router.put('/:id', requireRole('Admin'), idParam, announcementRules, validate, auditUpdate('announcements', 'announcements_id'), async (req, res) => {
  try {
    const { title, message, type, is_active, start_date, end_date } = req.body;
    await db('announcements').where('announcements_id', req.params.id).update({
      title, message, type, is_active,
      start_date: start_date || null,
      end_date: end_date || null,
    });
    const row = await db('announcements').where('announcements_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'announcements'); }
});

router.delete('/:id', requireRole('Admin'), idParam, validate, auditDelete('announcements', 'announcements_id'), async (req, res) => {
  try {
    await db('announcements').where('announcements_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'announcements'); }
});

module.exports = router;
