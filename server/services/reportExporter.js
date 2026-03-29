/**
 * @file reportExporter.js — Background report export service.
 * Builds a Knex query from a report config, streams results to CSV/XLSX,
 * and optionally emails the file to the user.
 *
 * @module services/reportExporter
 */
const fs      = require('fs');
const path    = require('path');
const ExcelJS = require('exceljs');
const db      = require('../db');
const { CATALOG, TABLES, ADJACENCY, VALID_OPS, getField, resolveJoins, applyOperator } = require('../routes/reports');

const EXPORT_DIR = path.join(__dirname, '..', 'exports');
const MAX_ROWS   = 100000;

// Ensure exports directory exists
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

/**
 * Build a Knex query from a report config (same shape as POST /reports/run body).
 * Returns { query, resultFields } without executing.
 */
function buildReportQuery(config) {
  const isMultiTable = Array.isArray(config.linkedTables) && config.linkedTables.length > 0;

  if (isMultiTable) {
    return buildMultiTableQuery(config);
  }
  return buildLegacyQuery(config);
}

function buildLegacyQuery(config) {
  const {
    tableKey,
    fields       = [],
    filters      = [],
    filterLogic  = 'AND',
    sorts        = [],
    groupBy      = [],
    aggregations = [],
    distinct     = false,
  } = config;

  const tableDef = CATALOG[tableKey];
  if (!tableDef) throw new Error(`Invalid data source: ${tableKey}`);

  const VALID_AGG_FUNCS = new Set(['sum', 'avg', 'min', 'max', 'count']);

  const selectedFields = fields.map(fkey => {
    const fd = getField(tableKey, fkey);
    if (!fd) throw new Error(`Invalid field: ${fkey}`);
    return fd;
  });
  if (selectedFields.length === 0 && groupBy.length === 0 && aggregations.length === 0) {
    throw new Error('Select at least one column');
  }

  // Validate
  for (const f of filters) {
    if (!getField(tableKey, f.field)) throw new Error(`Invalid filter field: ${f.field}`);
    if (!VALID_OPS.has(f.op)) throw new Error(`Invalid operator: ${f.op}`);
  }
  for (const s of sorts) {
    if (!getField(tableKey, s.field)) throw new Error(`Invalid sort field: ${s.field}`);
  }
  for (const g of groupBy) {
    if (!getField(tableKey, g)) throw new Error(`Invalid group-by field: ${g}`);
  }
  for (const ag of aggregations) {
    if (!getField(tableKey, ag.field)) throw new Error(`Invalid aggregation field: ${ag.field}`);
    if (!VALID_AGG_FUNCS.has(ag.func)) throw new Error(`Invalid aggregation function: ${ag.func}`);
  }

  // Determine joins
  const allJoinSets = [
    ...selectedFields.map(f => f.join),
    ...filters.map(f => getField(tableKey, f.field)?.join),
    ...sorts.map(s => getField(tableKey, s.field)?.join),
    ...groupBy.map(g => getField(tableKey, g)?.join),
    ...aggregations.map(ag => getField(tableKey, ag.field)?.join),
  ].filter(Boolean);

  const orderedJoins = resolveJoins(tableDef, allJoinSets);

  let query = db(`${tableDef.table} as ${tableDef.alias}`);
  if (distinct) query = query.distinct();

  for (const alias of orderedJoins) {
    const jdef = tableDef.joins[alias];
    query = query.leftJoin(`${jdef.table} as ${alias}`, jdef.on[0], jdef.on[1]);
  }

  const isGrouped = groupBy.length > 0 || aggregations.length > 0;

  if (isGrouped) {
    const selectParts = [];
    for (const g of groupBy) {
      const fd = getField(tableKey, g);
      selectParts.push(db.raw('?? as ??', [fd.col, g]));
    }
    for (const ag of aggregations) {
      const fd = getField(tableKey, ag.field);
      selectParts.push(db.raw(`${ag.func.toUpperCase()}(??) as ??`, [fd.col, `${ag.func}_${ag.field}`]));
    }
    query = query.select(selectParts);
    for (const g of groupBy) {
      const fd = getField(tableKey, g);
      query = query.groupBy(fd.col);
    }
  } else {
    const selectParts = selectedFields.map(f => db.raw('?? as ??', [f.col, f.key]));
    query = query.select(selectParts);
  }

  // Filters
  if (filters.length > 0) {
    if (filterLogic === 'OR') {
      query = query.where(function () {
        for (const f of filters) {
          const fd = getField(tableKey, f.field);
          this.orWhere(function () { applyOperator(this, fd.col, f.op, f.value); });
        }
      });
    } else {
      for (const f of filters) {
        const fd = getField(tableKey, f.field);
        query = applyOperator(query, fd.col, f.op, f.value);
      }
    }
  }

  // Sorts
  for (const s of sorts) {
    const fd = getField(tableKey, s.field);
    query = query.orderBy(fd.col, s.direction);
  }

  // Result fields
  let resultFields;
  if (isGrouped) {
    resultFields = [
      ...groupBy.map(g => {
        const fd = getField(tableKey, g);
        return { key: g, label: fd.label, format: fd.format, type: fd.type };
      }),
      ...aggregations.map(ag => {
        const fd = getField(tableKey, ag.field);
        return { key: `${ag.func}_${ag.field}`, label: `${ag.func.toUpperCase()}(${fd.label})`, format: fd.format, type: 'number' };
      }),
    ];
  } else {
    resultFields = selectedFields.map(f => ({ key: f.key, label: f.label, format: f.format, type: f.type }));
  }

  return { query, resultFields };
}

