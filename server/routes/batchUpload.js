// ============================================================
// Batch Upload API — Template download & Excel import
// ============================================================
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const XLSX    = require('xlsx');
const db      = require('../db');
const safeError = require('./_safeError');
const { auditCreate } = require('../middleware/audit');
const { requireRole } = require('../middleware/auth');

// ── Multer: accept single .xlsx/.xls file up to 5 MB ────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .xls files are accepted'));
    }
  },
});

// ── Table definitions — columns available for batch upload ──
// Each entry: { column, label, required, type, example }
// Excluded: auto-increment PKs, timestamps, computed fields
const TABLE_DEFS = {
  accounts: {
    label: 'Accounts',
    columns: [
      { column: 'name',          label: 'Name',          required: true,  type: 'string',  example: 'AT&T' },
      { column: 'account_number',label: 'Account Number', required: false, type: 'string',  example: 'ATT-001' },
      { column: 'vendor_type',   label: 'Vendor Type',   required: false, type: 'string',  example: 'Telecom' },
      { column: 'contact_email', label: 'Contact Email',  required: false, type: 'string',  example: 'billing@att.com' },
      { column: 'contact_phone', label: 'Contact Phone',  required: false, type: 'string',  example: '800-288-2020' },
      { column: 'status',        label: 'Status',         required: false, type: 'string',  example: 'Active' },
    ],
  },
  contracts: {
    label: 'Contracts',
    columns: [
      { column: 'accounts_id',    label: 'Account ID',       required: true,  type: 'integer', example: 1 },
      { column: 'name',           label: 'Name',             required: true,  type: 'string',  example: 'AT&T MPLS Agreement' },
      { column: 'contract_number',label: 'Contract Number',   required: false, type: 'string',  example: 'CTR-2024-001' },
      { column: 'start_date',     label: 'Start Date',        required: false, type: 'date',    example: '2024-01-01' },
      { column: 'end_date',       label: 'End Date',          required: false, type: 'date',    example: '2027-01-01' },
      { column: 'contracted_rate',label: 'Contracted Rate',   required: false, type: 'decimal', example: 1500.00 },
      { column: 'rate_unit',      label: 'Rate Unit',         required: false, type: 'string',  example: 'Monthly' },
      { column: 'term_months',    label: 'Term (Months)',     required: false, type: 'integer', example: 36 },
      { column: 'status',         label: 'Status',            required: false, type: 'string',  example: 'Active' },
      { column: 'auto_renew',     label: 'Auto Renew (0/1)',  required: false, type: 'integer', example: 0 },
    ],
  },
  circuits: {
    label: 'Circuits',
    columns: [
      { column: 'accounts_id',    label: 'Account ID',     required: true,  type: 'integer', example: 1 },
      { column: 'contracts_id',   label: 'Contract ID',    required: true,  type: 'integer', example: 1 },
      { column: 'orders_id',      label: 'Order ID',       required: false, type: 'integer', example: '' },
      { column: 'circuit_number', label: 'Circuit Number',  required: true,  type: 'string',  example: 'CKT-ATT-1001' },
      { column: 'type',           label: 'Type',            required: false, type: 'string',  example: 'MPLS' },
      { column: 'bandwidth',      label: 'Bandwidth',       required: false, type: 'string',  example: '100 Mbps' },
      { column: 'location',       label: 'Location',        required: false, type: 'string',  example: 'New York, NY' },
      { column: 'contracted_rate',label: 'Contracted Rate', required: false, type: 'decimal', example: 750.00 },
      { column: 'status',         label: 'Status',          required: false, type: 'string',  example: 'Active' },
      { column: 'install_date',   label: 'Install Date',    required: false, type: 'date',    example: '2024-03-15' },
      { column: 'disconnect_date',label: 'Disconnect Date', required: false, type: 'date',    example: '' },
    ],
  },
  orders: {
    label: 'Orders',
    columns: [
      { column: 'accounts_id',    label: 'Account ID',     required: true,  type: 'integer', example: 1 },
      { column: 'contracts_id',   label: 'Contract ID',    required: true,  type: 'integer', example: 1 },
      { column: 'circuits_id',    label: 'Circuit ID',     required: false, type: 'integer', example: '' },
      { column: 'order_number',   label: 'Order Number',   required: true,  type: 'string',  example: 'ORD-2024-001' },
      { column: 'description',    label: 'Description',    required: false, type: 'string',  example: 'New MPLS site install' },
      { column: 'contracted_rate',label: 'Contracted Rate', required: false, type: 'decimal', example: 1500.00 },
      { column: 'order_date',     label: 'Order Date',      required: false, type: 'date',    example: '2024-02-01' },
      { column: 'due_date',       label: 'Due Date',        required: false, type: 'date',    example: '2024-04-01' },
      { column: 'status',         label: 'Status',          required: false, type: 'string',  example: 'In Progress' },
      { column: 'notes',          label: 'Notes',           required: false, type: 'string',  example: '' },
    ],
  },
  invoices: {
    label: 'Invoices',
    columns: [
      { column: 'accounts_id',   label: 'Account ID',     required: true,  type: 'integer', example: 1 },
      { column: 'invoice_number', label: 'Invoice Number',  required: true,  type: 'string',  example: 'INV-2024-0001' },
      { column: 'invoice_date',   label: 'Invoice Date',    required: false, type: 'date',    example: '2024-03-01' },
      { column: 'due_date',       label: 'Due Date',        required: false, type: 'date',    example: '2024-04-01' },
      { column: 'period_start',   label: 'Period Start',    required: false, type: 'date',    example: '2024-03-01' },
      { column: 'period_end',     label: 'Period End',      required: false, type: 'date',    example: '2024-03-31' },
      { column: 'total_amount',   label: 'Total Amount',    required: false, type: 'decimal', example: 5250.00 },
      { column: 'status',         label: 'Status',          required: false, type: 'string',  example: 'Open' },
      { column: 'payment_date',   label: 'Payment Date',    required: false, type: 'date',    example: '' },
    ],
  },
  line_items: {
    label: 'Line Items',
    columns: [
      { column: 'invoices_id',    label: 'Invoice ID',      required: true,  type: 'integer', example: 1 },
      { column: 'circuits_id',    label: 'Circuit ID',      required: false, type: 'integer', example: 1 },
      { column: 'usoc_codes_id',  label: 'USOC Code ID',    required: false, type: 'integer', example: '' },
      { column: 'description',    label: 'Description',     required: false, type: 'string',  example: 'MPLS Port — 100 Mbps' },
      { column: 'charge_type',    label: 'Charge Type',     required: false, type: 'string',  example: 'MRC' },
      { column: 'amount',         label: 'Amount',          required: true,  type: 'decimal', example: 750.00 },
      { column: 'mrc_amount',     label: 'MRC Amount',      required: false, type: 'decimal', example: 750.00 },
      { column: 'nrc_amount',     label: 'NRC Amount',      required: false, type: 'decimal', example: 0 },
      { column: 'contracted_rate',label: 'Contracted Rate',  required: false, type: 'decimal', example: 750.00 },
      { column: 'variance',       label: 'Variance',        required: false, type: 'decimal', example: 0 },
      { column: 'audit_status',   label: 'Audit Status',    required: false, type: 'string',  example: 'Pending' },
      { column: 'period_start',   label: 'Period Start',    required: false, type: 'date',    example: '2024-03-01' },
      { column: 'period_end',     label: 'Period End',      required: false, type: 'date',    example: '2024-03-31' },
    ],
  },
  allocations: {
    label: 'Allocations',
    columns: [
      { column: 'line_items_id',   label: 'Line Item ID',    required: true,  type: 'integer', example: 1 },
      { column: 'cost_center',     label: 'Cost Center',     required: false, type: 'string',  example: 'CC-1001' },
      { column: 'department',      label: 'Department',      required: false, type: 'string',  example: 'Engineering' },
      { column: 'percentage',      label: 'Percentage',      required: false, type: 'decimal', example: 50.00 },
      { column: 'allocated_amount',label: 'Allocated Amount', required: false, type: 'decimal', example: 375.00 },
      { column: 'notes',           label: 'Notes',           required: false, type: 'string',  example: '' },
    ],
  },
  cost_savings: {
    label: 'Cost Savings',
    columns: [
      { column: 'accounts_id',       label: 'Account ID',        required: true,  type: 'integer', example: 1 },
      { column: 'circuits_id',       label: 'Circuit ID',        required: false, type: 'integer', example: '' },
      { column: 'line_items_id',     label: 'Line Item ID',      required: false, type: 'integer', example: '' },
      { column: 'invoices_id',       label: 'Invoice ID',        required: false, type: 'integer', example: '' },
      { column: 'category',          label: 'Category',          required: false, type: 'string',  example: 'Overcharge' },
      { column: 'description',       label: 'Description',       required: false, type: 'string',  example: 'Duplicate MRC billing' },
      { column: 'identified_date',   label: 'Identified Date',   required: false, type: 'date',    example: '2024-03-15' },
      { column: 'status',            label: 'Status',            required: false, type: 'string',  example: 'Identified' },
      { column: 'projected_savings', label: 'Projected Savings', required: false, type: 'decimal', example: 500.00 },
      { column: 'realized_savings',  label: 'Realized Savings',  required: false, type: 'decimal', example: 0 },
      { column: 'notes',             label: 'Notes',             required: false, type: 'string',  example: '' },
    ],
  },
  usoc_codes: {
    label: 'USOC Codes',
    columns: [
      { column: 'usoc_code',    label: 'USOC Code',    required: true,  type: 'string',  example: 'MPL01' },
      { column: 'description',  label: 'Description',  required: true,  type: 'string',  example: 'MPLS Port — 100 Mbps' },
      { column: 'category',     label: 'Category',     required: false, type: 'string',  example: 'Access' },
      { column: 'sub_category', label: 'Sub Category', required: false, type: 'string',  example: 'Data' },
      { column: 'default_mrc',  label: 'Default MRC',  required: false, type: 'decimal', example: 500.00 },
      { column: 'default_nrc',  label: 'Default NRC',  required: false, type: 'decimal', example: 0 },
      { column: 'unit',         label: 'Unit',         required: false, type: 'string',  example: 'per circuit' },
      { column: 'status',       label: 'Status',       required: false, type: 'string',  example: 'Active' },
    ],
  },
  contract_rates: {
    label: 'Contract Rates',
    columns: [
      { column: 'contracts_id',   label: 'Contract ID',     required: true,  type: 'integer', example: 1 },
      { column: 'usoc_codes_id',  label: 'USOC Code ID',    required: true,  type: 'integer', example: 1 },
      { column: 'mrc',            label: 'MRC',             required: false, type: 'decimal', example: 500.00 },
      { column: 'nrc',            label: 'NRC',             required: false, type: 'decimal', example: 0 },
      { column: 'effective_date', label: 'Effective Date',  required: false, type: 'date',    example: '2024-01-01' },
      { column: 'expiration_date',label: 'Expiration Date', required: false, type: 'date',    example: '' },
      { column: 'notes',          label: 'Notes',           required: false, type: 'string',  example: '' },
    ],
  },
  disputes: {
    label: 'Disputes',
    columns: [
      { column: 'line_items_id',    label: 'Line Item ID',    required: false, type: 'integer', example: '' },
      { column: 'invoices_id',      label: 'Invoice ID',      required: true,  type: 'integer', example: 1 },
      { column: 'accounts_id',      label: 'Account ID',      required: true,  type: 'integer', example: 1 },
      { column: 'dispute_type',     label: 'Dispute Type',    required: false, type: 'string',  example: 'Overcharge' },
      { column: 'amount',           label: 'Amount',          required: false, type: 'decimal', example: 250.00 },
      { column: 'status',           label: 'Status',          required: false, type: 'string',  example: 'Open' },
      { column: 'filed_date',       label: 'Filed Date',      required: true,  type: 'date',    example: '2024-03-15' },
      { column: 'resolved_date',    label: 'Resolved Date',   required: false, type: 'date',    example: '' },
      { column: 'resolution_notes', label: 'Resolution Notes',required: false, type: 'string',  example: '' },
      { column: 'credit_amount',    label: 'Credit Amount',   required: false, type: 'decimal', example: '' },
      { column: 'reference_number', label: 'Reference Number',required: false, type: 'string',  example: '' },
      { column: 'notes',            label: 'Notes',           required: false, type: 'string',  example: '' },
    ],
  },
};

