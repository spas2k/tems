/**
 * @file invoiceReader.js — Invoice Reader API Routes — /api/invoice-reader
 * PDF invoice upload, OCR parsing, and automated line-item extraction.
 * Supports upload, profile-based parsing, and manual review workflows.
 *
 * @module routes/invoiceReader
 */
// ============================================================
// Invoice Reader API — Dynamic invoice parsing & batch import
// Supports EDI (X12 810), Excel (.xlsx/.xls), and PDF formats
// ============================================================
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const ExcelJS  = require('exceljs');
const pdf      = require('pdf-parse');
const db       = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');
const { notifyAll } = require('../services/notifications');

// ── Multer: accept common invoice file types up to 20 MB ────
const ALLOWED_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',       // .xls
  'text/csv',                        // .csv
  'application/csv',
  'text/plain',                      // .txt / .edi
  'application/pdf',                 // .pdf
  'application/edi-x12',
  'application/edifact',
]);
const ALLOWED_EXT = /\.(xlsx|xls|csv|edi|txt|pdf)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extOk  = ALLOWED_EXT.test(file.originalname);
    const mimeOk = ALLOWED_MIMES.has(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Accepted: .xlsx, .xls, .csv, .edi, .txt, .pdf'));
    }
  },
});

// ── Format detection ─────────────────────────────────────────
function detectFormat(fileName, buffer) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (['xlsx', 'xls'].includes(ext)) return 'Excel';
  if (ext === 'csv') return 'Excel'; // XLSX library handles CSV

  // Check for EDI content markers in text files
  const head = buffer.slice(0, 500).toString('utf8');
  if (head.includes('ISA') && (head.includes('~') || head.includes('\n'))) return 'EDI';

  // Default to Excel for .txt (tab-delimited) etc.
  return 'Excel';
}

// ── Excel / CSV parser ───────────────────────────────────────
// Single-pass: read all rows, slice first 20 for preview
async function parseExcel(buffer, fileName) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheets = [];
  for (const ws of wb.worksheets) {
    const allRows = [];
    let headers = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        values[colNumber - 1] = cell.value != null ? cell.value : null;
      });
      if (rowNumber === 1) {
        headers = values.map(v => v != null ? String(v).trim() : '');
      } else {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? null; });
        allRows.push(obj);
      }
    });
    const totalRows = ws.rowCount - 1; // exclude header
    const previewRows = allRows.slice(0, 20);
    sheets.push({ name: ws.name, headers, totalRows, previewRows, allRows });
  }
  return { format: 'Excel', fileName, sheets };
}

