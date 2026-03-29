/**
 * @file invoiceAuditor.js — Invoice Auditor API Routes — /api/invoice-auditor (referenced within invoices)
 * Automated invoice audit logic comparing charges to contract rates.
 * Used for bulk audit processing of all line items.
 *
 * @module routes/invoiceAuditor
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const { safeError } = require('./_safeError');

// ═══════════════════════════════════════════════════════════
// Invoice Auditor — Rule-based automated mismatch detection
// Compares line items against contract rates, historical averages,
// and known inventory, then flags discrepancies and auto-creates disputes.
// ═══════════════════════════════════════════════════════════

// ── GET /scan — Run the audit scan (read-only, returns findings) ─────────────
router.get('/scan', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    const invoiceId = req.query.invoices_id ? Number(req.query.invoices_id) : null;
    const vendorId = req.query.vendors_id ? Number(req.query.vendors_id) : null;

    // Pull all line items with contract rate + inventory context
    let query = db('line_items as li')
      .leftJoin('invoices as i', 'li.invoices_id', 'i.invoices_id')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
      .leftJoin('inventory as inv', 'li.inventory_id', 'inv.inventory_id')
      .leftJoin('contracts as co', 'inv.contracts_id', 'co.contracts_id')
      .leftJoin('contract_rates as cr', function () {
        this.on('cr.contracts_id', '=', 'co.contracts_id')
            .andOn('cr.usoc_codes_id', '=', 'li.usoc_codes_id');
      })
      .leftJoin('usoc_codes as u', 'li.usoc_codes_id', 'u.usoc_codes_id')
      .select(
        'li.line_items_id', 'li.description', 'li.charge_type',
        'li.amount', 'li.mrc_amount', 'li.nrc_amount',
        'li.contracted_rate', 'li.variance', 'li.audit_status',
        'i.invoices_id', 'i.invoice_number', 'i.invoice_date', 'i.status as invoice_status',
        'a.accounts_id', 'a.name as account_name',
        'v.vendors_id', 'v.name as vendor_name',
        'inv.inventory_id', 'inv.inventory_number', 'inv.location',
        'co.contracts_id', 'co.contract_number',
        'cr.mrc as rate_mrc', 'cr.nrc as rate_nrc',
        'u.usoc_code', 'u.description as usoc_description',
      );

    if (invoiceId) query = query.where('i.invoices_id', invoiceId);
    if (vendorId)  query = query.where('v.vendors_id', vendorId);

    const rows = await query.orderBy('li.line_items_id', 'desc');

    // ── Apply Rule Engine ───────────────────────────────────
    const findings = [];
    const seen = new Set(); // deduplicate by line_items_id + rule

    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      const mrc    = Number(row.mrc_amount) || 0;
      const nrc    = Number(row.nrc_amount) || 0;
      const rateMrc = Number(row.rate_mrc) || 0;
      const rateNrc = Number(row.rate_nrc) || 0;

      // Rule 1: Rate Mismatch — MRC exceeds contract rate
      if (rateMrc > 0 && mrc > 0 && mrc > rateMrc * 1.001) {
        const key = `${row.line_items_id}-rate_mismatch_mrc`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            ...row,
            rule: 'rate_mismatch_mrc',
            severity: 'high',
            label: 'MRC exceeds contract rate',
            expected: rateMrc,
            actual: mrc,
            delta: +(mrc - rateMrc).toFixed(2),
          });
        }
      }

      // Rule 2: Rate Mismatch — NRC exceeds contract rate
      if (rateNrc > 0 && nrc > 0 && nrc > rateNrc * 1.001) {
        const key = `${row.line_items_id}-rate_mismatch_nrc`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            ...row,
            rule: 'rate_mismatch_nrc',
            severity: 'high',
            label: 'NRC exceeds contract rate',
            expected: rateNrc,
            actual: nrc,
            delta: +(nrc - rateNrc).toFixed(2),
          });
        }
      }

      // Rule 3: Zero or negative amount
      if (amount <= 0 && row.charge_type !== 'Credit') {
        const key = `${row.line_items_id}-zero_amount`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            ...row,
            rule: 'zero_amount',
            severity: 'medium',
            label: 'Zero or negative charge (non-credit)',
            expected: null,
            actual: amount,
            delta: amount,
          });
        }
      }

      // Rule 4: Missing inventory link
      if (!row.inventory_id && row.charge_type === 'MRC') {
        const key = `${row.line_items_id}-no_inventory`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            ...row,
            rule: 'no_inventory',
            severity: 'low',
            label: 'MRC charge not linked to inventory',
            expected: null,
            actual: null,
            delta: 0,
          });
        }
      }

      // Rule 5: Existing variance flagged but no dispute
      if (row.audit_status === 'Variance' && Number(row.variance) > 0) {
        const key = `${row.line_items_id}-open_variance`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            ...row,
            rule: 'open_variance',
            severity: 'high',
            label: 'Billing variance detected (no dispute)',
            expected: Number(row.contracted_rate) || 0,
            actual: amount,
            delta: Number(row.variance),
          });
        }
      }
    }

    // ── Duplicate Detection ─────────────────────────────────
    // Find line items on the same invoice with identical amount + description
    const dupeQuery = db('line_items as li')
      .leftJoin('invoices as i', 'li.invoices_id', 'i.invoices_id')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
      .select(
        'li.invoices_id', 'li.description', 'li.amount', 'li.charge_type',
        'i.invoice_number', 'v.name as vendor_name',
        db.raw('COUNT(*) as dupe_count'),
        db.raw('array_agg(li.line_items_id) as line_item_ids'),
      )
      .groupBy('li.invoices_id', 'li.description', 'li.amount', 'li.charge_type',
               'i.invoice_number', 'v.name')
      .havingRaw('COUNT(*) > 1');

    if (invoiceId) dupeQuery.where('li.invoices_id', invoiceId);
    if (vendorId)  dupeQuery.where('v.vendors_id', vendorId);

    const dupes = await dupeQuery;
    for (const d of dupes) {
      findings.push({
        line_items_id: d.line_item_ids[0],
        invoices_id: d.invoices_id,
        invoice_number: d.invoice_number,
        description: d.description,
        amount: Number(d.amount),
        charge_type: d.charge_type,
        vendor_name: d.vendor_name,
        rule: 'duplicate_charge',
        severity: 'high',
        label: `Potential duplicate charge (${d.dupe_count} identical lines)`,
        expected: null,
        actual: Number(d.amount),
        delta: Number(d.amount) * (Number(d.dupe_count) - 1),
      });
    }

    // ── Summary stats ───────────────────────────────────────
    const summary = {
      total_scanned:  rows.length,
      total_findings: findings.length,
      high:   findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low:    findings.filter(f => f.severity === 'low').length,
      total_delta: findings.reduce((s, f) => s + Math.abs(Number(f.delta) || 0), 0),
    };

    res.json({ summary, findings });
  } catch (err) {
    safeError(res, err, 'invoice-auditor/scan');
  }
});

// ── POST /create-disputes — Auto-create dispute records from findings ────────
router.post('/create-disputes', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { findings } = req.body; // Array of { line_items_id, invoices_id, vendors_id, delta, rule, label }
    if (!Array.isArray(findings) || !findings.length) {
      return res.status(400).json({ error: 'findings array required' });
    }

    const created = [];
    const errors = [];

    await db.transaction(async trx => {
      for (const f of findings) {
        if (!f.invoices_id || !f.vendors_id) {
          errors.push(`Line ${f.line_items_id}: missing invoice or vendor context`);
          continue;
        }

        // Skip if dispute already exists for this line item
        if (f.line_items_id) {
          const existing = await trx('disputes')
            .where('line_items_id', f.line_items_id)
            .where('status', 'Open')
            .first();
          if (existing) {
            errors.push(`Line ${f.line_items_id}: dispute already exists (#${existing.disputes_id})`);
            continue;
          }
        }

        const disputeType = f.rule === 'duplicate_charge' ? 'Duplicate'
          : f.rule?.includes('rate_mismatch') ? 'Overcharge'
          : 'Overcharge';

        const id = await trx('disputes').insert({
          line_items_id: f.line_items_id || null,
          invoices_id: f.invoices_id,
          vendors_id: f.vendors_id,
          dispute_type: disputeType,
          amount: Math.abs(Number(f.delta) || Number(f.actual) || 0),
          status: 'Open',
          filed_date: new Date().toISOString().split('T')[0],
          notes: `Auto-created by Invoice Auditor.\nRule: ${f.label || f.rule}\nExpected: ${f.expected ?? 'N/A'} | Actual: ${f.actual ?? 'N/A'} | Delta: $${Math.abs(Number(f.delta) || 0).toFixed(2)}`,
        }).returning('disputes_id');

        const disputeId = typeof id[0] === 'object' ? id[0].disputes_id : id[0];
        created.push({ disputes_id: disputeId, line_items_id: f.line_items_id, rule: f.rule });

        // Update line item audit status
        if (f.line_items_id) {
          await trx('line_items')
            .where('line_items_id', f.line_items_id)
            .update({ audit_status: 'Disputed' });
        }
      }
    });

    res.json({
      disputes_created: created.length,
      errors: errors.length,
      created,
      error_details: errors,
    });
  } catch (err) {
    safeError(res, err, 'invoice-auditor/create-disputes');
  }
});

module.exports = router;
