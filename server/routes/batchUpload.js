/**
 * @file batchUpload.js — Batch Upload API Routes — /api/batch-upload
 * Handles Excel template parsing and bulk data import.
 * Supports vendors, accounts, contracts, inventory, orders, invoices, line_items.
 *
 * @module routes/batchUpload
 */
// ============================================================
// Batch Upload API — Template download & Excel import
// ============================================================
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const ExcelJS  = require('exceljs');
const db       = require('../db');
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
    if (allowed.includes(file.mimetype) && /\.(xlsx|xls)$/i.test(file.originalname)) {
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
      { column: 'vendors_id', label: 'Vendors ID', required: true, type: 'integer', example: 1 },
      { column: 'name', label: 'Name', required: false, type: 'string', example: 'Example Name' },
      { column: 'account_number', label: 'Account Number', required: true, type: 'string', example: 'NUM-1001' },
      { column: 'subaccount_number', label: 'Subaccount Number', required: false, type: 'string', example: 'NUM-1001' },
      { column: 'assigned_user_id', label: 'Assigned User ID', required: false, type: 'integer', example: 1 },
      { column: 'team', label: 'Team', required: false, type: 'string', example: 'Text' },
      { column: 'account_hierarchy', label: 'Account Hierarchy', required: false, type: 'string', example: 'Text' },
      { column: 'parent_account_id', label: 'Parent Account ID', required: false, type: 'integer', example: 1 },
      { column: 'account_type', label: 'Account Type', required: false, type: 'string', example: 'Text' },
      { column: 'account_subtype', label: 'Account Subtype', required: false, type: 'string', example: 'Text' },
      { column: 'currency_id', label: 'Currency ID', required: false, type: 'integer', example: 1 },
      { column: 'company_code_id', label: 'Company Code ID', required: false, type: 'integer', example: 1 },
      { column: 'ship_to_location_id', label: 'Ship To Location ID', required: false, type: 'integer', example: 1 },
      { column: 'asset_location_id', label: 'Asset Location ID', required: false, type: 'integer', example: 1 },
      { column: 'tax_analyst_id', label: 'Tax Analyst ID', required: false, type: 'integer', example: 1 },
      { column: 'payment_info', label: 'Payment Info', required: false, type: 'string', example: 'Text' },
      { column: 'allocation_settings', label: 'Allocation Settings', required: false, type: 'string', example: 'Text' },
      { column: 'contact_details', label: 'Contact Details', required: false, type: 'string', example: 'Text' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' }
    ]
  },
  allocations: {
    label: 'Allocations',
    columns: [
      { column: 'line_items_id', label: 'Line Items ID', required: true, type: 'integer', example: 1 },
      { column: 'cost_center', label: 'Cost Center', required: false, type: 'string', example: 'Text' },
      { column: 'department', label: 'Department', required: false, type: 'string', example: 'Text' },
      { column: 'percentage', label: 'Percentage', required: false, type: 'decimal', example: 100.5 },
      { column: 'allocated_amount', label: 'Allocated Amount', required: false, type: 'decimal', example: 100.5 },
      { column: 'notes', label: 'Notes', required: false, type: 'string', example: 'Text' }
    ]
  },
  contracts: {
    label: 'Contracts',
    columns: [
      { column: 'vendors_id', label: 'Vendors ID', required: true, type: 'integer', example: 1 },
      { column: 'contract_number', label: 'Contract Number', required: false, type: 'string', example: 'NUM-1001' },
      { column: 'contract_name', label: 'Contract Name', required: false, type: 'string', example: 'Example Name' },
      { column: 'type', label: 'Type', required: false, type: 'string', example: 'Text' },
      { column: 'subtype', label: 'Subtype', required: false, type: 'string', example: 'Text' },
      { column: 'parent_contract_id', label: 'Parent Contract ID', required: false, type: 'integer', example: 1 },
      { column: 'currency_id', label: 'Currency ID', required: false, type: 'integer', example: 1 },
      { column: 'contract_record_url', label: 'Contract Record Url', required: false, type: 'string', example: 'Text' },
      { column: 'start_date', label: 'Start Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'expiration_date', label: 'Expiration Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'term_type', label: 'Term Type', required: false, type: 'string', example: 'Text' },
      { column: 'renew_date', label: 'Renew Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'contracted_rate', label: 'Contracted Rate', required: false, type: 'decimal', example: 100.5 },
      { column: 'rate_unit', label: 'Rate Unit', required: false, type: 'string', example: 'Text' },
      { column: 'term_months', label: 'Term Months', required: false, type: 'integer', example: 10 },
      { column: 'minimum_spend', label: 'Minimum Spend', required: false, type: 'decimal', example: 100.5 },
      { column: 'etf_amount', label: 'Etf Amount', required: false, type: 'decimal', example: 100.5 },
      { column: 'commitment_type', label: 'Commitment Type', required: false, type: 'string', example: 'Text' },
      { column: 'contract_value', label: 'Contract Value', required: false, type: 'decimal', example: 100.5 },
      { column: 'tax_assessed', label: 'Tax Assessed', required: false, type: 'boolean', example: 0 },
      { column: 'product_service_types', label: 'Product Service Types', required: false, type: 'string', example: 'Text' },
      { column: 'business_line', label: 'Business Line', required: false, type: 'string', example: 'Text' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'auto_renew', label: 'Auto Renew', required: false, type: 'boolean', example: 0 }
    ]
  },
  cost_savings: {
    label: 'Cost Savings',
    columns: [
      { column: 'vendors_id', label: 'Vendors ID', required: true, type: 'integer', example: 1 },
      { column: 'inventory_id', label: 'Inventory ID', required: false, type: 'integer', example: 1 },
      { column: 'line_items_id', label: 'Line Items ID', required: false, type: 'integer', example: 1 },
      { column: 'invoices_id', label: 'Invoices ID', required: false, type: 'integer', example: 1 },
      { column: 'category', label: 'Category', required: false, type: 'string', example: 'Text' },
      { column: 'description', label: 'Description', required: false, type: 'string', example: 'Text' },
      { column: 'identified_date', label: 'Identified Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'projected_savings', label: 'Projected Savings', required: false, type: 'decimal', example: 100.5 },
      { column: 'realized_savings', label: 'Realized Savings', required: false, type: 'decimal', example: 100.5 },
      { column: 'notes', label: 'Notes', required: false, type: 'string', example: 'Text' }
    ]
  },
  disputes: {
    label: 'Disputes',
    columns: [
      { column: 'line_items_id', label: 'Line Items ID', required: false, type: 'integer', example: 1 },
      { column: 'invoices_id', label: 'Invoices ID', required: true, type: 'integer', example: 1 },
      { column: 'vendors_id', label: 'Vendors ID', required: true, type: 'integer', example: 1 },
      { column: 'dispute_type', label: 'Dispute Type', required: false, type: 'string', example: 'Text' },
      { column: 'amount', label: 'Amount', required: true, type: 'decimal', example: 100.5 },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'filed_date', label: 'Filed Date', required: true, type: 'date', example: '2024-01-01' },
      { column: 'resolved_date', label: 'Resolved Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'resolution_notes', label: 'Resolution Notes', required: false, type: 'string', example: 'Text' },
      { column: 'credit_amount', label: 'Credit Amount', required: false, type: 'decimal', example: 100.5 },
      { column: 'reference_number', label: 'Reference Number', required: false, type: 'string', example: 'NUM-1001' },
      { column: 'notes', label: 'Notes', required: false, type: 'string', example: 'Text' }
    ]
  },
  inventory: {
    label: 'Inventory',
    columns: [
      { column: 'accounts_id', label: 'Accounts ID', required: true, type: 'integer', example: 1 },
      { column: 'contracts_id', label: 'Contracts ID', required: true, type: 'integer', example: 1 },
      { column: 'orders_id', label: 'Orders ID', required: false, type: 'integer', example: 1 },
      { column: 'inventory_number', label: 'Inventory Number', required: true, type: 'string', example: 'NUM-1001' },
      { column: 'type', label: 'Type', required: false, type: 'string', example: 'Text' },
      { column: 'bandwidth', label: 'Bandwidth', required: false, type: 'string', example: 1 },
      { column: 'location', label: 'Location', required: false, type: 'string', example: 'Text' },
      { column: 'contracted_rate', label: 'Contracted Rate', required: false, type: 'decimal', example: 100.5 },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'install_date', label: 'Install Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'disconnect_date', label: 'Disconnect Date', required: false, type: 'date', example: '2024-01-01' }
    ]
  },
  invoices: {
    label: 'Invoices',
    columns: [
      { column: 'accounts_id', label: 'Accounts ID', required: true, type: 'integer', example: 1 },
      { column: 'invoice_number', label: 'Invoice Number', required: true, type: 'string', example: 'NUM-1001' },
      { column: 'invoice_date', label: 'Invoice Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'due_date', label: 'Due Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'period_start', label: 'Period Start', required: false, type: 'date', example: 'Text' },
      { column: 'period_end', label: 'Period End', required: false, type: 'date', example: 'Text' },
      { column: 'total_amount', label: 'Total Amount', required: true, type: 'decimal', example: 100.5 },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'payment_date', label: 'Payment Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'assigned_users_id', label: 'Assigned Users ID', required: false, type: 'integer', example: 1 }
    ]
  },
  line_items: {
    label: 'Line Items',
    columns: [
      { column: 'invoices_id', label: 'Invoices ID', required: true, type: 'integer', example: 1 },
      { column: 'inventory_id', label: 'Inventory ID', required: false, type: 'integer', example: 1 },
      { column: 'usoc_codes_id', label: 'Usoc Codes ID', required: false, type: 'integer', example: 1 },
      { column: 'description', label: 'Description', required: false, type: 'string', example: 'Text' },
      { column: 'charge_type', label: 'Charge Type', required: false, type: 'string', example: 'Text' },
      { column: 'amount', label: 'Amount', required: true, type: 'decimal', example: 100.5 },
      { column: 'mrc_amount', label: 'Mrc Amount', required: false, type: 'decimal', example: 100.5 },
      { column: 'nrc_amount', label: 'Nrc Amount', required: false, type: 'decimal', example: 100.5 },
      { column: 'contracted_rate', label: 'Contracted Rate', required: false, type: 'decimal', example: 100.5 },
      { column: 'variance', label: 'Variance', required: false, type: 'decimal', example: 100.5 },
      { column: 'audit_status', label: 'Audit Status', required: false, type: 'string', example: 'Text' },
      { column: 'period_start', label: 'Period Start', required: false, type: 'date', example: 'Text' },
      { column: 'period_end', label: 'Period End', required: false, type: 'date', example: 'Text' }
    ]
  },
  locations: {
    label: 'Locations',
    columns: [
      { column: 'name', label: 'Name', required: true, type: 'string', example: 'Example Name' },
      { column: 'site_code', label: 'Site Code', required: false, type: 'string', example: 'Text' },
      { column: 'site_type', label: 'Site Type', required: false, type: 'string', example: 'Text' },
      { column: 'address', label: 'Address', required: false, type: 'string', example: 'Text' },
      { column: 'city', label: 'City', required: false, type: 'string', example: 'Text' },
      { column: 'state', label: 'State', required: false, type: 'string', example: 'Text' },
      { column: 'zip', label: 'Zip', required: false, type: 'string', example: 'Text' },
      { column: 'country', label: 'Country', required: false, type: 'string', example: 'Text' },
      { column: 'contact_name', label: 'Contact Name', required: false, type: 'string', example: 'Example Name' },
      { column: 'contact_phone', label: 'Contact Phone', required: false, type: 'string', example: '555-0199' },
      { column: 'contact_email', label: 'Contact Email', required: false, type: 'string', example: 'test@example.com' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'notes', label: 'Notes', required: false, type: 'string', example: 'Text' }
    ]
  },
  orders: {
    label: 'Orders',
    columns: [
      { column: 'vendors_id', label: 'Vendors ID', required: true, type: 'integer', example: 1 },
      { column: 'contracts_id', label: 'Contracts ID', required: true, type: 'integer', example: 1 },
      { column: 'inventory_id', label: 'Inventory ID', required: false, type: 'integer', example: 1 },
      { column: 'order_number', label: 'Order Number', required: true, type: 'string', example: 'NUM-1001' },
      { column: 'description', label: 'Description', required: false, type: 'string', example: 'Text' },
      { column: 'contracted_rate', label: 'Contracted Rate', required: false, type: 'decimal', example: 100.5 },
      { column: 'order_date', label: 'Order Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'due_date', label: 'Due Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'notes', label: 'Notes', required: false, type: 'string', example: 'Text' },
      { column: 'assigned_users_id', label: 'Assigned Users ID', required: false, type: 'integer', example: 1 }
    ]
  },
  spend_categories: {
    label: 'Spend Categories',
    columns: [
      { column: 'name', label: 'Name', required: true, type: 'string', example: 'Example Name' },
      { column: 'code', label: 'Code', required: false, type: 'string', example: 'Text' },
      { column: 'description', label: 'Description', required: false, type: 'string', example: 'Text' },
      { column: 'parent_id', label: 'Parent ID', required: false, type: 'integer', example: 1 },
      { column: 'is_active', label: 'Is Active', required: false, type: 'boolean', example: 0 }
    ]
  },
  tickets: {
    label: 'Tickets',
    columns: [
      { column: 'ticket_number', label: 'Ticket Number', required: true, type: 'string', example: 'NUM-1001' },
      { column: 'title', label: 'Title', required: true, type: 'string', example: 'Text' },
      { column: 'description', label: 'Description', required: false, type: 'string', example: 'Text' },
      { column: 'category', label: 'Category', required: false, type: 'string', example: 'Text' },
      { column: 'priority', label: 'Priority', required: false, type: 'string', example: 'Text' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' },
      { column: 'source_entity_type', label: 'Source Entity Type', required: false, type: 'string', example: 'Text' },
      { column: 'source_entity_id', label: 'Source Entity ID', required: false, type: 'integer', example: 1 },
      { column: 'source_entity_label', label: 'Source Entity Label', required: false, type: 'string', example: 'Text' },
      { column: 'assigned_users_id', label: 'Assigned Users ID', required: false, type: 'integer', example: 1 },
      { column: 'due_date', label: 'Due Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'resolved_date', label: 'Resolved Date', required: false, type: 'date', example: '2024-01-01' },
      { column: 'resolution', label: 'Resolution', required: false, type: 'string', example: 'Text' },
      { column: 'tags', label: 'Tags', required: false, type: 'string', example: 'Text' },
      { column: 'environment', label: 'Environment', required: false, type: 'string', example: 'Text' },
      { column: 'steps_to_reproduce', label: 'Steps To Reproduce', required: false, type: 'string', example: 'Text' },
      { column: 'expected_behavior', label: 'Expected Behavior', required: false, type: 'string', example: 'Text' },
      { column: 'actual_behavior', label: 'Actual Behavior', required: false, type: 'string', example: 'Text' },
      { column: 'console_errors', label: 'Console Errors', required: false, type: 'string', example: 'Text' },
      { column: 'browser_info', label: 'Browser Info', required: false, type: 'string', example: 'Text' }
    ]
  },
  usoc_codes: {
    label: 'Usoc Codes',
    columns: [
      { column: 'usoc_code', label: 'Usoc Code', required: true, type: 'string', example: 'Text' },
      { column: 'description', label: 'Description', required: true, type: 'string', example: 'Text' },
      { column: 'category', label: 'Category', required: false, type: 'string', example: 'Text' },
      { column: 'sub_category', label: 'Sub Category', required: false, type: 'string', example: 'Text' },
      { column: 'default_mrc', label: 'Default Mrc', required: false, type: 'decimal', example: 100.5 },
      { column: 'default_nrc', label: 'Default Nrc', required: false, type: 'decimal', example: 100.5 },
      { column: 'unit', label: 'Unit', required: false, type: 'string', example: 'Text' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' }
    ]
  },
  vendors: {
    label: 'Vendors',
    columns: [
      { column: 'name', label: 'Name', required: true, type: 'string', example: 'Example Name' },
      { column: 'vendor_number', label: 'Vendor Number', required: false, type: 'string', example: 'NUM-1001' },
      { column: 'vendor_type', label: 'Vendor Type', required: false, type: 'string', example: 'Text' },
      { column: 'contact_name', label: 'Contact Name', required: false, type: 'string', example: 'Example Name' },
      { column: 'contact_email', label: 'Contact Email', required: false, type: 'string', example: 'test@example.com' },
      { column: 'contact_phone', label: 'Contact Phone', required: false, type: 'string', example: '555-0199' },
      { column: 'country', label: 'Country', required: false, type: 'string', example: 'Text' },
      { column: 'currency_id', label: 'Currency ID', required: false, type: 'integer', example: 1 },
      { column: 'tier', label: 'Tier', required: false, type: 'string', example: 'Text' },
      { column: 'fourth_party_vendor', label: 'Fourth Party Vendor', required: false, type: 'boolean', example: 0 },
      { column: 'website', label: 'Website', required: false, type: 'string', example: 'Text' },
      { column: 'status', label: 'Status', required: false, type: 'string', example: 'Active' }
    ]
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
router.get('/template/:table', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  const tableName = req.params.table;
  const def = TABLE_DEFS[tableName];
  if (!def) return res.status(400).json({ error: `Unknown table: ${tableName}` });

  const wb = new ExcelJS.Workbook();

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
  const instrSheet = wb.addWorksheet('Instructions');
  instrData.forEach(row => instrSheet.addRow(row));
  instrSheet.columns = [{ width: 25 }, { width: 20 }, { width: 10 }, { width: 10 }, { width: 25 }];

  // Data sheet with headers + one example row
  const dataSheet = wb.addWorksheet('Data');
  dataSheet.addRow(headers);
  dataSheet.addRow(exampleRow);
  dataSheet.columns = def.columns.map(c => ({ width: Math.max(c.label.length + 3, 15) }));

  const buf = await wb.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="TEMS_Template_${def.label.replace(/\s+/g, '_')}.xlsx"`);
  res.send(Buffer.from(buf));
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
      // Handle Excel Date objects (ExcelJS returns JS Date for date cells)
      if (raw instanceof Date) {
        return raw.toISOString().slice(0, 10);
      }
      // Handle Excel serial date numbers
      if (typeof raw === 'number') {
        const epoch = new Date((raw - 25569) * 86400 * 1000);
        if (!isNaN(epoch.getTime())) return epoch.toISOString().slice(0, 10);
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
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);

    // Find the "Data" sheet, or use the first sheet
    const dataSheetName = wb.worksheets.find(ws => ws.name === 'Data') ? 'Data' : wb.worksheets[0]?.name;
    const sheet = wb.getWorksheet(dataSheetName);
    if (!sheet || sheet.rowCount < 2) return res.status(400).json({ error: 'No data rows found in the uploaded file' });

    // Convert ExcelJS worksheet to array of objects (like XLSX.utils.sheet_to_json)
    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = cell.value != null ? String(cell.value).trim() : '';
    });
    const raw = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const obj = {};
      let hasData = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = headers[colNumber];
        if (key) {
          obj[key] = cell.value != null ? cell.value : '';
          if (cell.value != null && cell.value !== '') hasData = true;
        }
      });
      if (hasData) raw.push(obj);
    }

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

    // ── Duplicate detection ─────────────────────────────────
    // For tables with a natural business key, check for existing records
    // and warn the user before allowing re-import.
    const DEDUP_KEYS = {
      invoices:  'invoice_number',
      vendors:   'vendor_number',
      accounts:  'account_number',
      contracts: 'contract_number',
      inventory: 'inventory_number',
      orders:    'order_number',
    };

    const dedupCol = DEDUP_KEYS[tableName];
    if (dedupCol) {
      const uploadedValues = [...new Set(rows.map(r => r[dedupCol]).filter(Boolean))];
      if (uploadedValues.length) {
        // Query in batches of 500 to avoid param-limit issues
        const existingSet = new Set();
        for (let i = 0; i < uploadedValues.length; i += 500) {
          const chunk = uploadedValues.slice(i, i + 500);
          const found = await db(tableName).select(dedupCol).whereIn(dedupCol, chunk);
          found.forEach(r => existingSet.add(String(r[dedupCol])));
        }

        if (existingSet.size > 0) {
          const dupList = [...existingSet].slice(0, 25);
          const dupRows = rows.filter(r => existingSet.has(String(r[dedupCol])));
          return res.status(409).json({
            error: 'Duplicate records detected',
            message: `${existingSet.size} of ${uploadedValues.length} ${def.label.toLowerCase()} already exist in the database. `
              + `Purge the existing records first (Admin → Purge Tool), then re-upload.`,
            duplicateCount: existingSet.size,
            duplicateColumn: dedupCol,
            duplicates: dupList,
            affectedRows: dupRows.length,
            totalRows: raw.length,
          });
        }
      }
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