// ── EDI (X12 810) parser — telecom-aware ─────────────────────
function parseEDI(buffer) {
  const raw = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect X12 delimiters from the ISA segment.
  // Standard ISA is 106 chars with fixed positions, but many vendors
  // (e.g., Granite) send compact/non-padded ISA segments.
  // ISA[3] = element delimiter (always reliable).
  // For sub-element & segment terminators, split ISA by elemDelim:
  //   ISA has 16 data fields → split produces 17 pieces.
  //   Piece[16] starts with ISA16 (sub-elem sep) then segment terminator.
  let elemDelim = '*';
  let subElemDelim = ':';
  let segDelim = '~';
  if (raw.startsWith('ISA') && raw.length > 3) {
    elemDelim = raw[3];
    const isaElems = raw.split(elemDelim, 17);
    if (isaElems.length >= 17) {
      const tail = isaElems[16];
      // Collect special (non-alphanumeric, non-whitespace) chars at start of tail
      const specials = [];
      for (let i = 0; i < Math.min(tail.length, 3); i++) {
        if (/[A-Za-z0-9\s]/.test(tail[i])) break;
        specials.push(tail[i]);
      }
      if (specials.length === 2) {
        subElemDelim = specials[0]; // ISA16 = sub-element separator
        segDelim = specials[1];     // segment terminator
      } else if (specials.length === 1) {
        segDelim = specials[0];     // ISA16 omitted; single char = segment terminator
      }
    }
  }

  // Split on the detected segment terminator (fall back to ~ or newline)
  const segRe = segDelim === '~' ? /[~\n]/ : new RegExp('[' + escapeRegex(segDelim) + '\\n]');
  const segments = raw.split(segRe).map(s => s.trim()).filter(Boolean);

  // State machine
  const invoices = [];
  let inv = null;    // current invoice header fields
  let lines = [];    // current invoice's line items
  let curLine = null; // current IT1 line item being built
  let inTransaction = false;
  let currentAccountNumber = ''; // tracked from REF~11 segments
  let currentCircuitNumber = ''; // tracked from REF~CN segments
  // Pending values buffered from segments that appear before the line item
  let pendingDescription = '';
  let pendingAmount = null;

  function pushCurrentLine() {
    if (curLine) {
      // Apply current account_number if not already set
      if (currentAccountNumber && !curLine.account_number) {
        curLine.account_number = currentAccountNumber;
      }
      if (currentCircuitNumber && !curLine.inventory_number) {
        curLine.inventory_number = currentCircuitNumber;
      }
      lines.push(curLine);
      curLine = null;
    }
  }

  function applyPending() {
    // Apply buffered PID/AMT values that appeared before the line item
    if (curLine) {
      if (pendingDescription && !curLine.description) curLine.description = pendingDescription;
      if (pendingAmount !== null && !curLine.amount) curLine.amount = pendingAmount;
    }
    pendingDescription = '';
    pendingAmount = null;
  }

  function pushCurrentInvoice() {
    pushCurrentLine();
    if (inv && inv.invoice_number) {
      invoices.push({ invoice: { ...inv }, lineItems: [...lines] });
    }
    inv = null;
    lines = [];
    currentAccountNumber = '';
    currentCircuitNumber = '';
    pendingDescription = '';
    pendingAmount = null;
  }

  for (const seg of segments) {
    const elems = seg.split(elemDelim);
    const id = elems[0];

    switch (id) {
      // ── Envelope (ignored but used as boundaries) ──
      case 'ISA': case 'IEA': case 'GS': case 'GE':
        break;

      case 'ST': // Transaction Set start — new invoice boundary
        pushCurrentInvoice();
        inv = {};
        lines = [];
        inTransaction = true;
        break;

      case 'SE': // Transaction Set end
        pushCurrentInvoice();
        inTransaction = false;
        break;

      // ── Invoice header ────────────────────────────
      case 'BIG':
        // BIG*date*invoiceNum**POnum
        if (!inv) inv = {};
        inv.invoice_date = formatEDIDate(elems[1]);
        inv.invoice_number = elems[2] || '';
        if (elems[4]) inv.po_number = elems[4];
        break;

      case 'N1': // Entity identification
        if (!inv) break;
        if (elems[1] === 'ST') inv.ship_to = elems[2] || '';
        if (elems[1] === 'BT' || elems[1] === 'PR') inv.bill_to = elems[2] || '';
        if (elems[1] === 'RE' || elems[1] === 'PE') inv.vendor_name = elems[2] || '';
        if (elems[1] === 'SE') inv.seller_name = elems[2] || '';
        break;

      case 'NM1': // Individual or organizational name
        if (!inv) break;
        if (elems[1] === 'SJ') inv.vendor_name = inv.vendor_name || (elems[3] || '');
        break;

      case 'REF': // Reference numbers
        if (elems[1] === '11' || elems[1] === '1L') {
          // Account Number — track and retroactively apply to unassigned lines
          currentAccountNumber = elems[2] || '';
          if (curLine && !curLine.account_number) curLine.account_number = currentAccountNumber;
          for (const li of lines) {
            if (!li.account_number) li.account_number = currentAccountNumber;
          }
        }
        if (elems[1] === 'CN') {
          // Circuit Number → inventory_number
          currentCircuitNumber = elems[2] || '';
          if (curLine && !curLine.inventory_number) curLine.inventory_number = currentCircuitNumber;
        }
        if (elems[1] === '12' && inv) inv.billing_account = elems[2] || '';
        if (!inv) break;
        if (elems[1] === 'BM') inv.reference_number = elems[2] || '';
        if (elems[1] === 'PO') inv.po_number = inv.po_number || elems[2] || '';
        if (elems[1] === 'IV') inv.invoice_number = inv.invoice_number || elems[2] || '';
        break;

      case 'DTM': // Date/time references
        if (!inv) break;
        if (elems[1] === '011') inv.due_date = formatEDIDate(elems[2]);
        if (elems[1] === '003') inv.invoice_date = inv.invoice_date || formatEDIDate(elems[2]);
        if (elems[1] === '150' || elems[1] === '186') inv.period_start = formatEDIDate(elems[2]);
        if (elems[1] === '151' || elems[1] === '187') inv.period_end = formatEDIDate(elems[2]);
        break;

      // ── Line items ────────────────────────────────
      case 'IT1': { // Baseline item
        // If curLine was just created by SLN with the same amount, merge into it
        // instead of creating a duplicate (Granite 811 pattern: SLN then IT1)
        const it1Amount = parseFloat(elems[4]) || 0;
        if (curLine && curLine._fromSLN && Math.abs((curLine.amount || 0) - it1Amount) < 0.005) {
          // Merge IT1 qualifiers into existing SLN line
          for (let p = 6; p < elems.length - 1; p += 2) {
            const qual = elems[p];
            const val  = elems[p + 1] || '';
            if (qual === 'UP' || qual === 'VP' || qual === 'MG') curLine.product_id = val;
            if (qual === 'A3' || qual === 'NU') curLine.usoc_code = curLine.usoc_code || val;
            if (qual === 'SV') curLine.charge_type = curLine.charge_type || 'Service';
          }
          break;
        }
        // Otherwise create a new line item
        pushCurrentLine();
        curLine = {
          line_number: elems[1] || '',
          quantity: parseFloat(elems[2]) || 1,
          unit: elems[3] || '',
          amount: it1Amount,
          description: '',
          charge_type: '',
          usoc_code: '',
          inventory_number: currentCircuitNumber || '',
          account_number: currentAccountNumber || '',
        };
        // Product/Service ID qualifiers at positions 6-7, 8-9, etc.
        for (let p = 6; p < elems.length - 1; p += 2) {
          const qual = elems[p];
          const val  = elems[p + 1] || '';
          if (qual === 'UP' || qual === 'VP' || qual === 'MG') curLine.product_id = val;
          if (qual === 'A3' || qual === 'NU') curLine.usoc_code = val;
          if (qual === 'SV') curLine.charge_type = 'Service';
          // Detect monetary amount in qualifier position (e.g., Granite M4 format)
          if (!curLine.amount && /^\d+\.?\d*$/.test(qual) && parseFloat(qual) > 0) {
            curLine.amount = parseFloat(qual);
          }
        }
        applyPending();
        break;
      }

      case 'SLN': { // Sub-line detail (telecom USOC charges)
        pushCurrentLine();
        const slnAmount = parseFloat(elems[5]) || 0;
        curLine = {
          _fromSLN: true, // marker so IT1 can merge instead of duplicating
          line_number: elems[1] || '',
          quantity: parseFloat(elems[4]) || 1,
          unit: '',
          amount: slnAmount,
          description: '',
          charge_type: '',
          usoc_code: '',
          inventory_number: currentCircuitNumber || '',
          account_number: currentAccountNumber || '',
        };
        // Product IDs in SLN follow similar pattern at pos 9+
        for (let p = 9; p < elems.length - 1; p += 2) {
          const qual = elems[p];
          const val  = elems[p + 1] || '';
          if (qual === 'A3' || qual === 'NU') curLine.usoc_code = val;
          if (qual === 'UP' || qual === 'VP') curLine.product_id = val;
        }
        applyPending();
        break;
      }

      case 'ITA': // Allowance, charge, or service (telecom fees)
        pushCurrentLine();
        {
          let itaAmount = 0;
          let itaDesc = '';
          let itaChargeType = '';
          if (/^\d+$/.test(elems[4])) {
            // Position 4 is amount in cents
            itaAmount = parseFloat(elems[4]) / 100;
            itaDesc = elems[6] || '';
            itaChargeType = elems[7] || elems[5] || '';
          } else {
            itaDesc = elems[4] || '';
            itaChargeType = elems[5] || '';
          }
          curLine = {
            description: itaDesc,
            amount: itaAmount,
            charge_type: itaChargeType,
            usoc_code: '',
            inventory_number: '',
            account_number: currentAccountNumber || '',
          };
        }
        break;

      case 'SI': // Service identification (circuit ID / telephone number)
        // SI*TI*SC*xxx = Service Class code (not a circuit ID) — skip
        // SI*TI*telNo  = Telephone number → inventory_number
        // SI*CI*circuitId = Circuit ID → inventory_number
        if (elems[1] === 'TI' && elems[2] !== 'SC') {
          const telNo = elems.slice(2).join('') || '';
          if (curLine) curLine.inventory_number = curLine.inventory_number || telNo;
          else currentCircuitNumber = currentCircuitNumber || telNo;
        }
        if (elems[1] === 'CI') {
          const circId = elems[2] || '';
          if (curLine) curLine.inventory_number = curLine.inventory_number || circId;
          else currentCircuitNumber = currentCircuitNumber || circId;
        }
        break;

      case 'PID': // Product/item description
        if (curLine) {
          curLine.description = elems[5] || curLine.description;
        } else {
          // Buffer for the next line item (Granite 811: PID before SLN/IT1)
          pendingDescription = elems[5] || pendingDescription;
        }
        break;

      case 'AMT': // Monetary amount
        {
          const amtVal = parseFloat(elems[2]) || 0;
          if (curLine) {
            curLine.amount = curLine.amount || amtVal;
          } else {
            // Buffer for the next line item
            pendingAmount = amtVal;
          }
        }
        break;

      case 'SAC': // Service, promotion, allowance, or charge
        if (curLine) {
          // SAC*C(charge)/A(allowance)*code**amount(cents)
          const sacAmount = parseFloat(elems[5]) / 100 || 0;
          if (elems[1] === 'C') {
            curLine.amount = (curLine.amount || 0) + sacAmount;
          } else if (elems[1] === 'A') {
            curLine.amount = (curLine.amount || 0) - sacAmount;
          }
          if (elems[15]) curLine.description = curLine.description || elems[15];
        }
        break;

      case 'TXI': // Tax information
        if (curLine) {
          const taxAmt = parseFloat(elems[2]) || 0;
          curLine.tax_amount = (curLine.tax_amount || 0) + taxAmt;
        }
        break;

      // ── Invoice totals ────────────────────────────
      case 'TDS': // Total monetary value summary (in cents)
        if (inv) {
          inv.total_amount = parseFloat(elems[1]) / 100 || 0;
        }
        break;

      case 'ISS': // Invoice shipment summary (can carry total quantity/weight)
        break; // informational only

      case 'HL': // Reset per-loop context at each hierarchical level
        pushCurrentLine();
        currentCircuitNumber = '';
        pendingDescription = '';
        pendingAmount = null;
        break;
      case 'LX': case 'PER':
        break; // loop/contact segments — context only

      default:
        break;
    }
  }

  // Handle files without ST/SE envelopes (bare 810 content)
  pushCurrentInvoice();

  // Flatten for column detection and mapping UI
  const flatRows = [];
  for (const r of invoices) {
    for (const li of r.lineItems) {
      const { _fromSLN, ...fields } = li;
      flatRows.push({ ...r.invoice, ...fields });
    }
    if (!r.lineItems.length) flatRows.push(r.invoice);
  }

  const detectedHeaders = flatRows.length ? Object.keys(flatRows[0]) : [];

  return {
    format: 'EDI',
    segments: segments.length,
    invoiceCount: invoices.length,
    headers: detectedHeaders,
    previewRows: flatRows.slice(0, 20),
    allRows: flatRows,
    structured: invoices,
  };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatEDIDate(ediDate) {
  if (!ediDate || ediDate.length < 8) return null;
  return `${ediDate.substring(0, 4)}-${ediDate.substring(4, 6)}-${ediDate.substring(6, 8)}`;
}

// ── PDF parser ───────────────────────────────────────────────
async function parsePDF(buffer) {
  // new Uint8Array(buffer) copies bytes into a fresh ArrayBuffer (byteOffset=0),
  // avoiding a pdfjs parse failure that occurs when Node.js pools small Buffers
  // with a non-zero byteOffset.
  const data = await pdf(new Uint8Array(buffer));
  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Attempt to detect tabular data by splitting on multiple spaces.
  // A "secondary header row" is one where all parts contain no digits — these
  // indicate a new section / second table in the PDF (e.g. a line-item table
  // that follows an invoice-summary table).  We stop the first table there so
  // those label rows are never treated as data.
  const isLabelRow = (parts) => parts.every(p => !/\d/.test(p));

  const tableRows = [];
  let headers = [];
  let headerFound = false;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/\s{2,}/).filter(Boolean);
    if (parts.length >= 3) {
      if (!headerFound) {
        // First multi-column row is the table header
        headers = parts;
        headerFound = true;
      } else if (isLabelRow(parts)) {
        // All-text row after data has started → secondary table header.
        // Stop here — all rows that follow belong to a different table and must
        // not be mixed with the first table's data.
        break;
      } else {
        const row = {};
        parts.forEach((val, idx) => {
          const key = headers[idx] || `Column ${idx + 1}`;
          row[key] = val;
        });
        tableRows.push(row);
      }
    }
  }

  return {
    format: 'PDF',
    pages: data.numpages,
    textLength: text.length,
    headers,
    previewRows: tableRows.slice(0, 20),
    allRows: tableRows,
    rawText: text.substring(0, 5000), // First 5K chars for preview
    totalLines: lines.length,
  };
}

