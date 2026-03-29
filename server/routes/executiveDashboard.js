/**
 * @file executiveDashboard.js — Executive Dashboard API Routes — /api/executive-dashboard
 * C-level summary dashboard with high-level KPIs, trend charts,
 * SLA compliance, and department-level cost breakdowns.
 *
 * @module routes/executiveDashboard
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('../middleware/auth');

// ── GET / — Executive Dashboard aggregate data ───────────────────────────────
// Cost by vendor, location, department; trend lines; top cost drivers; savings
router.get('/', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;

    // ── Cost by Vendor (top 10) ─────────────────────────────
    const costByVendor = await db('invoices as i')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
      .select('v.name as vendor_name', 'v.vendors_id')
      .sum('i.total_amount as total')
      .count('i.invoices_id as invoice_count')
      .groupBy('v.vendors_id', 'v.name')
      .orderBy('total', 'desc')
      .limit(10);

    // ── Cost by Location (top 10) ───────────────────────────
    const costByLocation = await db('line_items as li')
      .leftJoin('inventory as inv', 'li.inventory_id', 'inv.inventory_id')
      .select('inv.location')
      .sum('li.amount as total')
      .count('li.line_items_id as line_count')
      .whereNotNull('inv.location')
      .groupBy('inv.location')
      .orderBy('total', 'desc')
      .limit(10);

    // ── Cost by Charge Type ─────────────────────────────────
    const costByChargeType = await db('line_items')
      .select('charge_type')
      .sum('amount as total')
      .count('line_items_id as count')
      .whereNotNull('charge_type')
      .groupBy('charge_type')
      .orderBy('total', 'desc');

    // ── Monthly Trend (last N months) ───────────────────────
    const monthlyTrend = await db('invoices')
      .select(db.raw("to_char(invoice_date, 'YYYY-MM') as month"))
      .sum('total_amount as total')
      .count('invoices_id as invoice_count')
      .whereNotNull('invoice_date')
      .groupByRaw("to_char(invoice_date, 'YYYY-MM')")
      .orderBy('month', 'desc')
      .limit(months);

    // ── Top 5 Cost Drivers this month ───────────────────────
    const topCostDrivers = await db('line_items as li')
      .leftJoin('invoices as i', 'li.invoices_id', 'i.invoices_id')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
      .leftJoin('usoc_codes as u', 'li.usoc_codes_id', 'u.usoc_codes_id')
      .select(
        'v.name as vendor_name',
        'u.usoc_code',
        'u.description as usoc_description',
        'li.charge_type',
      )
      .sum('li.amount as total')
      .count('li.line_items_id as line_count')
      .groupBy('v.name', 'u.usoc_code', 'u.description', 'li.charge_type')
      .orderBy('total', 'desc')
      .limit(5);

    // ── Aggregated KPIs ─────────────────────────────────────
    const [kpi] = await Promise.all([
      db.raw(`
        SELECT
          (SELECT COALESCE(SUM(total_amount), 0) FROM invoices) as total_spend,
          (SELECT COUNT(*) FROM vendors WHERE status = 'Active') as vendor_count,
          (SELECT COUNT(*) FROM contracts WHERE status = 'Active') as contract_count,
          (SELECT COUNT(*) FROM inventory WHERE status = 'Active') as inventory_count,
          (SELECT COUNT(*) FROM invoices WHERE status = 'Open') as open_invoices,
          (SELECT COUNT(*) FROM invoices WHERE status = 'Disputed') as disputed_invoices,
          (SELECT COALESCE(SUM(projected_savings), 0) FROM cost_savings WHERE status != 'Resolved') as pipeline_savings,
          (SELECT COALESCE(SUM(realized_savings), 0) FROM cost_savings WHERE status = 'Resolved') as realized_savings,
          (SELECT COALESCE(SUM(amount), 0) FROM disputes WHERE status = 'Open') as open_dispute_amount,
          (SELECT COALESCE(SUM(credit_amount), 0) FROM disputes WHERE status = 'Resolved') as recovered_credits
      `)
    ]);

    // ── Top Savings Opportunities ───────────────────────────
    const topSavings = await db('cost_savings as cs')
      .leftJoin('vendors as v', 'cs.vendors_id', 'v.vendors_id')
      .select('cs.cost_savings_id', 'cs.category', 'cs.description',
              'cs.projected_savings', 'cs.status', 'v.name as vendor_name')
      .whereNot('cs.status', 'Resolved')
      .orderBy('cs.projected_savings', 'desc')
      .limit(5);

    // ── Contract Expiration Alerts ──────────────────────────
    const expiringContracts = await db('contracts as c')
      .leftJoin('vendors as v', 'c.vendors_id', 'v.vendors_id')
      .select('c.contracts_id', 'c.contract_number', 'c.contract_name',
              'c.expiration_date', 'c.contract_value', 'v.name as vendor_name')
      .where('c.status', 'Active')
      .whereNotNull('c.expiration_date')
      .whereRaw("c.expiration_date <= CURRENT_DATE + INTERVAL '90 days'")
      .orderBy('c.expiration_date', 'asc')
      .limit(10);

    // ── Spend by Month per Vendor (for stacked trend) ───────
    const vendorTrend = await db('invoices as i')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
      .select(
        db.raw("to_char(i.invoice_date, 'YYYY-MM') as month"),
        'v.name as vendor_name',
      )
      .sum('i.total_amount as total')
      .whereNotNull('i.invoice_date')
      .groupByRaw("to_char(i.invoice_date, 'YYYY-MM'), v.name")
      .orderBy('month', 'desc')
      .limit(months * 10); // up to 10 vendors × N months

    const kpiRow = kpi.rows ? kpi.rows[0] : kpi[0];

    res.json({
      kpis: {
        total_spend:        Number(kpiRow.total_spend) || 0,
        vendor_count:       Number(kpiRow.vendor_count) || 0,
        contract_count:     Number(kpiRow.contract_count) || 0,
        inventory_count:    Number(kpiRow.inventory_count) || 0,
        open_invoices:      Number(kpiRow.open_invoices) || 0,
        disputed_invoices:  Number(kpiRow.disputed_invoices) || 0,
        pipeline_savings:   Number(kpiRow.pipeline_savings) || 0,
        realized_savings:   Number(kpiRow.realized_savings) || 0,
        open_dispute_amount: Number(kpiRow.open_dispute_amount) || 0,
        recovered_credits:  Number(kpiRow.recovered_credits) || 0,
      },
      costByVendor:     costByVendor.map(r => ({ ...r, total: Number(r.total) || 0 })),
      costByLocation:   costByLocation.map(r => ({ ...r, total: Number(r.total) || 0 })),
      costByChargeType: costByChargeType.map(r => ({ ...r, total: Number(r.total) || 0 })),
      monthlyTrend:     monthlyTrend.reverse().map(r => ({ ...r, total: Number(r.total) || 0 })),
      topCostDrivers:   topCostDrivers.map(r => ({ ...r, total: Number(r.total) || 0 })),
      topSavings,
      expiringContracts,
      vendorTrend:      vendorTrend.map(r => ({ ...r, total: Number(r.total) || 0 })),
    });
  } catch (err) {
    console.error('executive-dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
