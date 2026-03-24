// ============================================================
// Invoice Reader API — Dynamic invoice parsing & batch import
// Supports EDI (X12 810), Excel (.xlsx/.xls), and PDF formats
// ============================================================
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const XLSX     = require('xlsx');
const pdf      = require('pdf-parse');
const db       = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');

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
  'application/octet-stream',        // generic binary fallback (some browsers)
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
function parseExcel(buffer, fileName) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = wb.SheetNames.map(name => {
    const sheet = wb.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const totalRows = range.e.r; // 0-indexed last row

    // Extract headers from first row
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
      headers.push(cell ? String(cell.v) : `Column ${c + 1}`);
    }

    // Extract preview rows (first 20)
    const previewRows = [];
    const maxPreview = Math.min(totalRows, 20);
    for (let r = 1; r <= maxPreview; r++) {
      const row = {};
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        row[headers[c]] = cell ? cell.v : null;
      }
      previewRows.push(row);
    }

    // Get all data rows
    const allRows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    return { name, headers, totalRows, previewRows, allRows };
  });

  return { format: 'Excel', fileName, sheets };
}

// ── EDI (X12 810) parser ─────────────────────────────────────
function parseEDI(buffer) {
  const raw = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect delimiters from ISA segment
  let segDelim = '~';
  let elemDelim = '*';
  let subElemDelim = ':';
  const isaMatch = raw.match(/^ISA(.)/);
  if (isaMatch) {
    elemDelim = isaMatch[1];
    // Sub-element separator is ISA[16], segment terminator follows ISA
    const isaEnd = raw.indexOf(elemDelim, 3);
    if (isaEnd > 0) {
      // ISA is fixed 106 chars; segment terminator is char after position 105
      const isaSegment = raw.substring(0, 106 + 2);
      const elems = isaSegment.split(elemDelim);
      if (elems.length >= 17) {
        subElemDelim = elems[16]?.[0] || ':';
      }
    }
  }

  // Split into segments
  const segments = raw.split(/[~\n]/).map(s => s.trim()).filter(Boolean);

  // Parse into structured data
  const headers = [];
  const rows = [];
  let currentInvoice = {};
  let currentLineItems = [];

  for (const seg of segments) {
    const elems = seg.split(elemDelim);
    const segId = elems[0];

    switch (segId) {
      case 'BIG': // Beginning segment for invoice
        if (Object.keys(currentInvoice).length && currentLineItems.length) {
          rows.push({ invoice: currentInvoice, lineItems: [...currentLineItems] });
        }
        currentInvoice = {
          invoice_date: formatEDIDate(elems[1]),
          invoice_number: elems[2] || '',
          po_number: elems[4] || '',
        };
        currentLineItems = [];
        break;
      case 'N1': // Entity name
        if (elems[1] === 'ST') currentInvoice.ship_to = elems[2] || '';
        if (elems[1] === 'BT') currentInvoice.bill_to = elems[2] || '';
        if (elems[1] === 'RE') currentInvoice.vendor_name = elems[2] || '';
        break;
      case 'IT1': // Line item
        currentLineItems.push({
          line_number: elems[1] || '',
          quantity: parseFloat(elems[2]) || 0,
          unit: elems[3] || '',
          unit_price: parseFloat(elems[4]) || 0,
          product_id: elems[7] || '',
          description: '',
        });
        break;
      case 'PID': // Product description
        if (currentLineItems.length) {
          currentLineItems[currentLineItems.length - 1].description = elems[5] || '';
        }
        break;
      case 'TDS': // Total monetary value
        currentInvoice.total_amount = parseFloat(elems[1]) / 100 || 0; // TDS is in cents
        break;
      case 'DTM': // Date/time reference
        if (elems[1] === '011') currentInvoice.due_date = formatEDIDate(elems[2]);
        break;
      case 'REF': // Reference
        if (elems[1] === 'BM') currentInvoice.reference_number = elems[2] || '';
        break;
    }
  }

  // Push last invoice
  if (Object.keys(currentInvoice).length) {
    rows.push({ invoice: currentInvoice, lineItems: [...currentLineItems] });
  }

  // Flatten for column detection
  const flatRows = [];
  for (const r of rows) {
    for (const li of r.lineItems) {
      flatRows.push({ ...r.invoice, ...li });
    }
    if (!r.lineItems.length) flatRows.push(r.invoice);
  }

  const detectedHeaders = flatRows.length ? Object.keys(flatRows[0]) : [];

  return {
    format: 'EDI',
    segments: segments.length,
    invoiceCount: rows.length,
    headers: detectedHeaders,
    previewRows: flatRows.slice(0, 20),
    allRows: flatRows,
    structured: rows,
  };
}

