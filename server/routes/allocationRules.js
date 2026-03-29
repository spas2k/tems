const express = require('express');
const router  = express.Router();
const db      = require('../db');
const safeError = require('./_safeError');
const { validate, idParam } = require('./_validators');
const { body } = require('express-validator');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');

/* ── helpers ─────────────────────────────────────────────── */
const baseQuery = () =>
  db('allocation_rules as ar')
    .join('accounts as a', 'a.accounts_id', 'ar.accounts_id')
    .join('bank_cost_centers as cc', 'cc.bank_cost_centers_id', 'ar.bank_cost_centers_id')
    .select(
      'ar.*',
      'a.account_number', 'a.name as account_name',
      'cc.name as cost_center_name', 'cc.code as cost_center_code',
    );

const ruleValidation = [
  body('accounts_id').isInt({ min: 1 }),
  body('bank_cost_centers_id').isInt({ min: 1 }),
  body('percentage').isFloat({ min: 0, max: 100 }),
  body('department').optional({ nullable: true }).isString().isLength({ max: 120 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
];

/* ── GET / — list all rules (optionally filter by account) ─ */
router.get('/', async (req, res) => {
  try {
    const q = baseQuery().orderBy('ar.accounts_id').orderBy('ar.percentage', 'desc');
    if (req.query.accounts_id) q.where('ar.accounts_id', req.query.accounts_id);
    res.json(await q);
  } catch (err) { safeError(res, err, 'allocation_rules'); }
});

/* ── GET /:id ──────────────────────────────────────────── */
router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('ar.allocation_rules_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'allocation_rules'); }
});

/* ── PUT /account/:accountId — save full rule set for an account ── */
router.put('/account/:accountId',
  requireRole('Admin', 'Manager'),
  async (req, res) => {
    const accountId = Number(req.params.accountId);
    const { rules } = req.body;           // [{ bank_cost_centers_id, percentage, department?, notes? }]

    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules must be an array' });

    // Validate percentages sum to 100 (or 0 if clearing)
    const total = rules.reduce((s, r) => s + Number(r.percentage || 0), 0);
    if (rules.length > 0 && Math.abs(total - 100) > 0.01) {
      return res.status(400).json({ error: `Percentages must sum to 100 (got ${total.toFixed(2)})` });
    }

    try {
      await db.transaction(async trx => {
        // Delete existing rules for this account
        await trx('allocation_rules').where('accounts_id', accountId).del();

        // Insert new rules
        if (rules.length > 0) {
          const rows = rules.map(r => ({
            accounts_id: accountId,
            bank_cost_centers_id: r.bank_cost_centers_id,
            percentage: r.percentage,
            department: r.department || null,
            notes: r.notes || null,
          }));
          await trx('allocation_rules').insert(rows);
        }
      });

      // Return the fresh set
      const saved = await baseQuery().where('ar.accounts_id', accountId).orderBy('ar.percentage', 'desc');
      res.json(saved);
    } catch (err) { safeError(res, err, 'allocation_rules'); }
  }
);

/* ── POST / — create a single rule ────────────────────── */
router.post('/', requireRole('Admin', 'Manager'), ruleValidation, validate,
  async (req, res) => {
    try {
      const [row] = await db('allocation_rules')
        .insert({
          accounts_id: req.body.accounts_id,
          bank_cost_centers_id: req.body.bank_cost_centers_id,
          percentage: req.body.percentage,
          department: req.body.department || null,
          notes: req.body.notes || null,
        })
        .returning('*');
      auditCreate(req, 'allocation_rules', row.allocation_rules_id, row);
      res.status(201).json(row);
    } catch (err) { safeError(res, err, 'allocation_rules'); }
  }
);

/* ── DELETE /:id ──────────────────────────────────────── */
router.delete('/:id', requireRole('Admin'), idParam, validate,
  async (req, res) => {
    try {
      const row = await db('allocation_rules').where('allocation_rules_id', req.params.id).first();
      if (!row) return res.status(404).json({ error: 'Not found' });
      await db('allocation_rules').where('allocation_rules_id', req.params.id).del();
      auditDelete(req, 'allocation_rules', req.params.id, row);
      res.json({ success: true });
    } catch (err) { safeError(res, err, 'allocation_rules'); }
  }
);

module.exports = router;