function buildMultiTableQuery(config) {
  const {
    tableKey,
    linkedTables = [],
    fields       = [],
    filters      = [],
    filterLogic  = 'AND',
    sorts        = [],
    groupBy      = [],
    aggregations = [],
    distinct     = false,
  } = config;

  const VALID_AGG = new Set(['sum', 'avg', 'min', 'max', 'count']);
  const primaryDef = TABLES[tableKey];
  if (!primaryDef) throw new Error(`Invalid data source: ${tableKey}`);

  const aliasMap = { [tableKey]: primaryDef.alias };
  const joinOrder = [];
  for (const lt of linkedTables) {
    const ltDef = TABLES[lt.tableKey];
    if (!ltDef) throw new Error(`Invalid linked table: ${lt.tableKey}`);
    if (!ADJACENCY[lt.joinFrom]?.[lt.tableKey])
      throw new Error(`No relationship: ${lt.joinFrom} → ${lt.tableKey}`);
    aliasMap[lt.tableKey] = ltDef.alias;
    joinOrder.push(lt);
  }

  const resolveCol = (tbl, fld) => {
    const tDef = TABLES[tbl];
    if (!tDef) throw new Error(`Invalid table: ${tbl}`);
    if (!aliasMap[tbl]) throw new Error(`Table not selected: ${tbl}`);
    const fDef = tDef.fields.find(f => f.key === fld);
    if (!fDef) throw new Error(`Invalid field: ${tbl}.${fld}`);
    return { col: `${aliasMap[tbl]}.${fDef.col}`, fDef, tDef };
  };

  const resolvedFields = [];
  for (const f of fields) {
    const { col, fDef, tDef } = resolveCol(f.table, f.field);
    resolvedFields.push({
      col, table: f.table, field: f.field,
      label: fDef.label, format: fDef.format, type: fDef.type,
      tableLabel: tDef.label,
      resultKey: `${f.table}__${f.field}`,
    });
  }

  for (const f of filters) { resolveCol(f.table, f.field); if (!VALID_OPS.has(f.op)) throw new Error(`Invalid operator: ${f.op}`); }
  for (const s of sorts) { resolveCol(s.table, s.field); }
  for (const g of groupBy) { resolveCol(g.table, g.field); }
  for (const ag of aggregations) { resolveCol(ag.table, ag.field); if (!VALID_AGG.has(ag.func)) throw new Error(`Invalid agg: ${ag.func}`); }

  const isGrouped = groupBy.length > 0 || aggregations.length > 0;
  if (resolvedFields.length === 0 && !isGrouped) throw new Error('Select at least one column');

  let query = db(`${primaryDef.table} as ${primaryDef.alias}`);
  if (distinct) query = query.distinct();

  for (const lt of joinOrder) {
    const ltDef = TABLES[lt.tableKey];
    const rel = ADJACENCY[lt.joinFrom][lt.tableKey];
    const fromAlias = aliasMap[lt.joinFrom];
    const toAlias = ltDef.alias;
    query = query.leftJoin(`${ltDef.table} as ${toAlias}`, `${fromAlias}.${rel.fromCol}`, `${toAlias}.${rel.toCol}`);
  }

  if (isGrouped) {
    const selectParts = [];
    for (const g of groupBy) {
      const { col } = resolveCol(g.table, g.field);
      selectParts.push(db.raw('?? as ??', [col, `${g.table}__${g.field}`]));
    }
    for (const ag of aggregations) {
      const { col } = resolveCol(ag.table, ag.field);
      selectParts.push(db.raw(`${ag.func.toUpperCase()}(??) as ??`, [col, `${ag.func}_${ag.table}__${ag.field}`]));
    }
    query = query.select(selectParts);
    for (const g of groupBy) {
      const { col } = resolveCol(g.table, g.field);
      query = query.groupBy(col);
    }
  } else {
    const selectParts = resolvedFields.map(f => db.raw('?? as ??', [f.col, f.resultKey]));
    query = query.select(selectParts);
  }

  if (filters.length > 0) {
    if (filterLogic === 'OR') {
      query = query.where(function () {
        for (const f of filters) {
          const { col } = resolveCol(f.table, f.field);
          this.orWhere(function () { applyOperator(this, col, f.op, f.value); });
        }
      });
    } else {
      for (const f of filters) {
        const { col } = resolveCol(f.table, f.field);
        query = applyOperator(query, col, f.op, f.value);
      }
    }
  }

  for (const s of sorts) {
    const { col } = resolveCol(s.table, s.field);
    query = query.orderBy(col, s.direction);
  }

  const multiTable = linkedTables.length > 0;
  let resultFields;
  if (isGrouped) {
    resultFields = [
      ...groupBy.map(g => {
        const { fDef, tDef } = resolveCol(g.table, g.field);
        return { key: `${g.table}__${g.field}`, label: multiTable ? `${tDef.label}: ${fDef.label}` : fDef.label, format: fDef.format, type: fDef.type };
      }),
      ...aggregations.map(ag => {
        const { fDef, tDef } = resolveCol(ag.table, ag.field);
        return { key: `${ag.func}_${ag.table}__${ag.field}`, label: multiTable ? `${ag.func.toUpperCase()}(${tDef.label}: ${fDef.label})` : `${ag.func.toUpperCase()}(${fDef.label})`, format: fDef.format, type: 'number' };
      }),
    ];
  } else {
    resultFields = resolvedFields.map(f => ({
      key: f.resultKey, label: multiTable ? `${f.tableLabel}: ${f.label}` : f.label, format: f.format, type: f.type,
    }));
  }

  return { query, resultFields };
}