function formatEDIDate(ediDate) {
  if (!ediDate || ediDate.length < 8) return null;
  return `${ediDate.substring(0, 4)}-${ediDate.substring(4, 6)}-${ediDate.substring(6, 8)}`;
}

// ── PDF parser ───────────────────────────────────────────────
async function parsePDF(buffer) {
  const data = await pdf(buffer);
  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Attempt to detect tabular data by splitting on multiple spaces
  const tableRows = [];
  let headers = [];
  let headerFound = false;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/\s{2,}/).filter(Boolean);
    if (parts.length >= 3) {
      if (!headerFound) {
        // First row with 3+ columns is likely headers
        headers = parts;
        headerFound = true;
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
  { field: 'invoice_number', label: 'Invoice Number', table: 'invoices', type: 'string', required: true },
  { field: 'invoice_date',   label: 'Invoice Date',   table: 'invoices', type: 'date' },
  { field: 'due_date',       label: 'Due Date',       table: 'invoices', type: 'date' },
  { field: 'period_start',   label: 'Period Start',   table: 'invoices', type: 'date' },
  { field: 'period_end',     label: 'Period End',     table: 'invoices', type: 'date' },
  { field: 'total_amount',   label: 'Total Amount',   table: 'invoices', type: 'decimal' },
  { field: 'status',         label: 'Invoice Status', table: 'invoices', type: 'string' },
];

const LINE_ITEM_FIELDS = [
  { field: 'inventory_number', label: 'InventoryItem Number',  table: 'line_items', type: 'string', lookup: 'inventory' },
  { field: 'description',    label: 'Description',     table: 'line_items', type: 'string' },
  { field: 'charge_type',    label: 'Charge Type',     table: 'line_items', type: 'string' },
  { field: 'amount',         label: 'Amount',          table: 'line_items', type: 'decimal', required: true },
  { field: 'mrc_amount',     label: 'MRC Amount',      table: 'line_items', type: 'decimal' },
  { field: 'nrc_amount',     label: 'NRC Amount',      table: 'line_items', type: 'decimal' },
  { field: 'usoc_code',      label: 'USOC Code',       table: 'line_items', type: 'string', lookup: 'usoc_codes' },
  { field: 'period_start',   label: 'Line Period Start', table: 'line_items', type: 'date' },
  { field: 'period_end',     label: 'Line Period End',   table: 'line_items', type: 'date' },
];

// ── GET /fields — available target fields for mapping ────────
router.get('/fields', (_req, res) => {
  res.json({
    invoiceFields: INVOICE_FIELDS,
    lineItemFields: LINE_ITEM_FIELDS,
  });
});

// ── POST /parse — upload & parse file, return preview (Analyst+) ──
router.post('/parse', requireRole('Admin', 'Manager', 'Analyst'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { originalname, buffer } = req.file;
    const format = detectFormat(originalname, buffer);

    let parsed;
    switch (format) {
      case 'Excel':
        parsed = parseExcel(buffer, originalname);
        break;
      case 'EDI':
        parsed = parseEDI(buffer);
        break;
      case 'PDF':
        parsed = await parsePDF(buffer);
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
      .leftJoin('accounts as a', 't.accounts_id', 'a.accounts_id')
      .select('t.*', 'a.name as account_name');

    if (req.query.accounts_id) query = query.where('t.accounts_id', req.query.accounts_id);
    if (req.query.format_type) query = query.where('t.format_type', req.query.format_type);
    if (req.query.status)      query = query.where('t.status', req.query.status);

    const rows = await query.orderBy('t.created_at', 'desc');

    // Parse config JSON for each row
    res.json(rows.map(r => ({
      ...r,
      config: r.config ? JSON.parse(r.config) : null,
    })));
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// GET /templates/:id
router.get('/templates/:id', requireRole('Admin', 'Manager', 'Analyst'), async (req, res) => {
  try {
    const row = await db('invoice_reader_templates as t')
      .leftJoin('accounts as a', 't.accounts_id', 'a.accounts_id')
      .select('t.*', 'a.name as account_name')
      .where('t.invoice_reader_templates_id', req.params.id)
      .first();

    if (!row) return res.status(404).json({ error: 'Template not found' });

    row.config = row.config ? JSON.parse(row.config) : null;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// POST /templates — create (Manager+)
router.post('/templates', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { name, accounts_id, format_type, config } = req.body;
    if (!name || !format_type || !config) {
      return res.status(400).json({ error: 'name, format_type, and config are required' });
    }

    const id = await db.insertReturningId('invoice_reader_templates', {
      name,
      accounts_id: accounts_id || null,
      format_type,
      config: JSON.stringify(config),
      status: 'Active',
    });

    const row = await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', id).first();
    row.config = JSON.parse(row.config);
    res.status(201).json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// PUT /templates/:id — update (Manager+)
router.put('/templates/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { name, accounts_id, format_type, config, status } = req.body;
    const update = {};
    if (name !== undefined)        update.name = name;
    if (accounts_id !== undefined) update.accounts_id = accounts_id || null;
    if (format_type !== undefined)  update.format_type = format_type;
    if (config !== undefined)      update.config = JSON.stringify(config);
    if (status !== undefined)      update.status = status;
    update.updated_at = new Date().toISOString().slice(0, 10);

    await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', req.params.id)
      .update(update);

    const row = await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', req.params.id).first();
    row.config = row.config ? JSON.parse(row.config) : null;
    res.json(row);
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// DELETE /templates/:id (Manager+)
router.delete('/templates/:id', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    await db('invoice_reader_templates')
      .where('invoice_reader_templates_id', req.params.id).del();
    res.json({ success: true });
  } catch (err) { safeError(res, err, 'invoice-reader/templates'); }
});

// ═══════════════════════════════════════════════════════════
// ── Process — batch import using a template ───────────────
// ═══════════════════════════════════════════════════════════

router.post('/process', requireRole('Admin', 'Manager'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { template_id, accounts_id, mappings, sheet_name } = (() => {
    // Mappings may come as JSON string in multipart form
    try {
      return {
        template_id: req.body.template_id ? Number(req.body.template_id) : null,
        accounts_id: req.body.accounts_id ? Number(req.body.accounts_id) : null,
        mappings: req.body.mappings ? JSON.parse(req.body.mappings) : null,
        sheet_name: req.body.sheet_name || null,
      };
    } catch {
      return req.body;
    }
  })();

  try {
    const { originalname, buffer } = req.file;
    const format = detectFormat(originalname, buffer);

    // Resolve mappings — from template or request body
    let columnMappings;
    let templateRecord = null;
    if (template_id) {
      templateRecord = await db('invoice_reader_templates')
        .where('invoice_reader_templates_id', template_id).first();
      if (!templateRecord) return res.status(404).json({ error: 'Template not found' });
      const cfg = JSON.parse(templateRecord.config);
      columnMappings = cfg.columnMappings;
    } else if (mappings) {
      columnMappings = mappings;
    } else {
      return res.status(400).json({ error: 'Either template_id or mappings is required' });
    }

    // Parse file
    let allRows = [];
    switch (format) {
      case 'Excel': {
        const parsed = parseExcel(buffer, originalname);
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

    // Create upload tracking record
    const uploadId = await db.insertReturningId('invoice_reader_uploads', {
      invoice_reader_templates_id: template_id || null,
      accounts_id: accounts_id || null,
      file_name: originalname,
      format_type: format,
      status: 'Processing',
      total_rows: allRows.length,
    });

    // ── Apply mappings and batch-insert ──────────────────
    const errors = [];
    let insertedInvoices = 0;
    let insertedLineItems = 0;

    // Separate invoice-level and line-item-level mappings
    // columnMappings format: { "Source Column Name": { field, table } }
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

    // Group rows by invoice (using invoice_number mapping to detect invoice boundaries)
    const invoiceNumberCol = Object.entries(invoiceMappings)
      .find(([, m]) => m.field === 'invoice_number')?.[0];

    // Build inventoryItem & USOC lookup caches
    const inventoryItemCache = {};
    const inventoryItemCol = Object.entries(lineItemMappings).find(([, m]) => m.field === 'inventory_number')?.[0];
    if (inventoryItemCol) {
      const inventory = await db('inventory').select('cir_id', 'inventory_number');
      inventory.forEach(c => { inventoryItemCache[c.inventory_number] = c.cir_id; });
    }

    const usocCache = {};
    const usocCol = Object.entries(lineItemMappings).find(([, m]) => m.field === 'usoc_code')?.[0];
    if (usocCol) {
      const usocs = await db('usoc_codes').select('usoc_codes_id', 'usoc_code');
      usocs.forEach(u => { usocCache[u.usoc_code] = u.usoc_codes_id; });
    }

    // Group rows by invoice number (or treat each row as a separate invoice)
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
          group.invoiceData[mapping.field] = val;
        }
      }

      // Extract line item fields
      const lineItem = {};
      for (const [srcCol, mapping] of Object.entries(lineItemMappings)) {
        const val = coerceVal(row[srcCol], mapping.type || 'string');
        if (val !== null && val !== undefined) {
          if (mapping.field === 'inventory_number') {
            lineItem.cir_id = inventoryItemCache[val] || null;
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

    // Batch insert invoices and line items
    const BATCH_SIZE = 500;
    const invoiceEntries = [...invoiceGroups.entries()];

    for (let i = 0; i < invoiceEntries.length; i += BATCH_SIZE) {
      const batch = invoiceEntries.slice(i, i + BATCH_SIZE);

      for (const [invNum, group] of batch) {
        try {
          // Build invoice record
          const invoiceRecord = {
            accounts_id: accounts_id || null,
            invoice_number: invNum,
            status: 'Open',
            ...group.invoiceData,
          };

          // Coerce dates
          for (const key of ['invoice_date', 'due_date', 'period_start', 'period_end', 'payment_date']) {
            if (invoiceRecord[key]) invoiceRecord[key] = coerceDate(invoiceRecord[key]);
          }
          if (invoiceRecord.total_amount) {
            invoiceRecord.total_amount = parseFloat(invoiceRecord.total_amount) || 0;
          }

          // Insert invoice
          const invoiceId = await db.insertReturningId('invoices', invoiceRecord);
          insertedInvoices++;

          // Insert line items in sub-batches
          if (group.lineItems.length) {
            const liRecords = group.lineItems.map(li => {
              const { _rowNum, ...fields } = li;
              const record = { invoices_id: invoiceId, ...fields };
              // Coerce decimal fields
              for (const key of ['amount', 'mrc_amount', 'nrc_amount', 'contracted_rate', 'variance']) {
                if (record[key] !== undefined) record[key] = parseFloat(record[key]) || 0;
              }
              for (const key of ['period_start', 'period_end']) {
                if (record[key]) record[key] = coerceDate(record[key]);
              }
              return record;
            });

            // Insert line items in chunks
            for (let j = 0; j < liRecords.length; j += BATCH_SIZE) {
              const liBatch = liRecords.slice(j, j + BATCH_SIZE);
              await db('line_items').insert(liBatch);
              insertedLineItems += liBatch.length;
            }
          }
        } catch (err) {
          errors.push(`Invoice "${invNum}": ${err.message}`);
        }
      }
    }

    // Update upload record
    const finalStatus = errors.length ? (insertedInvoices > 0 ? 'Completed' : 'Failed') : 'Completed';
    await db('invoice_reader_uploads')
      .where('invoice_reader_uploads_id', uploadId)
      .update({
        status: finalStatus,
        inserted_invoices: insertedInvoices,
        inserted_line_items: insertedLineItems,
        error_count: errors.length,
        errors: errors.length ? JSON.stringify(errors.slice(0, 200)) : null,
        completed_at: db.raw('CURRENT_TIMESTAMP'),
      });

    res.json({
      success: true,
      upload_id: uploadId,
      status: finalStatus,
      total_rows: allRows.length,
      invoices_created: insertedInvoices,
      line_items_created: insertedLineItems,
      error_count: errors.length,
      errors: errors.slice(0, 50),
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
      .leftJoin('accounts as a', 'u.accounts_id', 'a.accounts_id')
      .select('u.*', 't.name as template_name', 'a.name as account_name');

    if (req.query.accounts_id) query = query.where('u.accounts_id', req.query.accounts_id);
    if (req.query.status)      query = query.where('u.status', req.query.status);

    const rows = await query.orderBy('u.created_at', 'desc');
    res.json(rows.map(r => ({
      ...r,
      errors: r.errors ? JSON.parse(r.errors) : [],
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

module.exports = router;
