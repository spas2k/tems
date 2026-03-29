/**
 * @file server.js — Main Express application entry point for the TEMS API server.
 *
 * Configures security middleware (Helmet, CORS, rate limiting), auth,
 * mounts all route modules under `/api`, and defines inline endpoints
 * for the main dashboard summary and rate validation.
 *
 * @requires dotenv   — Loads environment variables from .env
 * @requires express  — HTTP framework
 * @requires cors     — Cross-Origin Resource Sharing
 * @requires helmet   — Sets secure HTTP headers
 * @requires express-rate-limit — API throttling
 * @requires ./db     — Knex database connection
 */
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const db         = require('./db');

const app = express();

// ── Trust proxy — required for accurate req.ip when behind a load balancer ──
// Set to 1 if behind one hop (Nginx, ALB etc.), or a specific IP/CIDR string.
app.set('trust proxy', process.env.TRUST_PROXY || false);

// ── Fail-safe: warn loudly if deployed in production without SSO configured ──
if (process.env.NODE_ENV === 'production' && (process.env.AUTH_MODE || 'dev') === 'dev') {
  console.error(
    '\n[SECURITY] CRITICAL: AUTH_MODE is not set to "sso" but NODE_ENV is "production".\n' +
    '           All API requests will be processed as unauthenticated Admin.\n' +
    '           Set AUTH_MODE=sso and configure SSO before exposing this server.\n'
  );
}

// ── Security headers ─────────────────────────────────────
app.use(helmet());

// ── CORS — restrict to known frontend origin(s) ─────────
const IS_DEV = (process.env.NODE_ENV || 'development') !== 'production';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:2000')
  .split(',')
  .map(o => o.trim());
