const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');

const categoryRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('code').optional({ nullable: true, values: 'falsy' }).trim().isLength({ max: 40 }),
  body('parent_id').optional({ nullable: true, values: 'falsy' }).isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
];

router.get('/', async (req, res) => {
  try {
    const rows = await db('spend_categories as sc')
      .leftJoin('spend_categories as p', 'sc.parent_id', 'p.spend_categories_id')
      .select('sc.*', 'p.name as parent_name')
      .orderBy('sc.name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'spend_categories'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('spend_categories').where('spend_categories_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'spend_categories'); }
});

router.post('/', categoryRules, validate, auditCreate('spend_categories', 'spend_categories_id'), async (req, res) => {
  try {
    const { name, code, description, parent_id, is_active } = req.body;
    const id = await db.insertReturningId('spend_categories', {
      name, code, description,
      parent_id: parent_id || null,
      is_active: is_active !== false,
    });
    const row = await db('spend_categories').where('spend_categories_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'spend_categories'); }
});

router.put('/:id', idParam, categoryRules, validate, auditUpdate('spend_categories', 'spend_categories_id'), async (req, res) => {
  try {
    const { name, code, description, parent_id, is_active } = req.body;
    await db('spend_categories').where('spend_categories_id', req.params.id).update({
      name, code, description,
      parent_id: parent_id || null,
      is_active,
    });
    const row = await db('spend_categories').where('spend_categories_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'spend_categories'); }
});

router.delete('/:id', idParam, validate, auditDelete('spend_categories', 'spend_categories_id'), async (req, res) => {
  try {
    const children = await db('spend_categories').where('parent_id', req.params.id).count('* as cnt').first();
    if (Number(children.cnt) > 0) {
      return res.status(409).json({ error: 'Cannot delete: this category has sub-categories.' });
    }
    await db('spend_categories').where('spend_categories_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'spend_categories'); }
});

module.exports = router;
