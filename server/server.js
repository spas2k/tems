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

// ── Health check (no auth — for load balancers & uptime monitors) ──
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
app.use('/api/contracts',    require('./routes/contracts'));
app.use('/api/inventory',     require('./routes/inventory'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/invoices',     require('./routes/invoices'));
app.use('/api/line-items',   require('./routes/lineItems'));
app.use('/api/allocations',  require('./routes/allocations'));
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
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/workflows',      require('./routes/workflows'));
// Dashboard summary
app.get('/api/dashboard', async (req, res) => {
  try {
    const [
      countAccounts,
      countContracts,
      countInventory,
      countInvoices,
      sumBilled,
      sumVariance,
      sumSavings,
      countOrders,
      sumMrc,
      sumNrc,
      auditValidated,
      auditVariance,
      auditPending,
      countDisputes,
    ] = await Promise.all([
      db('accounts').count('* as val').first(),
      db('contracts').where('status', 'Active').count('* as val').first(),
      db('inventory').where('status', 'Active').count('* as val').first(),
      db('invoices').whereIn('status', ['Open', 'Disputed']).count('* as val').first(),
      db('invoices').sum('total_amount as val').first(),
      db('line_items').whereNotNull('variance').sum('variance as val').first(),
      db('cost_savings').whereNot('status', 'Resolved').sum('projected_savings as val').first(),
      db('orders').where('status', 'In Progress').count('* as val').first(),
      db('line_items').whereNotNull('mrc_amount').sum('mrc_amount as val').first(),
      db('line_items').whereNotNull('nrc_amount').sum('nrc_amount as val').first(),
      db('line_items').where('audit_status', 'Validated').count('* as val').first(),
      db('line_items').where('audit_status', 'Variance').count('* as val').first(),
      db('line_items').where('audit_status', 'Pending').count('* as val').first(),
      db.schema.hasTable('disputes').then(exists =>
        exists ? db('disputes').whereNot('status', 'Closed').count('* as val').first() : { val: 0 }
      ),
    ]);

    const totalAccounts          = Number(countAccounts.val);
    const activeContracts        = Number(countContracts.val);
    const activeInventory         = Number(countInventory.val);
    const openInvoices           = Number(countInvoices.val);
    const totalBilled            = Number(sumBilled.val)    || 0;
    const totalVariance          = Number(sumVariance.val)   || 0;
    const totalSavingsIdentified = Number(sumSavings.val)    || 0;
    const pendingOrders          = Number(countOrders.val);
    const totalMrc               = Number(sumMrc.val)        || 0;
    const totalNrc               = Number(sumNrc.val)        || 0;
    const auditCounts = {
      validated: Number(auditValidated.val),
      variance:  Number(auditVariance.val),
      pending:   Number(auditPending.val),
    };
    const openDisputes           = Number(countDisputes.val);

    const recentInvoices = await db('invoices as i')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .select('i.*', 'a.name as account_name')
      .orderBy('i.invoice_date', 'desc')
      .limit(5);

    const savingsOpportunities = await db('cost_savings as cs')
      .leftJoin('vendors as v', 'cs.vendors_id', 'v.vendors_id')
      .select('cs.*', 'v.name as vendor_name')
      .whereNot('cs.status', 'Resolved')
      .orderBy('cs.identified_date', 'desc');

    // Recent variances — line items with non-zero variance
    const recentVariances = await db('line_items as li')
      .leftJoin('invoices as i', 'li.invoices_id', 'i.invoices_id')
      .leftJoin('inventory as ci', 'li.inventory_id', 'ci.inventory_id')
      .leftJoin('accounts as a', 'i.accounts_id', 'a.accounts_id')
      .select('li.line_items_id', 'li.description', 'li.amount', 'li.contracted_rate', 'li.variance', 'li.audit_status',
              'i.invoice_number', 'i.invoices_id', 'ci.inventory_number', 'a.name as account_name')
      .where('li.audit_status', 'Variance')
      .orderBy('li.line_items_id', 'desc')
      .limit(10);

    res.json({
      totalAccounts, activeContracts, activeInventory, openInvoices,
      totalBilled, totalVariance, totalSavingsIdentified, pendingOrders,
      totalMrc, totalNrc, auditCounts, openDisputes,
      recentInvoices, savingsOpportunities, recentVariances,
    });
  } catch (err) {
    console.error('dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

// Nodemon restart trigger