app.use(cors({
  origin(origin, cb) {
    // Allow server-to-server requests (no origin header)
    if (!origin) return cb(null, true);
    // In dev mode allow any private-network or localhost origin so the app
    // works whether accessed via localhost, 127.0.0.1, or a LAN IP.
    if (IS_DEV) {
      const url = new URL(origin);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(url.hostname);
      if (isLocal || isPrivate) return cb(null, true);
    }
    // In production (or for non-private origins in dev) use the explicit allowlist
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Blocked by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Dev-User-Id'],
}));

// ── Body parser with size limit ──────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Rate limiting ────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,                 // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// ── Auth middleware — attach req.user to every /api request ──
const { authenticate } = require('./middleware/auth');
app.use('/api', authenticate);

/**
 * GET /health
 * Unauthenticated health-check endpoint for load balancers & uptime monitors.
 *
 * @route   GET /health
 * @returns {object} 200 — { status: 'ok', timestamp: string }
 * @returns {object} 503 — { status: 'error', message: string } when DB unreachable
 */
app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Routes
app.use('/api/vendors',      require('./routes/vendors'));
app.use('/api/accounts',     require('./routes/accounts'));
app.use('/api/locations',    require('./routes/locations'));
app.use('/api/field-catalog', require('./routes/fieldCatalog'));
app.use('/api/form-instructions', require('./routes/formInstructions'));
app.use('/api/vendor-remit', require('./routes/vendorRemit'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/spend-categories', require('./routes/spendCategories'));
app.use('/api/currencies',   require('./routes/currencies'));
app.use('/api/contracts',    require('./routes/contracts'));
app.use('/api/inventory',     require('./routes/inventory'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/invoices',     require('./routes/invoices'));
app.use('/api/line-items',   require('./routes/lineItems'));
app.use('/api/allocations',  require('./routes/allocations'));
app.use('/api/allocation-rules', require('./routes/allocationRules'));
app.use('/api/bank-cost-centers', require('./routes/bankCostCenters'));
app.use('/api/cost-savings', require('./routes/costSavings'));
app.use('/api/usoc-codes',   require('./routes/usocCodes'));
app.use('/api/contract-rates', require('./routes/contractRates'));
app.use('/api/disputes',       require('./routes/disputes'));
app.use('/api/search',       require('./routes/search'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/roles',        require('./routes/roles'));
app.use('/api/batch-upload', require('./routes/batchUpload'));
app.use('/api/invoice-reader', require('./routes/invoiceReader'));
app.use('/api/notes',          require('./routes/notes'));
app.use('/api/favorites',      require('./routes/favorites'));
app.use('/api/tickets',        require('./routes/tickets'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/graphs',         require('./routes/graphs'));
app.use('/api/report-jobs',    require('./routes/reportJobs'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/notification-settings', require('./routes/notificationSettings'));
app.use('/api/workflows',      require('./routes/workflows'));
app.use('/api/email-config',   require('./routes/emailConfig'));
app.use('/api/invoice-approvers', require('./routes/invoiceApprovers'));
app.use('/api/admin-dashboard', require('./routes/adminDashboard'));
app.use('/api/system-settings', require('./routes/systemSettings'));
/**
 * GET /api/dashboard
 * Main dashboard summary — aggregates KPIs, trends, and recent activity
 * across all major TEMS entities in a single response.
 *
 * @route   GET /api/dashboard
 * @auth    Requires authenticated user (any role)
 * @returns {object} 200 — Dashboard payload containing:
 *   - totalVendors, totalAccounts, activeContracts, activeInventory, totalLocations {number}
 *   - openInvoices, totalInvoices, totalBilled, totalVariance {number}
 *   - totalSavingsIdentified, totalSavingsRealized {number}
 *   - pendingOrders, totalMrc, totalNrc {number}
 *   - auditCounts {{ validated, variance, pending, disputed }} {object}
 *   - openDisputes, disputeAmount, creditRecovered {number}
 *   - openTickets, totalTickets, readerUploads {number}
 *   - monthlyTrend {Array<{ month: string, total: number }>} — last 6 months of invoice spend
 *   - topVendors {Array<{ vendor_name: string, total: number }>} — top 5 by spend
 *   - spendByChargeType {Array<{ charge_type: string, total: number }>}
 *   - expiringContracts {Array} — active contracts expiring within 90 days
 *   - recentInvoices {Array} — last 7 invoices with vendor/account join
 *   - savingsOpportunities {Array} — top 5 unresolved cost savings by projected amount
 *   - recentVariances {Array} — last 10 line items with audit_status='Variance'
 *   - recentTickets {Array} — last 5 tickets
 *   - recentDisputes {Array} — last 5 disputes
 * @returns {object} 500 — { error: 'Internal server error' }
 */
// Dashboard summary
app.get('/api/dashboard', async (req, res) => {
  try {
    const [
      countVendors,
      countAccounts,
      countContracts,
      countInventory,
      countLocations,
      countInvoicesOpen,
      countInvoicesTotal,
      sumBilled,
      sumVariance,
      sumSavingsProjected,
      sumSavingsRealized,
      countOrders,
      sumMrc,
      sumNrc,
      auditValidated,
      auditVariance,
      auditPending,
      auditDisputed,
      countDisputes,
      sumDisputeAmount,
      sumCreditAmount,
      countTicketsOpen,
      countTicketsTotal,
      countReaderUploads,
    ] = await Promise.all([
      db('vendors').where('status', 'Active').count('* as val').first(),
      db('accounts').count('* as val').first(),
      db('contracts').where('status', 'Active').count('* as val').first(),
      db('inventory').where('status', 'Active').count('* as val').first(),
      db('locations').count('* as val').first(),
      db('invoices').whereIn('status', ['Open', 'Disputed']).count('* as val').first(),
      db('invoices').count('* as val').first(),
      db('invoices').sum('total_amount as val').first(),
      db('line_items').whereNotNull('variance').sum('variance as val').first(),
      db('cost_savings').whereNot('status', 'Resolved').sum('projected_savings as val').first(),
      db('cost_savings').where('status', 'Resolved').sum('realized_savings as val').first(),
      db('orders').where('status', 'In Progress').count('* as val').first(),
      db('line_items').whereNotNull('mrc_amount').sum('mrc_amount as val').first(),
      db('line_items').whereNotNull('nrc_amount').sum('nrc_amount as val').first(),
      db('line_items').where('audit_status', 'Validated').count('* as val').first(),
      db('line_items').where('audit_status', 'Variance').count('* as val').first(),
      db('line_items').where('audit_status', 'Pending').count('* as val').first(),
      db('line_items').where('audit_status', 'Disputed').count('* as val').first(),
      db('disputes').whereNotIn('status', ['Closed', 'Resolved']).count('* as val').first(),
      db('disputes').whereNotIn('status', ['Closed', 'Resolved']).sum('amount as val').first(),
      db('disputes').where('status', 'Resolved').sum('credit_amount as val').first(),
      db('tickets').whereNotIn('status', ['Closed', 'Resolved']).count('* as val').first(),
      db('tickets').count('* as val').first(),
      db('invoice_reader_uploads').count('* as val').first(),
    ]);

    // Monthly spend trend (last 6 months)
    const monthlyTrend = await db('invoices')
      .select(db.raw("to_char(invoice_date, 'YYYY-MM') as month"))
      .sum('total_amount as total')
      .groupByRaw("to_char(invoice_date, 'YYYY-MM')")
      .orderBy('month', 'desc')
      .limit(6)
      .then(rows => rows.reverse());

    // Top 5 vendors by spend
    const topVendors = await db('invoices as i')
      .join('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .join('vendors as v', 'a.vendors_id', 'v.vendors_id')
      .select('v.name as vendor_name')
      .sum('i.total_amount as total')
      .groupBy('v.name')
      .orderBy('total', 'desc')
      .limit(5);

    // Spend by charge type
    const spendByChargeType = await db('line_items')
      .select('charge_type')
      .sum('amount as total')
      .whereNotNull('charge_type')
      .groupBy('charge_type')
      .orderBy('total', 'desc');

    // Contracts expiring within 90 days
    const expiringContracts = await db('contracts as c')
      .leftJoin('vendors as v', 'c.vendors_id', 'v.vendors_id')
      .select('c.contracts_id', 'c.contract_number', 'c.contract_name', 'c.expiration_date', 'v.name as vendor_name')
      .where('c.status', 'Active')
      .whereNotNull('c.expiration_date')
      .where('c.expiration_date', '<=', db.raw("CURRENT_DATE + interval '90 days'"))
      .where('c.expiration_date', '>=', db.raw('CURRENT_DATE'))
      .orderBy('c.expiration_date', 'asc')
      .limit(5);

    // Recent invoices (7)
    const recentInvoices = await db('invoices as i')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .leftJoin('vendors as v', 'a.vendors_id', 'v.vendors_id')
      .select('i.invoices_id', 'i.invoice_number', 'i.invoice_date', 'i.total_amount', 'i.status',
              'a.name as account_name', 'v.name as vendor_name')
      .orderBy('i.invoice_date', 'desc')
      .limit(7);

    // Savings opportunities (top 5 by projected)
    const savingsOpportunities = await db('cost_savings as cs')
      .leftJoin('vendors as v', 'cs.vendors_id', 'v.vendors_id')
      .select('cs.cost_savings_id', 'cs.category', 'cs.description', 'cs.projected_savings', 'cs.status', 'v.name as vendor_name')
      .whereNot('cs.status', 'Resolved')
      .orderBy('cs.projected_savings', 'desc')
      .limit(5);

    // Recent variances (10)
    const recentVariances = await db('line_items as li')
      .leftJoin('invoices as i', 'li.invoices_id', 'i.invoices_id')
      .leftJoin('inventory as ci', 'li.inventory_id', 'ci.inventory_id')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .select('li.line_items_id', 'li.description', 'li.amount', 'li.contracted_rate', 'li.variance', 'li.audit_status',
              'i.invoice_number', 'i.invoices_id', 'ci.inventory_number', 'a.name as account_name')
      .where('li.audit_status', 'Variance')
      .orderBy('li.line_items_id', 'desc')
      .limit(10);

    // Recent tickets (5)
    const recentTickets = await db('tickets as t')
      .leftJoin('users as u', 't.assigned_users_id', 'u.users_id')
      .select('t.tickets_id', 't.ticket_number', 't.title', 't.priority', 't.status', 't.category',
              'u.display_name as assigned_to')
      .orderBy('t.created_at', 'desc')
      .limit(5);

    // Recent disputes (5)
    const recentDisputes = await db('disputes as d')
      .leftJoin('vendors as v', 'd.vendors_id', 'v.vendors_id')
      .select('d.disputes_id', 'd.dispute_type', 'd.amount', 'd.status', 'd.filed_date', 'v.name as vendor_name')
      .orderBy('d.filed_date', 'desc')
      .limit(5);

    res.json({
      totalVendors:       Number(countVendors.val),
      totalAccounts:      Number(countAccounts.val),
      activeContracts:    Number(countContracts.val),
      activeInventory:    Number(countInventory.val),
      totalLocations:     Number(countLocations.val),
      openInvoices:       Number(countInvoicesOpen.val),
      totalInvoices:      Number(countInvoicesTotal.val),
      totalBilled:        Number(sumBilled.val) || 0,
      totalVariance:      Number(sumVariance.val) || 0,
      totalSavingsIdentified: Number(sumSavingsProjected.val) || 0,
      totalSavingsRealized:   Number(sumSavingsRealized.val) || 0,
      pendingOrders:      Number(countOrders.val),
      totalMrc:           Number(sumMrc.val) || 0,
      totalNrc:           Number(sumNrc.val) || 0,
      auditCounts: {
        validated: Number(auditValidated.val),
        variance:  Number(auditVariance.val),
        pending:   Number(auditPending.val),
        disputed:  Number(auditDisputed.val),
      },
      openDisputes:       Number(countDisputes.val),
      disputeAmount:      Number(sumDisputeAmount.val) || 0,
      creditRecovered:    Number(sumCreditAmount.val) || 0,
      openTickets:        Number(countTicketsOpen.val),
      totalTickets:       Number(countTicketsTotal.val),
      readerUploads:      Number(countReaderUploads.val),
      monthlyTrend,
      topVendors,
      spendByChargeType,
      expiringContracts,
      recentInvoices,
      savingsOpportunities,
      recentVariances,
      recentTickets,
      recentDisputes,
    });
  } catch (err) {
    console.error('dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/rate-validation
 * Compares every line-item charge against its corresponding contract rate
 * to identify billing mismatches (MRC/NRC deltas).
 *
 * @route   GET /api/rate-validation
 * @auth    Requires authenticated user (any role)
 * @returns {object} 200 — {
 *   summary: { total: number, matched: number, mismatched: number, noRate: number },
 *   items: Array<{
 *     line_items_id, description, charge_type, amount, mrc_amount, nrc_amount,
 *     contracted_rate, variance, audit_status, invoice_number, invoices_id,
 *     invoice_date, account_name, accounts_id, contract_number, contracts_id,
 *     inventory_number, usoc_code, usoc_description,
 *     rate_mrc, rate_nrc, rate_effective, mrc_delta, nrc_delta,
 *     mrc_match: boolean|null, nrc_match: boolean|null, compliant: boolean
 *   }>
 * }
 * @returns {object} 500 — { error: 'Internal server error' }
 */
// ── Rate Validation (Phase D) ──────────────────────────────
// Compares line-item charges against contract rates to find mismatches
app.get('/api/rate-validation', async (req, res) => {
  try {
    const rows = await db('line_items as li')
      .leftJoin('invoices as i',       'li.invoices_id',   'i.invoices_id')
      .leftJoin('inventory as ci',      'li.inventory_id',   'ci.inventory_id')
      .leftJoin('accounts as a',       'i.accounts_id',    'a.accounts_id')
      .leftJoin('contracts as co',     'ci.contracts_id',  'co.contracts_id')
      .leftJoin('contract_rates as cr', function () {
        this.on('cr.contracts_id', '=', 'co.contracts_id')
            .andOn('cr.usoc_codes_id', '=', 'li.usoc_codes_id');
      })
      .leftJoin('usoc_codes as u',     'li.usoc_codes_id', 'u.usoc_codes_id')
      .select(
        'li.line_items_id', 'li.description', 'li.charge_type', 'li.amount',
        'li.mrc_amount', 'li.nrc_amount', 'li.contracted_rate', 'li.variance', 'li.audit_status',
        'i.invoice_number', 'i.invoices_id', 'i.invoice_date',
        'a.name as account_name', 'a.accounts_id',
        'co.contract_number', 'co.contracts_id',
        'ci.inventory_number',
        'u.usoc_code', 'u.description as usoc_description',
        'cr.mrc as rate_mrc', 'cr.nrc as rate_nrc', 'cr.effective_date as rate_effective',
      )
      .whereNotNull('li.usoc_codes_id')
      .orderBy('a.name')
      .orderBy('i.invoice_date', 'desc');

    // Compute rate compliance for each row
    const results = rows.map(r => {
      const rateMrc = Number(r.rate_mrc) || null;
      const rateNrc = Number(r.rate_nrc) || null;
      const liMrc   = Number(r.mrc_amount) || 0;
      const liNrc   = Number(r.nrc_amount) || 0;
      let mrcMatch  = null;
      let nrcMatch  = null;
      let mrcDelta  = null;
      let nrcDelta  = null;
      if (rateMrc !== null) { mrcDelta = liMrc - rateMrc; mrcMatch = Math.abs(mrcDelta) < 0.01; }
      if (rateNrc !== null) { nrcDelta = liNrc - rateNrc; nrcMatch = Math.abs(nrcDelta) < 0.01; }
      const compliant = (mrcMatch === null || mrcMatch) && (nrcMatch === null || nrcMatch);
      return { ...r, rate_mrc: rateMrc, rate_nrc: rateNrc, mrc_delta: mrcDelta, nrc_delta: nrcDelta, mrc_match: mrcMatch, nrc_match: nrcMatch, compliant };
    });

    const total     = results.length;
    const matched   = results.filter(r => r.compliant).length;
    const mismatched = results.filter(r => r.compliant === false).length;
    const noRate    = results.filter(r => r.rate_mrc === null && r.rate_nrc === null).length;

    res.json({ summary: { total, matched, mismatched, noRate }, items: results });
  } catch (err) {
    console.error('rate-validation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Centralised error handler ─────────────────────────────
// Prevents stack traces / internal details from leaking to the client
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 2001;
app.listen(PORT, () => console.log(`TEMS API server running on port ${PORT}`));

// ── Process-level error handlers — prevent silent crashes ──
process.on('uncaughtException', (err) => {
  console.error('FATAL — uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('FATAL — unhandledRejection:', reason);
  process.exit(1);
});

// Nodemon restart trigger
