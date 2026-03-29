/**
 * @file savingsTracker.js — Savings Tracker API Routes — /api/savings-tracker (referenced within cost savings)
 * Aggregated savings dashboard data with trends and projections.
 *
 * @module routes/savingsTracker
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('../middleware/auth');
const { safeError } = require('./_safeError');

// ═══════════════════════════════════════════════════════════
// Savings Tracker — Enhanced analytics & gamification dashboard
// Aggregates cost_savings + disputes to provide a unified
// view of money recovered / projected.
// ═══════════════════════════════════════════════════════════

// ── GET / — Full savings dashboard data ──────────────────────────────────────
router.get('/', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    // ── KPIs ────────────────────────────────────────────────
    const [savingsKpi] = await Promise.all([
      db.raw(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'Resolved' THEN realized_savings ELSE 0 END), 0) AS total_realized,
          COALESCE(SUM(CASE WHEN status != 'Resolved' THEN projected_savings ELSE 0 END), 0) AS total_projected,
          COALESCE(SUM(projected_savings), 0) AS lifetime_projected,
          COALESCE(SUM(realized_savings), 0) AS lifetime_realized,
          COUNT(*) AS total_records,
          COUNT(CASE WHEN status = 'Identified' THEN 1 END) AS identified_count,
          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) AS in_progress_count,
          COUNT(CASE WHEN status = 'Resolved' THEN 1 END) AS resolved_count
        FROM cost_savings
      `)
    ]);

    const disputeKpi = await db.raw(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'Resolved' THEN credit_amount ELSE 0 END), 0) AS dispute_credits,
        COALESCE(SUM(CASE WHEN status = 'Open' THEN amount ELSE 0 END), 0) AS open_dispute_amount,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) AS open_disputes,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) AS resolved_disputes
      FROM disputes
    `);

    const savingsRow = savingsKpi.rows ? savingsKpi.rows[0] : savingsKpi[0];
    const disputeRow = disputeKpi.rows ? disputeKpi.rows[0] : disputeKpi[0];

    // ── Breakdown by Category ───────────────────────────────
    const byCategory = await db('cost_savings')
      .select('category')
      .sum('projected_savings as projected')
      .sum('realized_savings as realized')
      .count('* as count')
      .groupBy('category')
      .orderBy('projected', 'desc');

    // ── Breakdown by Vendor (top 10) ────────────────────────
    const byVendor = await db('cost_savings as cs')
      .leftJoin('vendors as v', 'cs.vendors_id', 'v.vendors_id')
      .select('v.name as vendor_name')
      .sum('cs.projected_savings as projected')
      .sum('cs.realized_savings as realized')
      .count('cs.cost_savings_id as count')
      .groupBy('v.name')
      .orderBy('projected', 'desc')
      .limit(10);

    // ── Monthly Trend ───────────────────────────────────────
    const monthlyTrend = await db('cost_savings')
      .select(db.raw("to_char(identified_date, 'YYYY-MM') as month"))
      .sum('projected_savings as projected')
      .sum('realized_savings as realized')
      .count('* as count')
      .whereNotNull('identified_date')
      .groupByRaw("to_char(identified_date, 'YYYY-MM')")
      .orderBy('month', 'desc')
      .limit(12);

    // ── Recent Activity (latest resolved) ───────────────────
    const recentResolved = await db('cost_savings as cs')
      .leftJoin('vendors as v', 'cs.vendors_id', 'v.vendors_id')
      .select('cs.cost_savings_id', 'cs.category', 'cs.description',
              'cs.realized_savings', 'cs.resolved_date', 'v.name as vendor_name')
      .where('cs.status', 'Resolved')
      .whereNotNull('cs.resolved_date')
      .orderBy('cs.resolved_date', 'desc')
      .limit(10);

    // ── Conversion rate (identified → resolved) ─────────────
    const total = Number(savingsRow.total_records) || 0;
    const resolved = Number(savingsRow.resolved_count) || 0;
    const conversionRate = total > 0 ? +((resolved / total) * 100).toFixed(1) : 0;

    // All-up "money recovered" = realized savings + dispute credits
    const totalRecovered = (Number(savingsRow.lifetime_realized) || 0) + (Number(disputeRow.dispute_credits) || 0);

    res.json({
      kpis: {
        total_recovered:      +totalRecovered.toFixed(2),
        total_realized:       Number(savingsRow.total_realized) || 0,
        total_projected:      Number(savingsRow.total_projected) || 0,
        lifetime_projected:   Number(savingsRow.lifetime_projected) || 0,
        lifetime_realized:    Number(savingsRow.lifetime_realized) || 0,
        identified_count:     Number(savingsRow.identified_count) || 0,
        in_progress_count:    Number(savingsRow.in_progress_count) || 0,
        resolved_count:       resolved,
        dispute_credits:      Number(disputeRow.dispute_credits) || 0,
        open_dispute_amount:  Number(disputeRow.open_dispute_amount) || 0,
        open_disputes:        Number(disputeRow.open_disputes) || 0,
        resolved_disputes:    Number(disputeRow.resolved_disputes) || 0,
        conversion_rate:      conversionRate,
      },
      byCategory: byCategory.map(r => ({
        category: r.category,
        projected: Number(r.projected) || 0,
        realized: Number(r.realized) || 0,
        count: Number(r.count) || 0,
      })),
      byVendor: byVendor.map(r => ({
        vendor_name: r.vendor_name,
        projected: Number(r.projected) || 0,
        realized: Number(r.realized) || 0,
        count: Number(r.count) || 0,
      })),
      monthlyTrend: monthlyTrend.reverse().map(r => ({
        month: r.month,
        projected: Number(r.projected) || 0,
        realized: Number(r.realized) || 0,
        count: Number(r.count) || 0,
      })),
      recentResolved: recentResolved.map(r => ({
        ...r,
        realized_savings: Number(r.realized_savings) || 0,
      })),
    });
  } catch (err) {
    safeError(res, err, 'savings-tracker');
  }
});

module.exports = router;
