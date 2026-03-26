const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { validate, idParam, accountRules } = require('./_validators');
const cascadeGuard = require('./_cascadeGuard');
const { auditCreate, auditUpdate, auditDelete } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');
const bulkUpdate = require('./_bulkUpdate');

function baseQuery() {
  return db('accounts as a')
    .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
    .select('a.*', 'v.name as vendor_name');
}

router.get('/', async (req, res) => {
  try {
    let query = baseQuery();
    if (req.query.vendors_id) query = query.where('a.vendors_id', req.query.vendors_id);
    const rows = await query.orderBy('a.name');
    res.json(rows);
  } catch (err) { safeError(res, err, 'accounts'); }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const row = await baseQuery().where('a.accounts_id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { safeError(res, err, 'accounts'); }
});

router.post('/', requireRole('Admin', 'Manager'), accountRules, validate, auditCreate('accounts', 'accounts_id'), async (req, res) => {
  try {
    const {
      vendors_id, name, account_number, subaccount_number, assigned_user_id,
      team, account_hierarchy, parent_account_id, account_type, account_subtype,
      currency_id, company_code_id, ship_to_location_id, asset_location_id, tax_analyst_id,
      payment_info, allocation_settings, contact_details, status
    } = req.body;
    
    const id = await db.insertReturningId('accounts', {
      vendors_id,
      name: name || null,
      account_number,
      subaccount_number: subaccount_number || null,
      assigned_user_id: assigned_user_id || null,
      team: team || null,
      account_hierarchy: account_hierarchy || null,
      parent_account_id: parent_account_id || null,
      account_type: account_type || null,
      account_subtype: account_subtype || null,
      currency_id: currency_id || null,
      company_code_id: company_code_id || null,
      ship_to_location_id: ship_to_location_id || null,
      asset_location_id: asset_location_id || null,
      tax_analyst_id: tax_analyst_id || null,
      // The schema says these are JSONB, so we check if they are objects, if so stringify, otherwise keep as is or null
      payment_info: payment_info ? (typeof payment_info === 'object' ? JSON.stringify(payment_info) : payment_info) : null,
      allocation_settings: allocation_settings ? (typeof allocation_settings === 'object' ? JSON.stringify(allocation_settings) : allocation_settings) : null,
      contact_details: contact_details ? (typeof contact_details === 'object' ? JSON.stringify(contact_details) : contact_details) : null,
      status: status || 'Active'
    });
    
    const row = await baseQuery().where('a.accounts_id', id).first();
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'accounts'); }
});

router.put('/:id', requireRole('Admin', 'Manager'), idParam, ...accountRules, validate, auditUpdate('accounts', 'accounts_id'), async (req, res) => {
  try {
    const {
      vendors_id, name, account_number, subaccount_number, assigned_user_id,
      team, account_hierarchy, parent_account_id, account_type, account_subtype,
      currency_id, company_code_id, ship_to_location_id, asset_location_id, tax_analyst_id,
      payment_info, allocation_settings, contact_details, status
    } = req.body;
    
    await db('accounts').where('accounts_id', req.params.id).update({
      vendors_id,
      name: name || null,
      account_number,
      subaccount_number: subaccount_number || null,
      assigned_user_id: assigned_user_id || null,
      team: team || null,
      account_hierarchy: account_hierarchy || null,
      parent_account_id: parent_account_id || null,
      account_type: account_type || null,
      account_subtype: account_subtype || null,
      currency_id: currency_id || null,
      company_code_id: company_code_id || null,
      ship_to_location_id: ship_to_location_id || null,
      asset_location_id: asset_location_id || null,
      tax_analyst_id: tax_analyst_id || null,
      payment_info: payment_info ? (typeof payment_info === 'object' ? JSON.stringify(payment_info) : payment_info) : null,
      allocation_settings: allocation_settings ? (typeof allocation_settings === 'object' ? JSON.stringify(allocation_settings) : allocation_settings) : null,
      contact_details: contact_details ? (typeof contact_details === 'object' ? JSON.stringify(contact_details) : contact_details) : null,
      status: status || 'Active'
    });
    
    const row = await baseQuery().where('a.accounts_id', req.params.id).first();
    res.json(row);
  } catch (err) { safeError(res, err, 'accounts'); }
});

router.get('/:id/inventory', idParam, validate, async (req, res) => {
  try {
    const rows = await db('inventory as i')
      .leftJoin('contracts as c', 'i.contracts_id', 'c.contracts_id')
      .select('i.*', 'c.contract_number')
      .where('i.accounts_id', req.params.id)
      .orderBy('i.status')
      .orderBy('i.location');
    res.json(rows);
  } catch (err) { safeError(res, err, 'accounts'); }
});

router.delete('/:id', requireRole('Admin'), idParam, validate, cascadeGuard('accounts', 'accounts_id'), auditDelete('accounts', 'accounts_id'), async (req, res) => {
  try {
    await db('accounts').where('accounts_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'accounts'); }
});

// ── PATCH /bulk ─────────────────────────────────────────
router.patch('/bulk', requireRole('Admin', 'Manager'), bulkUpdate('accounts', 'accounts_id'));

module.exports = router;