// ── GET /tables — list available tables for upload ──────────
router.get('/tables', (_req, res) => {
  const tables = Object.entries(TABLE_DEFS).map(([key, def]) => ({
    key,
    label: def.label,
    columnCount: def.columns.length,
    requiredColumns: def.columns.filter(c => c.required).map(c => c.label),
  }));
  res.json(tables);
});

// ── GET /template/:table — download Excel template (Analyst+) ──
router.get('/template/:table', requireRole('Admin', 'Manager', 'Analyst'), (req, res) => {
  const tableName = req.params.table;
  const def = TABLE_DEFS[tableName];
  if (!def) return res.status(400).json({ error: `Unknown table: ${tableName}` });

  const wb = XLSX.utils.book_new();

  // Header row = column labels
  const headers = def.columns.map(c => c.required ? `${c.label} *` : c.label);
  const exampleRow = def.columns.map(c => c.example);

  // Instructions sheet
  const instrData = [
    ['TEMS Batch Upload Template'],
    [`Table: ${def.label}`],
    [''],
    ['Instructions:'],
    ['1. Fill in the data starting on the "Data" sheet, row 2 (row 1 is headers).'],
    ['2. Columns marked with * are required.'],
    ['3. Date fields should use YYYY-MM-DD format.'],
    ['4. Integer ID fields reference existing records in the database.'],
    ['5. Do not modify the header row.'],
    ['6. Save as .xlsx and upload via the Batch Upload page.'],
    [''],
    ['Column Reference:'],
    ['Column Name', 'DB Field', 'Required', 'Type', 'Example'],
    ...def.columns.map(c => [c.label, c.column, c.required ? 'Yes' : 'No', c.type, String(c.example ?? '')]),
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instrData);
  instrSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  // Data sheet with headers + one example row
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  dataSheet['!cols'] = def.columns.map(c => ({ wch: Math.max(c.label.length + 3, 15) }));
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="TEMS_Template_${def.label.replace(/\s+/g, '_')}.xlsx"`);
  res.send(buf);
});

// ── Helper: coerce a cell value to the expected column type ──
function coerceValue(raw, colDef) {
  if (raw === null || raw === undefined || raw === '') return null;

  switch (colDef.type) {
    case 'integer': {
      const n = Number(raw);
      if (isNaN(n) || !Number.isInteger(n)) throw new Error(`"${colDef.label}" must be an integer, got "${raw}"`);
      return n;
    }
    case 'decimal': {
      const n = Number(raw);
      if (isNaN(n)) throw new Error(`"${colDef.label}" must be a number, got "${raw}"`);
      return n;
    }
    case 'date': {
      // Handle Excel serial date numbers
      if (typeof raw === 'number') {
        const d = XLSX.SSF.parse_date_code(raw);
        if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
      }
      const s = String(raw).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // Try parsing common date formats
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
      throw new Error(`"${colDef.label}" must be a valid date (YYYY-MM-DD), got "${raw}"`);
    }
    default:
      return String(raw).trim();
  }
}

// ── POST /upload/:table — parse Excel & insert rows ─────────
router.post('/upload/:table', requireRole('Admin', 'Manager'), upload.single('file'), async (req, res) => {
  const tableName = req.params.table;
  const def = TABLE_DEFS[tableName];
  if (!def) return res.status(400).json({ error: `Unknown table: ${tableName}` });

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });

    // Find the "Data" sheet, or use the first sheet
    const sheetName = wb.SheetNames.includes('Data') ? 'Data' : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!raw.length) return res.status(400).json({ error: 'No data rows found in the uploaded file' });

    // Map header labels → column definitions
    // Build a lookup from the label (with or without " *") to the colDef
    const labelMap = {};
    def.columns.forEach(c => {
      labelMap[c.label] = c;
      labelMap[`${c.label} *`] = c;
      // Also try lowercase
      labelMap[c.label.toLowerCase()] = c;
      labelMap[`${c.label.toLowerCase()} *`] = c;
    });

    const errors = [];
    const rows = [];

    raw.forEach((row, idx) => {
      const rowNum = idx + 2; // +2 because row 1 is header, 0-indexed
      const record = {};
      const rowErrors = [];

      // Map each header in the row to a column definition
      for (const [header, value] of Object.entries(row)) {
        const colDef = labelMap[header] || labelMap[header.trim()];
        if (!colDef) continue; // skip unrecognized columns

        try {
          const coerced = coerceValue(value, colDef);
          if (coerced !== null) record[colDef.column] = coerced;
        } catch (e) {
          rowErrors.push(`Row ${rowNum}: ${e.message}`);
        }
      }

      // Check required fields
      def.columns.filter(c => c.required).forEach(c => {
        if (record[c.column] === undefined || record[c.column] === null || record[c.column] === '') {
          rowErrors.push(`Row ${rowNum}: "${c.label}" is required`);
        }
      });

      if (rowErrors.length) {
        errors.push(...rowErrors);
      } else {
        rows.push(record);
      }
    });

    // If any errors, return them without inserting anything
    if (errors.length) {
      return res.status(400).json({
        error: 'Validation errors found',
        totalRows: raw.length,
        validRows: rows.length,
        errorCount: errors.length,
        details: errors.slice(0, 50), // cap at 50 error messages
      });
    }

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db(tableName).insert(batch);
      inserted += batch.length;
    }

    res.json({
      success: true,
      table: tableName,
      tableLabel: def.label,
      inserted,
      totalRows: raw.length,
    });
  } catch (err) {
    // Multer error
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large — maximum 5 MB' });
    }
    safeError(res, err, 'batch-upload');
  }
});

module.exports = router;
