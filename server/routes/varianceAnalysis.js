/**
 * @file varianceAnalysis.js — Variance Analysis API Routes — /api/variance-analysis (referenced within line items)
 * Detailed variance breakdowns between billed and contracted rates.
 * Provides summary stats, top variances, and trend data.
 *
 * @module routes/varianceAnalysis
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const { safeError } = require('./_safeError');

// ═══════════════════════════════════════════════════════════
// Variance Analysis — Month-over-month invoice comparison
// Groups invoices by account and compares totals between periods,
// breaking down the delta by charge type, USOC, and new/removed lines.
// ═══════════════════════════════════════════════════════════

// ── GET / — Compute variance between two periods ─────────────────────────────
router.get('/', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    // If no period params, auto-detect last two months with data
    let { period_a, period_b } = req.query;

    if (!period_a || !period_b) {
      const recentMonths = await db('invoices')
        .select(db.raw("DISTINCT to_char(invoice_date, 'YYYY-MM') as month"))
        .whereNotNull('invoice_date')
        .orderBy('month', 'desc')
        .limit(2);

      if (recentMonths.length >= 2) {
        period_b = period_b || recentMonths[0].month; // more recent
        period_a = period_a || recentMonths[1].month; // older
      } else if (recentMonths.length === 1) {
        period_b = recentMonths[0].month;
        period_a = recentMonths[0].month;
      } else {
        return res.json({ period_a: null, period_b: null, accounts: [], summary: {} });
      }
    }

    // ── Account-level totals per period ─────────────────────
    const accountTotals = await db.raw(`
      SELECT
        a.accounts_id,
        a.name           AS account_name,
        v.name           AS vendor_name,
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN i.total_amount ELSE 0 END) AS period_a_total,
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN i.total_amount ELSE 0 END) AS period_b_total
      FROM invoices i
      JOIN accounts a ON i.accounts_id = a.accounts_id
      LEFT JOIN vendors v ON a.vendors_id = v.vendors_id
      WHERE to_char(i.invoice_date, 'YYYY-MM') IN (?, ?)
      GROUP BY a.accounts_id, a.name, v.name
      ORDER BY ABS(
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN i.total_amount ELSE 0 END) -
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN i.total_amount ELSE 0 END)
      ) DESC
    `, [period_a, period_b, period_a, period_b, period_b, period_a]);

    const accounts = (accountTotals.rows || accountTotals).map(r => ({
      accounts_id:    r.accounts_id,
      account_name:   r.account_name,
      vendor_name:    r.vendor_name,
      period_a_total: Number(r.period_a_total) || 0,
      period_b_total: Number(r.period_b_total) || 0,
      delta:          +(Number(r.period_b_total || 0) - Number(r.period_a_total || 0)).toFixed(2),
      pct_change:     Number(r.period_a_total) > 0
        ? +((Number(r.period_b_total || 0) - Number(r.period_a_total || 0)) / Number(r.period_a_total) * 100).toFixed(1)
        : null,
    }));

    // ── Charge Type breakdown (across all accounts) ─────────
    const chargeTypeBreakdown = await db.raw(`
      SELECT
        li.charge_type,
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END) AS period_a,
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END) AS period_b
      FROM line_items li
      JOIN invoices i ON li.invoices_id = i.invoices_id
      WHERE to_char(i.invoice_date, 'YYYY-MM') IN (?, ?)
        AND li.charge_type IS NOT NULL
      GROUP BY li.charge_type
      ORDER BY ABS(
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END) -
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END)
      ) DESC
    `, [period_a, period_b, period_a, period_b, period_b, period_a]);

    const chargeTypes = (chargeTypeBreakdown.rows || chargeTypeBreakdown).map(r => ({
      charge_type: r.charge_type,
      period_a: Number(r.period_a) || 0,
      period_b: Number(r.period_b) || 0,
      delta: +(Number(r.period_b || 0) - Number(r.period_a || 0)).toFixed(2),
    }));

    // ── USOC breakdown (top 15 movers) ──────────────────────
    const usocBreakdown = await db.raw(`
      SELECT
        u.usoc_code,
        u.description AS usoc_description,
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END) AS period_a,
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END) AS period_b
      FROM line_items li
      JOIN invoices i ON li.invoices_id = i.invoices_id
      LEFT JOIN usoc_codes u ON li.usoc_codes_id = u.usoc_codes_id
      WHERE to_char(i.invoice_date, 'YYYY-MM') IN (?, ?)
        AND li.usoc_codes_id IS NOT NULL
      GROUP BY u.usoc_code, u.description
      ORDER BY ABS(
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END) -
        SUM(CASE WHEN to_char(i.invoice_date, 'YYYY-MM') = ? THEN li.amount ELSE 0 END)
      ) DESC
      LIMIT 15
    `, [period_a, period_b, period_a, period_b, period_b, period_a]);

    const usocs = (usocBreakdown.rows || usocBreakdown).map(r => ({
      usoc_code: r.usoc_code,
      usoc_description: r.usoc_description,
      period_a: Number(r.period_a) || 0,
      period_b: Number(r.period_b) || 0,
      delta: +(Number(r.period_b || 0) - Number(r.period_a || 0)).toFixed(2),
    }));

    // ── New and removed lines ───────────────────────────────
    const newLinesCount = await db.raw(`
      SELECT COUNT(*) AS cnt
      FROM line_items li
      JOIN invoices i ON li.invoices_id = i.invoices_id
      WHERE to_char(i.invoice_date, 'YYYY-MM') = ?
        AND li.inventory_id IS NOT NULL
        AND li.inventory_id NOT IN (
          SELECT DISTINCT li2.inventory_id
          FROM line_items li2
          JOIN invoices i2 ON li2.invoices_id = i2.invoices_id
          WHERE to_char(i2.invoice_date, 'YYYY-MM') = ?
            AND li2.inventory_id IS NOT NULL
        )
    `, [period_b, period_a]);

    const removedLinesCount = await db.raw(`
      SELECT COUNT(*) AS cnt
      FROM line_items li
      JOIN invoices i ON li.invoices_id = i.invoices_id
      WHERE to_char(i.invoice_date, 'YYYY-MM') = ?
        AND li.inventory_id IS NOT NULL
        AND li.inventory_id NOT IN (
          SELECT DISTINCT li2.inventory_id
          FROM line_items li2
          JOIN invoices i2 ON li2.invoices_id = i2.invoices_id
          WHERE to_char(i2.invoice_date, 'YYYY-MM') = ?
            AND li2.inventory_id IS NOT NULL
        )
    `, [period_a, period_b]);

    // ── Summary ─────────────────────────────────────────────
    const totalA = accounts.reduce((s, a) => s + a.period_a_total, 0);
    const totalB = accounts.reduce((s, a) => s + a.period_b_total, 0);

    res.json({
      period_a,
      period_b,
      summary: {
        total_a:      +totalA.toFixed(2),
        total_b:      +totalB.toFixed(2),
        total_delta:  +(totalB - totalA).toFixed(2),
        pct_change:   totalA > 0 ? +((totalB - totalA) / totalA * 100).toFixed(1) : null,
        accounts_with_increase: accounts.filter(a => a.delta > 0).length,
        accounts_with_decrease: accounts.filter(a => a.delta < 0).length,
        new_lines:     Number((newLinesCount.rows || newLinesCount)[0]?.cnt) || 0,
        removed_lines: Number((removedLinesCount.rows || removedLinesCount)[0]?.cnt) || 0,
      },
      accounts,
      chargeTypes,
      usocs,
    });
  } catch (err) {
    safeError(res, err, 'variance-analysis');
  }
});

// ── GET /account/:id — Detailed variance for a single account ────────────────
router.get('/account/:id', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    const accountsId = parseInt(req.params.id, 10);
    if (!Number.isFinite(accountsId)) return res.status(400).json({ error: 'Invalid account ID' });

    let { period_a, period_b } = req.query;
    if (!period_a || !period_b) {
      const recentMonths = await db('invoices')
        .select(db.raw("DISTINCT to_char(invoice_date, 'YYYY-MM') as month"))
        .where('accounts_id', accountsId)
        .whereNotNull('invoice_date')
        .orderBy('month', 'desc')
        .limit(2);
      if (recentMonths.length >= 2) {
        period_b = recentMonths[0].month;
        period_a = recentMonths[1].month;
      } else {
        return res.json({ period_a: null, period_b: null, lineItems: [] });
      }
    }

    // Line-level detail for this account across both periods
    const lineItems = await db.raw(`
      SELECT
        li.line_items_id, li.description, li.charge_type, li.amount,
        li.mrc_amount, li.nrc_amount, li.usoc_codes_id,
        u.usoc_code, u.description AS usoc_description,
        inv.inventory_number, inv.location,
        i.invoice_number, i.invoices_id,
        to_char(i.invoice_date, 'YYYY-MM') AS period
      FROM line_items li
      JOIN invoices i ON li.invoices_id = i.invoices_id
      LEFT JOIN usoc_codes u ON li.usoc_codes_id = u.usoc_codes_id
      LEFT JOIN inventory inv ON li.inventory_id = inv.inventory_id
      WHERE i.accounts_id = ?
        AND to_char(i.invoice_date, 'YYYY-MM') IN (?, ?)
      ORDER BY li.description, li.charge_type
    `, [accountsId, period_a, period_b]);

    res.json({
      period_a,
      period_b,
      lineItems: (lineItems.rows || lineItems).map(r => ({
        ...r,
        amount: Number(r.amount) || 0,
        mrc_amount: Number(r.mrc_amount) || 0,
        nrc_amount: Number(r.nrc_amount) || 0,
      })),
    });
  } catch (err) {
    safeError(res, err, 'variance-analysis/account');
  }
});

// ── GET /periods — Available periods (months with invoice data) ──────────────
router.get('/periods', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    const periods = await db('invoices')
      .select(db.raw("DISTINCT to_char(invoice_date, 'YYYY-MM') as month"))
      .whereNotNull('invoice_date')
      .orderBy('month', 'desc');

    res.json(periods.map(p => p.month));
  } catch (err) {
    safeError(res, err, 'variance-analysis/periods');
  }
});

module.exports = router;
