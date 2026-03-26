// lineItems.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, lineItemRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

// Reusable base query for line items with joined inventoryItem/invoice/usoc info
function baseQuery() {
  return db('line_items as li')
    .leftJoin('inventory as inv', 'li.inventory_id', 'inv.inventory_id')
    .leftJoin('invoices as i', 'li.invoices_id', 'i.invoices_id')
    .leftJoin('usoc_codes as u', 'li.usoc_codes_id', 'u.usoc_codes_id')
    .select(
      'li.*',
      'inv.inventory_number as inventory_identifier', 'inv.location as inventoryItem_location',
      'i.invoice_number',
      'u.usoc_code', 'u.description as usoc_description', 'u.category as usoc_category'
    );
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.invoices_id) query = query.where('li.invoices_id', req.query.invoices_id);
    if (req.query.inventory_id) query = query.where('li.inventory_id', req.query.inventory_id);
    const rows = await query;
    res.json(rows);
  } catch (err) { safeError(res, err, 'lineItems'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('li.line_items_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'lineItems'); }
});

router.post('/', requireRole('Admin', 'Manager'), lineItemRules, validate, auditCreate('line_items', 'line_items_id'), async (req, res) => {
  try {
    const { invoices_id, inventory_id, usoc_codes_id, description, charge_type, amount, mrc_amount, nrc_amount, contracted_rate, period_start, period_end } = req.body;
    const variance = (contracted_rate != null && amount != null)
      ? parseFloat(amount) - parseFloat(contracted_rate)
      : null;
    // Determine audit_status based on variance
    let audit_status = null;
    if (charge_type === 'MRC' || charge_type === 'NRC') {
      if (variance !== null) audit_status = Math.abs(variance) > 0.005 ? 'Variance' : 'Validated';
      else audit_status = 'Pending';
    }
    const id = await db.insertReturningId('line_items', {
      invoices_id, inventory_id: inventory_id || null,
      usoc_codes_id: usoc_codes_id || null,
      description, charge_type, amount,
      mrc_amount: mrc_amount != null ? mrc_amount : (charge_type === 'MRC' ? amount : null),
      nrc_amount: nrc_amount != null ? nrc_amount : (charge_type === 'NRC' ? amount : null),
      contracted_rate: contracted_rate || null,
      variance, audit_status, period_start, period_end,
    });
    const row = await baseQuery().where('li.line_items_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'lineItems'); }
});

router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...lineItemRules, validate, auditUpdate('line_items', 'line_items_id'), async (req, res) => {
  try {
    const { invoices_id, inventory_id, usoc_codes_id, description, charge_type, amount, mrc_amount, nrc_amount, contracted_rate, period_start, period_end } = req.body;
    const variance = (contracted_rate != null && amount != null)
      ? parseFloat(amount) - parseFloat(contracted_rate)
      : null;
    let audit_status = null;
    if (charge_type === 'MRC' || charge_type === 'NRC') {
      if (variance !== null) audit_status = Math.abs(variance) > 0.005 ? 'Variance' : 'Validated';
      else audit_status = 'Pending';
    }
    await db('line_items').where('line_items_id', req.params.id).update({
      invoices_id, inventory_id: inventory_id || null,
      usoc_codes_id: usoc_codes_id || null,
      description, charge_type, amount,
      mrc_amount: mrc_amount != null ? mrc_amount : (charge_type === 'MRC' ? amount : null),
      nrc_amount: nrc_amount != null ? nrc_amount : (charge_type === 'NRC' ? amount : null),
      contracted_rate: contracted_rate || null,
      variance, audit_status, period_start, period_end,
    });
    const row = await baseQuery().where('li.line_items_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'lineItems'); }
});

router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('line_items', 'line_items_id'), auditDelete('line_items', 'line_items_id'), async (req, res) => {
  try {
    await db('line_items').where('line_items_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'lineItems'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('line_items', 'line_items_id'));

module.exports = router;