/**
 * Process a report job: query DB, write file, optionally email.
 * @param {number} jobId - report_jobs row ID
 */
async function processJob(jobId) {
  const job = await db('report_jobs').where('report_jobs_id', jobId).first();
  if (!job || job.status !== 'queued') return;

  await db('report_jobs').where('report_jobs_id', jobId).update({
    status: 'running',
    started_at: db.fn.now(),
  });

  try {
    const config = JSON.parse(job.config);
    const { query, resultFields } = buildReportQuery(config);

    // Count first to enforce limit
    const countQuery = query.clone().clearSelect().clearGroup().clearOrder().count('* as total').first();
    const countResult = await countQuery;
    const totalRows = Number(countResult?.total || 0);

    const rowLimit = Math.min(job.row_limit || MAX_ROWS, MAX_ROWS);
    const finalQuery = query.limit(rowLimit);
    const rows = await finalQuery;

    // Build header labels for columns
    const headers = resultFields.map(f => f.label);
    const keys = resultFields.map(f => f.key);

    const timestamp = Date.now();
    const safeName = (job.name || 'report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const ext = job.format === 'xlsx' ? 'xlsx' : 'csv';
    const fileName = `${safeName}_${timestamp}.${ext}`;
    const filePath = path.join(EXPORT_DIR, fileName);

    // Build worksheet data
    const wsData = [headers];
    for (const row of rows) {
      wsData.push(keys.map(k => row[k] ?? ''));
    }

    if (ext === 'csv') {
      const csvLines = wsData.map(row => row.map(cell => {
        const s = String(cell ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','));
      fs.writeFileSync(filePath, csvLines.join('\n'), 'utf8');
    } else {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      wsData.forEach(row => ws.addRow(row));
      const buf = await wb.xlsx.writeBuffer();
      fs.writeFileSync(filePath, Buffer.from(buf));
    }

    const stat = fs.statSync(filePath);

    await db('report_jobs').where('report_jobs_id', jobId).update({
      status: 'completed',
      total_rows: Math.min(rows.length, rowLimit),
      file_path: fileName,
      file_size: stat.size,
      completed_at: db.fn.now(),
    });

    // Email if requested
    if (job.email_to) {
      try {
        const email = require('./email');
        await email.send({
          to: job.email_to,
          subject: `TEMS Report Ready: ${job.name}`,
          html: email.emailTemplate({
            title: 'Your Report is Ready',
            body: `<p>Your report <strong>${job.name}</strong> has been generated with ${rows.length.toLocaleString()} rows.</p>`
              + (totalRows > rowLimit
                ? `<p style="color:#f59e0b">Note: The full dataset contains ${totalRows.toLocaleString()} rows but was capped at ${rowLimit.toLocaleString()}.</p>`
                : '')
              + `<p>Download your report from the TEMS application under <strong>Reports → Export History</strong>.</p>`,
          }),
          users_id: job.users_id,
        });
        await db('report_jobs').where('report_jobs_id', jobId).update({ email_sent: true });
      } catch (emailErr) {
        console.error('Report email failed:', emailErr.message);
      }
    }

    return { totalRows, exportedRows: rows.length, fileName };
  } catch (err) {
    await db('report_jobs').where('report_jobs_id', jobId).update({
      status: 'failed',
      error_message: String(err.message || err).slice(0, 2000),
      completed_at: db.fn.now(),
    });
    throw err;
  }
}

/**
 * Clean up export files older than 24 hours.
 */
async function cleanupOldExports() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const old = await db('report_jobs')
    .where('status', 'completed')
    .where('completed_at', '<', cutoff)
    .whereNotNull('file_path');

  for (const job of old) {
    const fp = path.join(EXPORT_DIR, job.file_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    await db('report_jobs').where('report_jobs_id', job.report_jobs_id).update({ file_path: null });
  }
}

module.exports = { processJob, cleanupOldExports, EXPORT_DIR, MAX_ROWS };