// ── Target fields for mapping ────────────────────────────────
const INVOICE_FIELDS = [
  { field: 'invoice_number',  label: 'Invoice Number',  table: 'invoices', type: 'string', required: true },
  { field: 'vendor_name',     label: 'Vendor Name',     table: 'invoices', type: 'string', lookup: 'vendors' },
  { field: 'accounts_id',     label: 'Account ID',      table: 'invoices', type: 'integer' },
  { field: 'account_number',  label: 'Account Number',  table: 'invoices', type: 'string', lookup: 'accounts' },
  { field: 'invoice_date',    label: 'Invoice Date',    table: 'invoices', type: 'date' },
  { field: 'due_date',        label: 'Due Date',        table: 'invoices', type: 'date' },
  { field: 'period_start',    label: 'Period Start',    table: 'invoices', type: 'date' },
  { field: 'period_end',      label: 'Period End',      table: 'invoices', type: 'date' },
  { field: 'billing_account', label: 'Billing Account', table: 'invoices', type: 'string' },
  { field: 'total_amount',    label: 'Total Amount',    table: 'invoices', type: 'decimal' },
  { field: 'status',          label: 'Invoice Status',  table: 'invoices', type: 'string' },
];

const LINE_ITEM_FIELDS = [
  { field: 'inventory_number', label: 'InventoryItem Number',  table: 'line_items', type: 'string', lookup: 'inventory' },
  { field: 'description',    label: 'Description',     table: 'line_items', type: 'string' },
  { field: 'charge_type',    label: 'Charge Type',     table: 'line_items', type: 'string' },
  { field: 'quantity',       label: 'Quantity',        table: 'line_items', type: 'decimal' },
  { field: 'amount',         label: 'Amount',          table: 'line_items', type: 'decimal', required: true },
  { field: 'mrc_amount',     label: 'MRC Amount',      table: 'line_items', type: 'decimal' },
  { field: 'nrc_amount',     label: 'NRC Amount',      table: 'line_items', type: 'decimal' },
  { field: 'tax_amount',     label: 'Tax Amount',      table: 'line_items', type: 'decimal' },
  { field: 'usoc_code',      label: 'USOC Code',       table: 'line_items', type: 'string', lookup: 'usoc_codes' },
  { field: 'period_start',   label: 'Line Period Start', table: 'line_items', type: 'date' },
  { field: 'period_end',     label: 'Line Period End',   table: 'line_items', type: 'date' },
];

// Whitelist of valid target field names (for mapping validation)
const VALID_INVOICE_FIELDS = new Set(INVOICE_FIELDS.map(f => f.field));
const VALID_LINE_ITEM_FIELDS = new Set(LINE_ITEM_FIELDS.map(f => f.field));

// ── GET /fields — available target fields for mapping ────────
router.get('/fields', (_req, res) => {
  res.json({
    invoiceFields: INVOICE_FIELDS,
    lineItemFields: LINE_ITEM_FIELDS,
  });
});

// ── POST /parse — upload & parse file, return preview (Analyst+) ──
// Returns headers + preview rows only; allRows excluded for performance
router.post('/parse', requireRole('Admin', 'Manager', 'Analyst'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { originalname, buffer } = req.file;
    const format = detectFormat(originalname, buffer);

    let parsed;
    switch (format) {
      case 'Excel':
        parsed = await parseExcel(buffer, originalname);
        // Strip allRows from each sheet — client only needs preview
        parsed.sheets = parsed.sheets.map(({ allRows, ...rest }) => rest);
        break;
      case 'EDI':
        parsed = parseEDI(buffer);
        delete parsed.allRows;
        delete parsed.structured;
        break;
      case 'PDF':
        parsed = await parsePDF(buffer);
        delete parsed.allRows;
        break;
      default:
        return res.status(400).json({ error: `Unsupported format: ${format}` });
    }

    res.json(parsed);
  } catch (err) {
    safeError(res, err, 'invoice-reader/parse');
  }
});

// ═══════════════════════════════════════════════════════════
// ── Templates CRUD ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

