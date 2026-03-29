/**
 * Generates a sample invoice PDF for testing the Invoice Reader upload feature.
 * Run: node server/scripts/generateTestInvoicePdf.js
 * Output: test-invoice.pdf in the project root
 */
const fs      = require('fs');
const path    = require('path');
const PDFDocument = require('pdfkit');

const out = path.resolve(__dirname, '../../test-invoice.pdf');
const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
const stream = fs.createWriteStream(out);
doc.pipe(stream);

// ── Title ────────────────────────────────────────────────────
doc.font('Courier-Bold').fontSize(14).text('ACME TELECOM SERVICES', { align: 'center' });
doc.font('Courier').fontSize(11).text('Invoice Statement - March 2026', { align: 'center' });
doc.moveDown(1);

// ── Helper: draw a table row as a single padded string ───────
// Courier at 9pt has a fixed character width of 5.4pt (600/1000 * 9).
// Each column is padded to its character width so pdfjs extracts a single
// string with guaranteed multi-space separation between columns.
const CHAR_W = 5.4;
function row(doc, cols, widths, y, bold = false) {
  doc.font(bold ? 'Courier-Bold' : 'Courier').fontSize(9);
  const line = cols.map((text, i) => {
    const chars = Math.max(1, Math.floor(widths[i] / CHAR_W) - 1);
    return String(text).substring(0, chars).padEnd(chars);
  }).join('  '); // 2-space separator guarantees split(/\s{2,}/) detection
  doc.text(line, 40, y, { lineBreak: false });
}

// ── Invoice summary table ────────────────────────────────────
const invWidths = [130, 120, 90, 90, 80];
const invY = doc.y + 10;
row(doc, ['Invoice Number', 'Account Number', 'Invoice Date', 'Due Date', 'Total Amount'], invWidths, invY, true);

const invoices = [
  ['INV-2026-0042', 'ACC-10091', '2026-03-01', '2026-03-31', '4250.00'],
  ['INV-2026-0043', 'ACC-10092', '2026-03-01', '2026-03-31', '1875.50'],
];
invoices.forEach((r, i) => row(doc, r, invWidths, invY + 14 * (i + 1)));

doc.moveDown(5);

// ── Line items table ─────────────────────────────────────────
const liWidths = [35, 170, 90, 55, 130, 80, 55];
const liY = doc.y + 10;
row(doc, ['Line', 'Description', 'Charge Type', 'USOC', 'Circuit ID', 'Amount', 'Quantity'], liWidths, liY, true);

const lineItems = [
  ['1', 'MPLS Circuit Primary',      'MRC', 'LNPL', 'US-TX-2291-001', '1500.00', '1'],
  ['2', 'MPLS Circuit Backup',       'MRC', 'LNPL', 'US-TX-2291-002', '750.00',  '1'],
  ['3', 'Internet 100Mbps',          'MRC', 'BRDL', 'US-NY-4401-001', '900.00',  '1'],
  ['4', 'Federal Universal Svc Fee', 'TAX', 'FUS',  'US-TX-2291-001', '68.50',   '1'],
  ['5', 'State 911 Surcharge',       'TAX', 'E911', 'US-TX-2291-001', '32.00',   '1'],
  ['6', 'Equipment Rental',          'OCC', 'EQRN', 'US-TX-2291-001', '1000.00', '1'],
];
lineItems.forEach((r, i) => row(doc, r, liWidths, liY + 14 * (i + 1)));

doc.moveDown(lineItems.length + 3);
doc.font('Courier-Bold').fontSize(10).text('Total Due: $4,250.00');

doc.end();
stream.on('finish', () => {
  console.log(`Test invoice PDF written to: ${out}`);
  console.log(`  ${fs.statSync(out).size} bytes`);
});
stream.on('error', err => console.error('Error:', err));

