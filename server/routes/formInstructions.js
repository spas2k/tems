const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');

const instructionRules = [
  body('form_id').trim().notEmpty().withMessage('Form Identifier is required').isLength({ max: 255 }),
  body('instruction').trim().notEmpty().withMessage('Instruction is required'),
  body('is_active').optional().isBoolean({ loose: true }),
];

router.get('/', async (req, res) => {
  try {
    let q = db('form_instructions').orderBy('form_id', 'asc');
    if (req.query.active === 'true') {
      q = q.where('is_active', true);
    }
    const rows = await q;
    res.json(rows);
  } catch (err) { safeError(res, err, 'form_instructions'); }
});

router.get('/by-form/:formId', async (req, res) => {
  try {
    const row = await db('form_instructions').where({ form_id: req.params.formId, is_active: true }).first();
    if (!row) return res.json({ instruction: null });
    res.json(row);
  } catch (err) { safeError(res, err, 'form_instructions'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await db('form_instructions').where('id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'form_instructions'); }
});

router.post('/', requireRole('Admin'), instructionRules, validate, auditCreate('form_instructions', 'id'), async (req, res) => {
  try {
    const { form_id, instruction, is_active } = req.body;
    
    // Check if form_id already exists
    const existing = await db('form_instructions').where('form_id', form_id).first();
    if (existing) return res.status(400).json({ error: 'An instruction for this form already exists.' });

    const id = await db.insertReturningId('form_instructions', {
      form_id, instruction,
      is_active: is_active !== false,
    });
    const row = await db('form_instructions').where('id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'form_instructions'); }
});

router.put('/:id', requireRole('Admin'), idParam, instructionRules, validate, auditUpdate('form_instructions', 'id'), async (req, res) => {
  try {
    const { form_id, instruction, is_active } = req.body;
    
    const existing = await db('form_instructions').where('form_id', form_id).whereNot('id', req.params.id).first();
    if (existing) return res.status(400).json({ error: 'An instruction for this form already exists.' });

    await db('form_instructions').where('id', req.params.id).update({ 
      form_id, instruction, is_active, updated_at: db.fn.now()
    });
    const row = await db('form_instructions').where('id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'form_instructions'); }
});

router.delete('/:id', requireRole('Admin'), idParam, validate, auditDelete('form_instructions', 'id'), async (req, res) => {
  try {
    await db('form_instructions').where('id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'form_instructions'); }
});

module.exports = router;