// GET /templates — list all templates (Analyst+)
router.get('/templates', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    let query = db('invoice_reader_templates as t')
      .leftJoin('vendors as v', 't.vendors_id', 'v.vendors_id')
      .select('t.*', 'v.name as vendor_name');

    if (req.query.vendors_id)  query = query.where('t.vendors_id', req.query.vendors_id);
    if (req.query.format_type) query = query.where('t.format_type', req.query.format_type);
    if (req.query.status)      query = query.where('t.status', req.query.status);

    const rows = await query.orderBy('t.created_at', 'desc');

    res.json(rows.map(r => ({
      ...r,
      config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : null,
    })));
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// GET /templates/:id
router.get('/templates/:id', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid template ID' });

  try {
    const row = await db('invoice_reader_templates as t')
      .leftJoin('vendors as v', 't.vendors_id', 'v.vendors_id')
      .select('t.*', 'v.name as vendor_name')
      .where('t.invoice_reader_templates_id', id)
      .first();

    if (!row) return res.status(404).json({ error: 'Template not found' });

    row.config = row.config ? (typeof row.config === 'string' ? JSON.parse(row.config) : row.config) : null;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// POST /templates — create (Manager+)
router.post('/templates', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { name, vendors_id, format_type, config } = req.body;
    if (!name || !format_type || !config) {
      return res.status(400).json({ error: 'name, format_type, and config are required' });
    }
    if (typeof name !== 'string' || name.length > 255) {
      return res.status(400).json({ error: 'name must be a string of 255 characters or fewer' });
    }
    const ALLOWED_FORMATS = ['CSV', 'Excel', 'PDF', 'XML', 'Fixed Width', 'Custom'];
    if (!ALLOWED_FORMATS.includes(format_type)) {
      return res.status(400).json({ error: `format_type must be one of: ${ALLOWED_FORMATS.join(', ')}` });
    }
    if (vendors_id != null) {
      const vid = parseInt(vendors_id, 10);
      if (!Number.isInteger(vid) || vid < 1) return res.status(400).json({ error: 'vendors_id must be a positive integer' });
    }
    if (typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({ error: 'config must be a JSON object' });
    }
    const configStr = JSON.stringify(config);
    if (configStr.length > 100000) {
      return res.status(400).json({ error: 'config exceeds maximum allowed size' });
    }

    const id = await db.insertReturningId('invoice_reader_templates', {
      name: name.trim(),
      vendors_id: vendors_id || null,
      format_type,
      config: configStr,
      status: 'Active',
    });

    const row = await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', id).first();
    row.config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// PUT /templates/:id — update (Manager+)
router.put('/templates/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid template ID' });

  try {
    const ALLOWED_FORMATS = ['CSV', 'Excel', 'PDF', 'XML', 'Fixed Width', 'Custom'];
    const ALLOWED_STATUSES = ['Active', 'Inactive'];
    const { name, vendors_id, format_type, config, status } = req.body;
    const update = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length > 255) return res.status(400).json({ error: 'name must be a string of 255 characters or fewer' });
      update.name = name.trim();
    }
    if (vendors_id !== undefined) {
      if (vendors_id != null) {
        const vid = parseInt(vendors_id, 10);
        if (!Number.isInteger(vid) || vid < 1) return res.status(400).json({ error: 'vendors_id must be a positive integer' });
      }
      update.vendors_id = vendors_id || null;
    }
    if (format_type !== undefined) {
      if (!ALLOWED_FORMATS.includes(format_type)) return res.status(400).json({ error: `format_type must be one of: ${ALLOWED_FORMATS.join(', ')}` });
      update.format_type = format_type;
    }
    if (config !== undefined) {
      if (typeof config !== 'object' || Array.isArray(config)) return res.status(400).json({ error: 'config must be a JSON object' });
      const cfgStr = JSON.stringify(config);
      if (cfgStr.length > 100000) return res.status(400).json({ error: 'config exceeds maximum allowed size' });
      update.config = cfgStr;
    }
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      update.status = status;
    }
    update.updated_at = new Date().toISOString().slice(0, 10);

    await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', id)
      .update(update);

    const row = await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', id).first();
    if (!row) return res.status(404).json({ error: 'Template not found' });
    row.config = row.config ? (typeof row.config === 'string' ? JSON.parse(row.config) : row.config) : null;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// DELETE /templates/:id (Manager+)
router.delete('/templates/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid template ID' });

  try {
    await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// ═══════════════════════════════════════════════════════════
// ── Process — batch import using a template ───────────────
// ═══════════════════════════════════════════════════════════

router.post('/process', requireRole('Admin', 'Manager'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { template_id, vendors_id, mappings, sheet_name, profile_id } = (() => {
    try {
      return {
        template_id: req.body.template_id ? Number(req.body.template_id) : null,
        vendors_id: req.body.vendors_id ? Number(req.body.vendors_id) : null,
        mappings: req.body.mappings ? JSON.parse(req.body.mappings) : null,
        sheet_name: req.body.sheet_name || null,
        profile_id: req.body.profile_id ? Number(req.body.profile_id) : null,
      };
    } catch {
      return req.body;
    }
  })();

  try {
    const { originalname, buffer } = req.file;
    const format = detectFormat(originalname, buffer);

    // ── Profile resolution: explicit, auto-matched, or none ──
    let profile = null;
    let profileDefaults = {};
    let errorPolicy = {};
    if (profile_id) {
      profile = await db('invoice_reader_profiles').where('invoice_reader_profiles_id', profile_id).first();
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
    } else if (!template_id && !mappings) {
      // No explicit mappings — try auto-match
      const fileIds = await extractFileIdentifiers(buffer, format, originalname);
      profile = await matchProfile(fileIds);
    }
    if (profile) {
      profileDefaults = typeof profile.defaults === 'string' ? JSON.parse(profile.defaults) : (profile.defaults || {});
      errorPolicy = typeof profile.error_handling === 'string' ? JSON.parse(profile.error_handling) : (profile.error_handling || {});
    }

    // Resolve mappings — from profile→template, explicit template, or request body
    let columnMappings;
    const effectiveTemplateId = template_id || (profile ? profile.invoice_reader_templates_id : null);
    if (effectiveTemplateId) {
      const templateRecord = await db('invoice_reader_templates')
        .where('invoice_reader_templates_id', effectiveTemplateId).first();
      if (!templateRecord) return res.status(404).json({ error: 'Template not found' });
      const cfg = typeof templateRecord.config === 'string'
        ? JSON.parse(templateRecord.config) : templateRecord.config;
      columnMappings = cfg.columnMappings;
    } else if (mappings) {
      columnMappings = mappings;
    } else {
      return res.status(400).json({ error: 'Either template_id or mappings is required' });
    }

    // Validate mapping targets against allowed field whitelist
    for (const [, mapping] of Object.entries(columnMappings)) {
      if (!mapping || !mapping.field) continue;
      const valid = mapping.table === 'invoices'
        ? VALID_INVOICE_FIELDS.has(mapping.field)
        : VALID_LINE_ITEM_FIELDS.has(mapping.field);
      if (!valid) {
        return res.status(400).json({ error: `Invalid mapping target: ${mapping.table}.${mapping.field}` });
      }
    }

    // Parse file
    let allRows = [];
    switch (format) {
      case 'Excel': {
        const parsed = await parseExcel(buffer, originalname);
        const sheet = sheet_name
          ? parsed.sheets.find(s => s.name === sheet_name) || parsed.sheets[0]
          : parsed.sheets[0];
        allRows = sheet.allRows;
        break;
      }
      case 'EDI': {
        const parsed = parseEDI(buffer);
        allRows = parsed.allRows;
        break;
      }
      case 'PDF': {
        const parsed = await parsePDF(buffer);
        allRows = parsed.allRows;
        break;
      }
    }

    if (!allRows.length) {
      return res.status(400).json({ error: 'No data rows found in the uploaded file' });
    }

    // Create upload tracking record (outside transaction so it persists even if import fails)
    const uploadId = await db.insertReturningId('invoice_reader_uploads', {
      invoice_reader_templates_id: effectiveTemplateId || null,
      invoice_reader_profiles_id: profile ? profile.invoice_reader_profiles_id : null,
      vendors_id: vendors_id || (profileDefaults.vendors_id ? Number(profileDefaults.vendors_id) : null),
      file_name: originalname,
      format_type: format,
      status: 'Processing',
      total_rows: allRows.length,
    });

    // ── Apply mappings and batch-insert inside a transaction ──
    const errors = [];
    let insertedInvoices = 0;
    let insertedLineItems = 0;

    // Separate invoice-level and line-item-level mappings
    const invoiceMappings = {};
    const lineItemMappings = {};
    for (const [sourceCol, mapping] of Object.entries(columnMappings)) {
      if (!mapping || !mapping.field) continue;
      if (mapping.table === 'invoices') {
        invoiceMappings[sourceCol] = mapping;
      } else {
        lineItemMappings[sourceCol] = mapping;
      }
    }

    const invoiceNumberCol = Object.entries(invoiceMappings)
      .find(([, m]) => m.field === 'invoice_number')?.[0];

    // Build lookup caches
    const inventoryItemCache = {};
    const inventoryItemCol = Object.entries(lineItemMappings).find(([, m]) => m.field === 'inventory_number')?.[0];
    if (inventoryItemCol) {
      const inventory = await db('inventory').select('inventory_id', 'inventory_number');
      inventory.forEach(c => { inventoryItemCache[c.inventory_number] = c.inventory_id; });
    }

    const usocCache = {};
    const usocCol = Object.entries(lineItemMappings).find(([, m]) => m.field === 'usoc_code')?.[0];
    if (usocCol) {
      const usocs = await db('usoc_codes').select('usoc_codes_id', 'usoc_code');
      usocs.forEach(u => { usocCache[u.usoc_code] = u.usoc_codes_id; });
    }

    // Vendor name → vendors_id lookup (case-insensitive)
    const vendorCache = {};
    const autoCreatedVendors = []; // track for admin notifications
    const autoCreatedAccounts = []; // track for admin notifications
    const autoCreatedInventory = []; // track for admin notifications
    const exceptionsToCreate = []; // structured exceptions for the queue
    let resolvedVendorsId = vendors_id || (profileDefaults.vendors_id ? Number(profileDefaults.vendors_id) : null);
    const vendorNameCol = Object.entries(invoiceMappings).find(([, m]) => m.field === 'vendor_name')?.[0];
    if (vendorNameCol) {
      const allVendors = await db('vendors').select('vendors_id', 'name');
      allVendors.forEach(v => { vendorCache[v.name.toLowerCase().trim()] = v.vendors_id; });
    }

    // Account number → accounts_id lookup (for EDI REF~11)
    // Scoped to vendor if known; re-built after first vendor resolution
    let accountCache = {};
    const accountNumberCol = Object.entries(invoiceMappings).find(([, m]) => m.field === 'account_number')?.[0];
    async function buildAccountCache(scopeVendorsId) {
      accountCache = {};
      let acctQuery = db('accounts').select('accounts_id', 'account_number');
      if (scopeVendorsId) acctQuery = acctQuery.where('vendors_id', scopeVendorsId);
      const accts = await acctQuery;
      accts.forEach(a => { accountCache[a.account_number] = a.accounts_id; });
    }
    if (accountNumberCol) {
      await buildAccountCache(resolvedVendorsId);
    }

    // Auto-create vendor if not found
    async function ensureVendor(vendorName) {
      const lookupKey = vendorName.toLowerCase().trim();
      if (vendorCache[lookupKey]) return vendorCache[lookupKey];
      // Check error policy for unknown vendors
      const vendorPolicy = errorPolicy.on_unknown_vendor || 'create';
      if (vendorPolicy === 'queue_exception') {
        exceptionsToCreate.push({ type: 'no_vendor', severity: 'blocking',
          context: { vendor_name: vendorName.trim(), file_name: originalname } });
        return null;
      }
      if (vendorPolicy === 'skip') return null;
      // Default: auto-create
      const newId = await db.insertReturningId('vendors', {
        name: vendorName.trim(),
        status: 'Active',
      });
      vendorCache[lookupKey] = newId;
      autoCreatedVendors.push({ vendors_id: newId, name: vendorName.trim() });
      return newId;
    }

    // Auto-create account if not found
    async function ensureAccount(accountNumber, vendorsId) {
      if (accountCache[accountNumber]) return accountCache[accountNumber];
      if (!vendorsId) return null;
      const accountPolicy = errorPolicy.on_no_account || 'create';
      if (accountPolicy === 'queue_exception') {
        exceptionsToCreate.push({ type: 'no_account', severity: 'blocking',
          context: { account_number: accountNumber, vendors_id: vendorsId, file_name: originalname } });
        return null;
      }
      if (accountPolicy === 'skip') return null;
      // Default: auto-create
      const newId = await db.insertReturningId('accounts', {
        account_number: accountNumber,
        vendors_id: vendorsId,
        name: `Account ${accountNumber}`,
        status: 'Active',
      });
      accountCache[accountNumber] = newId;
      autoCreatedAccounts.push({ accounts_id: newId, account_number: accountNumber, vendors_id: vendorsId });
      return newId;
    }

    // Auto-create inventory item if not found
    async function ensureInventory(inventoryNumber, accountsId) {
      if (inventoryItemCache[inventoryNumber]) return inventoryItemCache[inventoryNumber];
      if (!accountsId) return null;
      const invPolicy = errorPolicy.on_unknown_inventory || 'create';
      if (invPolicy === 'queue_exception') {
        exceptionsToCreate.push({ type: 'no_inventory', severity: 'warning',
          context: { inventory_number: inventoryNumber, accounts_id: accountsId, file_name: originalname } });
        return null;
      }
      if (invPolicy === 'skip') return null;
      const newId = await db.insertReturningId('inventory', {
        inventory_number: inventoryNumber,
        accounts_id: accountsId,
        status: 'Active',
      });
      inventoryItemCache[inventoryNumber] = newId;
      autoCreatedInventory.push({ inventory_id: newId, inventory_number: inventoryNumber, accounts_id: accountsId });
      return newId;
    }

    // Resolve default accounts_id from profile defaults, vendor, or first-account fallback
    let defaultAccountsId = profileDefaults.accounts_id ? Number(profileDefaults.accounts_id) : null;
    const accountsMapped = Object.values(invoiceMappings).some(m => m.field === 'accounts_id' || m.field === 'account_number');
    if (!defaultAccountsId && !accountsMapped && (vendors_id || resolvedVendorsId)) {
      const firstAccount = await db('accounts')
        .where('vendors_id', vendors_id || resolvedVendorsId)
        .orderBy('accounts_id', 'asc')
        .first();
      if (firstAccount) defaultAccountsId = firstAccount.accounts_id;
    }

    // Group rows by invoice number
    const invoiceGroups = new Map();
    let rowIdx = 0;
    for (const row of allRows) {
      rowIdx++;
      const invNum = invoiceNumberCol ? coerceVal(row[invoiceNumberCol], 'string') : `AUTO-${uploadId}-${rowIdx}`;
      if (!invNum) {
        errors.push(`Row ${rowIdx}: Missing invoice number`);
        continue;
      }
      if (!invoiceGroups.has(invNum)) {
        invoiceGroups.set(invNum, { invoiceData: {}, lineItems: [] });
      }
      const group = invoiceGroups.get(invNum);

      // Extract invoice fields
      for (const [srcCol, mapping] of Object.entries(invoiceMappings)) {
        const val = coerceVal(row[srcCol], mapping.type || 'string');
        if (val !== null && val !== undefined) {
          if (mapping.field === 'vendor_name') {
            // Look up or auto-create vendor
            const vid = await ensureVendor(String(val));
            group.invoiceData._vendors_id = vid;
            if (!resolvedVendorsId) {
              resolvedVendorsId = vid;
              if (accountNumberCol) await buildAccountCache(resolvedVendorsId);
              if (!accountsMapped) {
                const firstAccount = await db('accounts')
                  .where('vendors_id', resolvedVendorsId)
                  .orderBy('accounts_id', 'asc').first();
                if (firstAccount) defaultAccountsId = firstAccount.accounts_id;
              }
            }
          } else if (mapping.field === 'account_number') {
            // Look up or auto-create account
            const aid = await ensureAccount(val, resolvedVendorsId);
            if (aid) group.invoiceData.accounts_id = group.invoiceData.accounts_id || aid;
          } else {
            group.invoiceData[mapping.field] = val;
          }
        }
      }

      // Extract line item fields
      const lineItem = {};
      for (const [srcCol, mapping] of Object.entries(lineItemMappings)) {
        const val = coerceVal(row[srcCol], mapping.type || 'string');
        if (val !== null && val !== undefined) {
          if (mapping.field === 'inventory_number') {
            lineItem.inventory_id = inventoryItemCache[val] || null;
            lineItem._inventory_number = val; // preserve for deferred auto-creation
          } else if (mapping.field === 'usoc_code') {
            lineItem.usoc_codes_id = usocCache[val] || null;
          } else {
            lineItem[mapping.field] = val;
          }
        }
      }
      if (Object.keys(lineItem).length > 0) {
        lineItem._rowNum = rowIdx;
        group.lineItems.push(lineItem);
      }
    }

    // Batch insert inside transaction for atomicity
    const BATCH_SIZE = 500;
    const invoiceEntries = [...invoiceGroups.entries()];
    const createdInvoices = []; // track for response links

    await db.transaction(async trx => {
      for (let i = 0; i < invoiceEntries.length; i += BATCH_SIZE) {
        const batch = invoiceEntries.slice(i, i + BATCH_SIZE);

        // Build all invoice records for this batch
        const invoiceRecords = [];
        const batchMeta = []; // parallel array tracking invNum/group per record
        // Only these fields exist on the invoices table
        const INVOICE_DB_COLS = new Set([
          'accounts_id', 'invoice_number', 'invoice_date', 'due_date',
          'period_start', 'period_end', 'total_amount', 'status',
          'payment_date', 'assigned_users_id', 'billing_account',
        ]);
        for (const [invNum, group] of batch) {
          const invoiceRecord = {
            accounts_id: group.invoiceData.accounts_id || defaultAccountsId || null,
            invoice_number: invNum,
            status: 'Open',
          };
          // Copy only valid DB columns from invoiceData
          for (const [key, val] of Object.entries(group.invoiceData)) {
            if (INVOICE_DB_COLS.has(key)) invoiceRecord[key] = val;
          }
          // Coerce dates
          for (const key of ['invoice_date', 'due_date', 'period_start', 'period_end', 'payment_date']) {
            if (invoiceRecord[key]) invoiceRecord[key] = coerceDate(invoiceRecord[key]);
          }
          if (invoiceRecord.total_amount) {
            invoiceRecord.total_amount = parseFloat(invoiceRecord.total_amount) || 0;
          }
          // Validate required accounts_id.
          // Default: queue an exception so the record can be resolved later.
          // accounts.vendors_id is NOT NULL so auto-creation requires a vendor
          // context (pass vendors_id in the request or map a 'Vendor Name' column).
          if (!invoiceRecord.accounts_id) {
            const noAcctPolicy = errorPolicy.on_no_account || 'queue_exception';
            errors.push(
              `Invoice "${invNum}": No account could be resolved. ` +
              `To enable auto-creation, select a vendor in the import form ` +
              `or map a "Vendor Name" column so the account can be linked to a vendor.`
            );
            if (noAcctPolicy !== 'skip') {
              exceptionsToCreate.push({ type: 'no_account', severity: 'blocking',
                context: { invoice_number: invNum, file_name: originalname, vendors_id: resolvedVendorsId } });
            }
            invoiceRecords.push(null);
            batchMeta.push({ invNum, group });
            continue;
          }
          invoiceRecords.push(invoiceRecord);
          batchMeta.push({ invNum, group });
        }

        // Filter out skipped (null) records
        const validIndices = [];
        const validRecords = [];
        for (let k = 0; k < invoiceRecords.length; k++) {
          if (invoiceRecords[k]) {
            validIndices.push(k);
            validRecords.push(invoiceRecords[k]);
          }
        }

        // Batch insert invoices and get IDs back
        let invoiceIds;
        if (!validRecords.length) {
          invoiceIds = [];
        } else {
          try {
            const returned = await trx('invoices').insert(validRecords).returning('invoices_id');
            insertedInvoices += returned.length;
            // Map returned IDs back to original indices
            invoiceIds = new Array(invoiceRecords.length).fill(null);
            for (let v = 0; v < validIndices.length; v++) {
              invoiceIds[validIndices[v]] = returned[v];
            }
          } catch (err) {
            // Fall back to one-by-one with savepoints to isolate failures in PostgreSQL
            invoiceIds = new Array(invoiceRecords.length).fill(null);
            for (let v = 0; v < validIndices.length; v++) {
              const k = validIndices[v];
              try {
                // k is a validated array index (not user input) — safe for SAVEPOINT identifiers
                const spName = `inv_${Math.abs(Math.floor(Number(k)))}`;
                await trx.raw(`SAVEPOINT ${spName}`);
                const [row] = await trx('invoices').insert(validRecords[v]).returning('invoices_id');
                await trx.raw(`RELEASE SAVEPOINT ${spName}`);
                invoiceIds[k] = row;
                insertedInvoices++;
              } catch (innerErr) {
                const spName2 = `inv_${Math.abs(Math.floor(Number(k)))}`;
                await trx.raw(`ROLLBACK TO SAVEPOINT ${spName2}`).catch(() => {});
                invoiceIds[k] = null;
                errors.push(`Invoice "${batchMeta[k].invNum}": ${innerErr.message}`);
              }
            }
          }
        }

        // Only these fields exist on the line_items table
        const LINE_ITEM_DB_COLS = new Set([
          'invoices_id', 'inventory_id', 'usoc_codes_id', 'description',
          'charge_type', 'amount', 'mrc_amount', 'nrc_amount',
          'contracted_rate', 'variance', 'audit_status',
          'period_start', 'period_end', 'quantity', 'tax_amount',
        ]);

        // Collect all line items for successfully inserted invoices
        const allLineItems = [];
        for (let k = 0; k < invoiceIds.length; k++) {
          const idRow = invoiceIds[k];
          if (!idRow) continue;
          const invoiceId = typeof idRow === 'object' ? idRow.invoices_id : idRow;
          const { group, invNum } = batchMeta[k];
          createdInvoices.push({ invoices_id: invoiceId, invoice_number: invNum });

          for (const li of group.lineItems) {
            const { _rowNum, _inventory_number, ...fields } = li;
            // Resolve inventory auto-creation now that we have accounts_id
            if (_inventory_number && !fields.inventory_id) {
              const acctId = group.invoiceData.accounts_id || defaultAccountsId || null;
              const invId = await ensureInventory(_inventory_number, acctId);
              if (invId) fields.inventory_id = invId;
            }
            const raw = { invoices_id: invoiceId, ...fields };
            // Strip non-DB fields
            const record = {};
            for (const [key, val] of Object.entries(raw)) {
              if (LINE_ITEM_DB_COLS.has(key)) record[key] = val;
            }
            for (const key of ['amount', 'mrc_amount', 'nrc_amount', 'contracted_rate', 'variance', 'tax_amount']) {
              if (record[key] !== undefined) record[key] = parseFloat(record[key]) || 0;
            }
            for (const key of ['period_start', 'period_end']) {
              if (record[key]) record[key] = coerceDate(record[key]);
            }
            allLineItems.push(record);
          }
        }

        // Batch insert line items in chunks
        for (let j = 0; j < allLineItems.length; j += BATCH_SIZE) {
          const liBatch = allLineItems.slice(j, j + BATCH_SIZE);
          try {
            await trx('line_items').insert(liBatch);
            insertedLineItems += liBatch.length;
          } catch (err) {
            errors.push(`Line items batch ${j}-${j + liBatch.length}: ${err.message}`);
          }
        }
      }
    });

    // Notify admins about auto-created vendors and accounts
    if (autoCreatedVendors.length || autoCreatedAccounts.length || autoCreatedInventory.length) {
      try {
        for (const v of autoCreatedVendors) {
          await notifyAll({
            type: 'warning',
            title: 'New Vendor Auto-Created',
            message: `Vendor "${v.name}" was automatically created during invoice import. Please review and complete the vendor details.`,
            entity_type: 'vendor',
            entity_id: v.vendors_id,
            category: 'status_changed',
          }, { roles: ['Admin'] });
        }
        for (const ac of autoCreatedAccounts) {
          await notifyAll({
            type: 'warning',
            title: 'New Account Auto-Created',
            message: `Account "${ac.account_number}" was automatically created during invoice import. Please review and complete the account details.`,
            entity_type: 'account',
            entity_id: ac.accounts_id,
            category: 'status_changed',
          }, { roles: ['Admin'] });
        }
        for (const inv of autoCreatedInventory) {
          await notifyAll({
            type: 'warning',
            title: 'New Inventory Item Auto-Created',
            message: `Inventory item "${inv.inventory_number}" was automatically created during invoice import. Please review and complete the circuit details.`,
            entity_type: 'inventory',
            entity_id: inv.inventory_id,
            category: 'status_changed',
          }, { roles: ['Admin'] });
        }
      } catch (notifErr) {
        // Non-critical — don't fail the import over notification errors
      }
    }

    // ── Persist structured exceptions for the exception queue ──
    if (exceptionsToCreate.length) {
      try {
        // Deduplicate by type+context key
        const seen = new Set();
        const unique = exceptionsToCreate.filter(e => {
          const key = `${e.type}:${JSON.stringify(e.context)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        await db('invoice_reader_exceptions').insert(unique.map(e => ({
          invoice_reader_uploads_id: uploadId,
          invoice_reader_profiles_id: profile ? profile.invoice_reader_profiles_id : null,
          type: e.type,
          severity: e.severity,
          context: JSON.stringify(e.context),
          status: 'open',
        })));
      } catch (excErr) {
        // Non-critical — don't fail the import over exception logging errors
      }
    }

    // Update final status — "Needs Attention" if there are open exceptions, else normal
    const hasBlockingExceptions = exceptionsToCreate.some(e => e.severity === 'blocking');
    const finalStatus = hasBlockingExceptions
      ? 'Needs Attention'
      : (errors.length ? (insertedInvoices > 0 ? 'Completed' : 'Failed') : 'Completed');
    const uploadUpdate = {
      status: finalStatus,
      inserted_invoices: insertedInvoices,
      inserted_line_items: insertedLineItems,
      error_count: errors.length,
      errors: errors.length ? JSON.stringify(errors.slice(0, 200)) : null,
      completed_at: db.raw('CURRENT_TIMESTAMP'),
    };
    if (resolvedVendorsId && !vendors_id) uploadUpdate.vendors_id = resolvedVendorsId;
    await db('invoice_reader_uploads')
      .where('invoice_reader_uploads_id', uploadId)
      .update(uploadUpdate);

    res.json({
      success: true,
      upload_id: uploadId,
      status: finalStatus,
      total_rows: allRows.length,
      invoices_created: insertedInvoices,
      line_items_created: insertedLineItems,
      error_count: errors.length,
      errors: errors.slice(0, 50),
      exceptions_created: exceptionsToCreate.length,
      auto_created_vendors: autoCreatedVendors.length,
      auto_created_accounts: autoCreatedAccounts.length,
      auto_created_inventory: autoCreatedInventory.length,
      created_invoices: createdInvoices,
      profile_used: profile ? { id: profile.invoice_reader_profiles_id, name: profile.name } : null,
    });
  } catch (err) {
    safeError(res, err, 'invoice-reader/process');
  }
});

// ── Upload history ───────────────────────────────────────────
router.get('/uploads', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    let query = db('invoice_reader_uploads as u')
      .leftJoin('invoice_reader_templates as t', 'u.invoice_reader_templates_id', 't.invoice_reader_templates_id')
      .leftJoin('vendors as v', 'u.vendors_id', 'v.vendors_id')
      .select('u.*', 't.name as template_name', 'v.name as vendor_name');

    if (req.query.vendors_id) query = query.where('u.vendors_id', req.query.vendors_id);
    if (req.query.status)      query = query.where('u.status', req.query.status);

    const rows = await query.orderBy('u.created_at', 'desc');
    res.json(rows.map(r => ({
      ...r,
      errors: r.errors ? (typeof r.errors === 'string' ? JSON.parse(r.errors) : r.errors) : [],
    })));
  } catch (err) { safeError(res, err, 'invoice-reader/uploads'); }
});

// ── Helpers ──────────────────────────────────────────────────
function coerceVal(raw, type) {
  if (raw === null || raw === undefined || raw === '') return null;
  switch (type) {
    case 'decimal': return parseFloat(raw) || 0;
    case 'integer': return parseInt(raw, 10) || 0;
    case 'date':    return coerceDate(raw);
    default:        return String(raw).trim();
  }
}

function coerceDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ── Extract identifiers from a file for profile auto-matching ─
async function extractFileIdentifiers(buffer, format, fileName) {
  const ids = { format, fileName };
  if (format === 'EDI') {
    const raw = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (raw.startsWith('ISA') && raw.length > 3) {
      const elemDelim = raw[3];
      const isaElems = raw.split(elemDelim, 17);
      if (isaElems.length >= 7) {
        ids.edi_sender_id = (isaElems[6] || '').trim();        // ISA06
        ids.edi_sender_qualifier = (isaElems[5] || '').trim();  // ISA05
        ids.edi_receiver_id = (isaElems[8] || '').trim();       // ISA08
      }
    }
  } else if (format === 'Excel' || format === 'CSV') {
    // Extract column headers for fingerprinting
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (ws && ws.rowCount > 0) {
        const row = ws.getRow(1);
        const headers = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          headers.push(cell.value != null ? String(cell.value).trim() : '');
        });
        ids.headers = headers;
      }
    } catch { /* ignore parse errors during identification */ }
  }
  return ids;
}

// ── Match a file against reader profiles ───────────────────
async function matchProfile(fileIds) {
  const profiles = await db('invoice_reader_profiles')
    .where('status', 'Active')
    .where('format_type', fileIds.format);

  for (const profile of profiles) {
    const rules = typeof profile.match_rules === 'string'
      ? JSON.parse(profile.match_rules) : profile.match_rules;
    if (!rules || Object.keys(rules).length === 0) continue;

    let matched = true;
    if (rules.edi_sender_id && fileIds.edi_sender_id) {
      if (rules.edi_sender_id.toUpperCase() !== fileIds.edi_sender_id.toUpperCase()) matched = false;
    } else if (rules.edi_sender_id) {
      matched = false;
    }
    if (matched && rules.filename_pattern && fileIds.fileName) {
      const re = new RegExp(rules.filename_pattern, 'i');
      if (!re.test(fileIds.fileName)) matched = false;
    }
    if (matched && rules.header_fingerprint && fileIds.headers) {
      const fp = fileIds.headers.join('|').toLowerCase();
      if (fp !== rules.header_fingerprint.toLowerCase()) matched = false;
    }
    if (matched) return profile;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// ── Reader Profiles CRUD ──────────────────────────────────
// ═══════════════════════════════════════════════════════════

router.get('/profiles', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    let query = db('invoice_reader_profiles as p')
      .leftJoin('vendors as v', 'p.vendors_id', 'v.vendors_id')
      .leftJoin('invoice_reader_templates as t', 'p.invoice_reader_templates_id', 't.invoice_reader_templates_id')
      .select('p.*', 'v.name as vendor_name', 't.name as template_name');
    if (req.query.vendors_id)   query = query.where('p.vendors_id', req.query.vendors_id);
    if (req.query.format_type)  query = query.where('p.format_type', req.query.format_type);
    if (req.query.status)       query = query.where('p.status', req.query.status);
    const rows = await query.orderBy('p.name');
    res.json(rows.map(r => ({
      ...r,
      match_rules: typeof r.match_rules === 'string' ? JSON.parse(r.match_rules) : r.match_rules,
      defaults: typeof r.defaults === 'string' ? JSON.parse(r.defaults) : r.defaults,
      error_handling: typeof r.error_handling === 'string' ? JSON.parse(r.error_handling) : r.error_handling,
    })));
  } catch (err) { safeError(res, err, 'invoice-reader/profiles'); }
});

router.get('/profiles/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid profile ID' });
  try {
    const row = await db('invoice_reader_profiles as p')
      .leftJoin('vendors as v', 'p.vendors_id', 'v.vendors_id')
      .leftJoin('invoice_reader_templates as t', 'p.invoice_reader_templates_id', 't.invoice_reader_templates_id')
      .select('p.*', 'v.name as vendor_name', 't.name as template_name')
      .where('p.invoice_reader_profiles_id', id).first();
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    row.match_rules = typeof row.match_rules === 'string' ? JSON.parse(row.match_rules) : row.match_rules;
    row.defaults = typeof row.defaults === 'string' ? JSON.parse(row.defaults) : row.defaults;
    row.error_handling = typeof row.error_handling === 'string' ? JSON.parse(row.error_handling) : row.error_handling;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/profiles'); }
});

router.post('/profiles', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { name, vendors_id, format_type, invoice_reader_templates_id, match_rules, defaults, error_handling, status } = req.body;
    if (!name || !format_type) return res.status(400).json({ error: 'name and format_type are required' });

    const id = await db.insertReturningId('invoice_reader_profiles', {
      name,
      vendors_id: vendors_id || null,
      format_type,
      invoice_reader_templates_id: invoice_reader_templates_id || null,
      match_rules: JSON.stringify(match_rules || {}),
      defaults: JSON.stringify(defaults || {}),
      error_handling: JSON.stringify(error_handling || {}),
      status: status || 'Active',
    });

    const row = await db('invoice_reader_profiles').where('invoice_reader_profiles_id', id).first();
    row.match_rules = typeof row.match_rules === 'string' ? JSON.parse(row.match_rules) : row.match_rules;
    row.defaults = typeof row.defaults === 'string' ? JSON.parse(row.defaults) : row.defaults;
    row.error_handling = typeof row.error_handling === 'string' ? JSON.parse(row.error_handling) : row.error_handling;
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/profiles'); }
});

router.put('/profiles/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid profile ID' });
  try {
    const { name, vendors_id, format_type, invoice_reader_templates_id, match_rules, defaults, error_handling, status } = req.body;
    const update = { updated_at: new Date().toISOString().slice(0, 10) };
    if (name !== undefined)        update.name = name;
    if (vendors_id !== undefined)  update.vendors_id = vendors_id || null;
    if (format_type !== undefined)  update.format_type = format_type;
    if (invoice_reader_templates_id !== undefined) update.invoice_reader_templates_id = invoice_reader_templates_id || null;
    if (match_rules !== undefined)  update.match_rules = JSON.stringify(match_rules);
    if (defaults !== undefined)     update.defaults = JSON.stringify(defaults);
    if (error_handling !== undefined) update.error_handling = JSON.stringify(error_handling);
    if (status !== undefined)       update.status = status;

    await db('invoice_reader_profiles').where('invoice_reader_profiles_id', id).update(update);
    const row = await db('invoice_reader_profiles').where('invoice_reader_profiles_id', id).first();
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    row.match_rules = typeof row.match_rules === 'string' ? JSON.parse(row.match_rules) : row.match_rules;
    row.defaults = typeof row.defaults === 'string' ? JSON.parse(row.defaults) : row.defaults;
    row.error_handling = typeof row.error_handling === 'string' ? JSON.parse(row.error_handling) : row.error_handling;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/profiles'); }
});

router.delete('/profiles/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid profile ID' });
  try {
    await db('invoice_reader_profiles').where('invoice_reader_profiles_id', id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'invoice-reader/profiles'); }
});

// ── Test profile match against a file ─────────────────────
router.post('/profiles/test-match', requireRole('Admin', 'Manager'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const { originalname, buffer } = req.file;
    const format = detectFormat(originalname, buffer);
    const fileIds = await extractFileIdentifiers(buffer, format, originalname);
    const profile = await matchProfile(fileIds);
    res.json({ matched: !!profile, profile: profile || null, file_identifiers: fileIds });
  } catch (err) { safeError(res, err, 'invoice-reader/profiles/test-match'); }
});

// ═══════════════════════════════════════════════════════════
// ── Reader Exceptions CRUD ────────────────────────────────
// ═══════════════════════════════════════════════════════════

router.get('/exceptions', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    let query = db('invoice_reader_exceptions as e')
      .leftJoin('invoice_reader_uploads as u', 'e.invoice_reader_uploads_id', 'u.invoice_reader_uploads_id')
      .leftJoin('invoice_reader_profiles as p', 'e.invoice_reader_profiles_id', 'p.invoice_reader_profiles_id')
      .leftJoin('users as usr', 'e.resolved_by', 'usr.users_id')
      .select(
        'e.*',
        'u.file_name', 'u.format_type as upload_format', 'u.status as upload_status',
        'p.name as profile_name',
        'usr.display_name as resolved_by_name'
      );
    if (req.query.status)  query = query.where('e.status', req.query.status);
    if (req.query.type)    query = query.where('e.type', req.query.type);
    if (req.query.severity) query = query.where('e.severity', req.query.severity);
    if (req.query.invoice_reader_uploads_id) query = query.where('e.invoice_reader_uploads_id', req.query.invoice_reader_uploads_id);
    const rows = await query.orderBy('e.created_at', 'desc');
    res.json(rows.map(r => ({
      ...r,
      context: typeof r.context === 'string' ? JSON.parse(r.context) : r.context,
      resolution: r.resolution ? (typeof r.resolution === 'string' ? JSON.parse(r.resolution) : r.resolution) : null,
    })));
  } catch (err) { safeError(res, err, 'invoice-reader/exceptions'); }
});

router.get('/exceptions/stats', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const stats = await db('invoice_reader_exceptions')
      .select('status')
      .count('* as count')
      .groupBy('status');
    const byType = await db('invoice_reader_exceptions')
      .where('status', 'open')
      .select('type')
      .count('* as count')
      .groupBy('type');
    res.json({ by_status: stats, open_by_type: byType });
  } catch (err) { safeError(res, err, 'invoice-reader/exceptions'); }
});

router.get('/exceptions/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid exception ID' });
  try {
    const row = await db('invoice_reader_exceptions as e')
      .leftJoin('invoice_reader_uploads as u', 'e.invoice_reader_uploads_id', 'u.invoice_reader_uploads_id')
      .leftJoin('invoice_reader_profiles as p', 'e.invoice_reader_profiles_id', 'p.invoice_reader_profiles_id')
      .leftJoin('users as usr', 'e.resolved_by', 'usr.users_id')
      .select('e.*', 'u.file_name', 'u.format_type as upload_format', 'p.name as profile_name', 'usr.display_name as resolved_by_name')
      .where('e.invoice_reader_exceptions_id', id).first();
    if (!row) return res.status(404).json({ error: 'Exception not found' });
    row.context = typeof row.context === 'string' ? JSON.parse(row.context) : row.context;
    row.resolution = row.resolution ? (typeof row.resolution === 'string' ? JSON.parse(row.resolution) : row.resolution) : null;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/exceptions'); }
});

router.put('/exceptions/:id/resolve', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid exception ID' });
  try {
    const { resolution, status } = req.body;
    await db('invoice_reader_exceptions')
      .where('invoice_reader_exceptions_id', id)
      .update({
        status: status || 'resolved',
        resolution: resolution ? JSON.stringify(resolution) : null,
        resolved_by: req.user?.users_id || null,
        resolved_at: db.raw('CURRENT_TIMESTAMP'),
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      });
    const row = await db('invoice_reader_exceptions').where('invoice_reader_exceptions_id', id).first();
    if (!row) return res.status(404).json({ error: 'Exception not found' });
    row.context = typeof row.context === 'string' ? JSON.parse(row.context) : row.context;
    row.resolution = row.resolution ? (typeof row.resolution === 'string' ? JSON.parse(row.resolution) : row.resolution) : null;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/exceptions'); }
});

router.put('/exceptions/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid exception ID' });
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const update = { status, updated_at: db.raw('CURRENT_TIMESTAMP') };
    if (status === 'resolved' || status === 'ignored') {
      update.resolved_by = req.user?.users_id || null;
      update.resolved_at = db.raw('CURRENT_TIMESTAMP');
    }
    await db('invoice_reader_exceptions').where('invoice_reader_exceptions_id', id).update(update);
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'invoice-reader/exceptions'); }
});

module.exports = router;
