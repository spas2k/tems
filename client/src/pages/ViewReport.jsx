/**
 * @file Read-only saved report viewer — displays data without config options.
 * @module ViewReport
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart2, ArrowLeft, Pencil, RefreshCw, AlertCircle, Download,
  Info, Database, Filter, Clock, User,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getSavedReport, runReport } from '../api';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 50;

function formatCell(value, fieldMeta) {
  if (value === null || value === undefined) return '—';
  if (fieldMeta?.format === 'currency')
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (fieldMeta?.format === 'date') return String(value).split('T')[0];
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function ViewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('reports', 'update');

  const [report, setReport]     = useState(null);
  const [config, setConfig]     = useState(null);
  const [results, setResults]   = useState(null);
  const [running, setRunning]   = useState(true);
  const [error, setError]       = useState(null);
  const [page, setPage]         = useState(1);

  // Load saved report and auto-run
  useEffect(() => {
    if (!id) return;
    setRunning(true); setError(null);
    getSavedReport(id)
      .then(r => {
        const row = r.data;
        const cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
        setReport(row);
        setConfig(cfg);
        return runReport({
          tableKey: cfg.tableKey,
          linkedTables: (cfg.linkedTables || []).map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
          fields: cfg.fields || [],
          filters: (cfg.filters || []).map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
          filterLogic: cfg.filterLogic || 'AND',
          sorts: (cfg.sorts || []).map(s => ({ table: s.table, field: s.field, direction: s.direction })),
          groupBy: cfg.groupBy || [],
          aggregations: (cfg.aggregations || []).map(a => ({ table: a.table, field: a.field, func: a.func })),
          limit: Math.min(cfg.limit || 1000, 10000),
          offset: 0,
          distinct: cfg.distinct || false,
        });
      })
      .then(r => { setResults(r.data); })
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to load report'))
      .finally(() => setRunning(false));
  }, [id]);

  const handleRefresh = useCallback(() => {
    if (!config) return;
    setRunning(true); setError(null); setResults(null); setPage(1);
    runReport({
      tableKey: config.tableKey,
      linkedTables: (config.linkedTables || []).map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
      fields: config.fields || [],
      filters: (config.filters || []).map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
      filterLogic: config.filterLogic || 'AND',
      sorts: (config.sorts || []).map(s => ({ table: s.table, field: s.field, direction: s.direction })),
      groupBy: config.groupBy || [],
      aggregations: (config.aggregations || []).map(a => ({ table: a.table, field: a.field, func: a.func })),
      limit: Math.min(config.limit || 1000, 10000),
      offset: 0,
      distinct: config.distinct || false,
    })
      .then(r => setResults(r.data))
      .catch(e => setError(e.response?.data?.error || e.message || 'Query failed'))
      .finally(() => setRunning(false));
  }, [config]);

  const colOverrides = config?.colOverrides || {};

  const pageData = useMemo(() => {
    if (!results?.data) return [];
    const start = (page - 1) * PAGE_SIZE;
    return results.data.slice(start, start + PAGE_SIZE);
  }, [results, page]);
  const totalPages = results ? Math.ceil(results.total / PAGE_SIZE) : 0;

  const summaryRow = useMemo(() => {
    if (!results?.data?.length || !results.fields) return null;
    const out = {};
    results.fields.forEach(f => {
      if (f.type === 'number' || f.format === 'currency') {
        out[f.key] = results.data.reduce((s, r) => s + Number(r[f.key] || 0), 0);
      }
    });
    return Object.keys(out).length ? out : null;
  }, [results]);

  const handleExport = useCallback(async (fmt) => {
    if (!results?.data?.length) return;
    const cols = results.fields || [];
    const headers = cols.map(c => colOverrides[c.key]?.label || c.label);
    const rows = results.data.map(row =>
      cols.map(c => formatCell(row[c.key], { ...c, format: colOverrides[c.key]?.format || c.format }))
    );
    const fname = report?.name || 'Report';
    if (fmt === 'csv') {
      const escape = v => { const s = String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
      const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
      saveAs(new Blob([csv], { type: 'text/csv' }), `${fname}.csv`);
    } else {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      ws.addRow(headers);
      rows.forEach(r => ws.addRow(r));
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${fname}.xlsx`);
    }
  }, [results, report, colOverrides]);

  return (
    <div className="page-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-card-header" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-back" onClick={() => navigate('/reports')} title="Back to Reports">
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <BarChart2 size={18} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{report?.name || 'Loading…'}</div>
            {report?.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{report.description}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/create-report?id=${id}`)}>
              <Pencil size={13} /> Edit Report
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      {config && !running && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Database size={12} /> {config.tableKey}
          </span>
          {(config.linkedTables || []).length > 0 && (
            <span style={{ color: '#0ea5e9', background: '#e0f2fe', borderRadius: 10, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>
              +{config.linkedTables.length} linked
            </span>
          )}
          {(config.filters || []).length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Filter size={12} /> {config.filters.length} filter{config.filters.length !== 1 ? 's' : ''}
            </span>
          )}
          {report?.updated_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {new Date(report.updated_at).toLocaleDateString()}
            </span>
          )}
          {report?.created_by_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <User size={12} /> {report.created_by_name}
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {running && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
          <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Loading report…</span>
        </div>
      )}

      {/* Error */}
      {error && !running && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ borderRadius: 14, padding: 28, maxWidth: 500, textAlign: 'center' }}>
            <AlertCircle size={36} color="var(--text-error)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, color: 'var(--text-error)', marginBottom: 8, fontSize: 16 }}>Error</div>
            <div style={{ fontSize: 13, fontFamily: 'monospace', background: 'var(--bg-error)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, color: 'var(--text-error)' }}>{error}</div>
            <button className="btn btn-ghost" onClick={() => navigate('/reports')}>Back to Reports</button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && !running && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Results bar */}
          <div style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {results.total.toLocaleString()} row{results.total !== 1 ? 's' : ''}
            </span>
            {results.total > PAGE_SIZE && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, results.total)}
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-ghost" onClick={handleRefresh} style={{ fontSize: 12 }}><RefreshCw size={12} /> Refresh</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleExport('csv')} style={{ fontSize: 12 }}><Download size={12} /> CSV</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleExport('xlsx')} style={{ fontSize: 12 }}><Download size={12} /> XLSX</button>
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {results.data.length === 0 ? (
              <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-faint)' }}>
                <Info size={36} style={{ margin: '0 auto 14px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No records match the report filters</div>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    {(results.fields || []).map(col => {
                      const ov = colOverrides[col.key] || {};
                      const label = (ov.label !== undefined && ov.label !== '') ? ov.label : col.label;
                      const isNum = col.type === 'number' || (ov.format || col.format) === 'currency';
                      return <th key={col.key} style={{ textAlign: isNum ? 'right' : 'left' }}>{label}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((row, ri) => (
                    <tr key={ri}>
                      {(results.fields || []).map(col => {
                        const ov  = colOverrides[col.key] || {};
                        const fm  = { ...col, format: ov.format || col.format };
                        const raw = row[col.key];
                        const isNum = col.type === 'number' || fm.format === 'currency';
                        const isNeg = isNum && Number(raw) < 0;
                        return (
                          <td key={col.key} style={{ textAlign: isNum ? 'right' : 'left', color: isNeg ? 'var(--text-error)' : undefined, whiteSpace: 'nowrap' }}>
                            {formatCell(raw, fm)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {summaryRow && (
                    <tr>
                      {(results.fields || []).map((col, ci) => {
                        const has = summaryRow[col.key] !== undefined;
                        const ov  = colOverrides[col.key] || {};
                        const fm  = { ...col, format: ov.format || col.format };
                        const isNum = col.type === 'number' || fm.format === 'currency';
                        return (
                          <td key={col.key} style={{ fontWeight: 800, background: 'var(--bg-primary)', color: has ? '#60a5fa' : 'var(--text-secondary)', textAlign: isNum ? 'right' : 'left', whiteSpace: 'nowrap', borderTop: '2px solid var(--border-color)' }}>
                            {ci === 0 && !has ? 'TOTALS' : (has ? formatCell(summaryRow[col.key], fm) : '')}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setPage(1)} disabled={page === 1}>«</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-sm btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
