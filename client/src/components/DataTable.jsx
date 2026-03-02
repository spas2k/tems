import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pencil, Trash2, Filter, X, Download, Copy, Check, Square, CheckSquare, Bookmark } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Pagination from './Pagination';

/**
 * Shared data-table with column filters, sort, pagination, and actions.
 *
 * Column config shape:
 *   key          – data field name
 *   label        – column header text
 *   sortable     – boolean (default true)
 *   filterable   – boolean (default true)
 *   filterType   – 'text' | 'select' | 'date'  (default 'text')
 *   filterOptions – string[] or {value,label}[] for select filters
 *   render       – (value, row) => JSX  (full custom cell)
 *   link         – (row) => void  (renders value as clickable link)
 *   badge        – { statusValue: 'badge badge-color' }
 *   format       – 'currency' | 'date'
 *   style        – extra td style
 *   headerStyle  – extra th style
 *   copyable     – boolean, shows copy-to-clipboard button
 *   summary      – 'sum' | 'count' | 'avg' | function(allValues) => display
 */
export default function DataTable({
  columns,
  idKey,
  data,
  totalItems,
  loading,
  // sort
  sort, toggleSort, arrow,
  // filters
  showFilters, setShowFilters,
  filters, setFilter, clearFilters, hasActiveFilters,
  // pagination
  page, pageSize, onPageChange, onPageSizeChange,
  // raw count for filter display
  rawTotal,
  // actions
  onEdit, onDelete,
  extraActions,
  // customisation
  title,
  headerRight,     // JSX for extra buttons in page-card-header
  emptyMessage,
  rowStyle,
  // export
  exportFilename,    // string — enables export button
  allData,           // full filtered data (not paginated) for export
  // bulk actions
  bulkActions,       // [{ label, icon, onClick(selectedRows), danger? }]
  // saved filters
  savedFilters,      // [{ name, filters }]
  onSaveFilter,      // (name, filtersObj) => void
  onDeleteFilter,    // (name) => void
  onLoadFilter,      // (filtersObj) => void
}) {
  const hasActions = onEdit || onDelete || extraActions?.length;
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [filterName, setFilterName] = useState('');
  const toolbarRef = useRef(null);

  /* ── close dropdowns on outside click ───────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowSavedFilters(false);
        setShowExport(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const hasBulk = bulkActions?.length > 0;
  const hasSummary = columns.some(c => c.summary);

  /* ── copy to clipboard ───────────────────────────────── */
  const handleCopy = useCallback((value, rowId, colKey) => {
    navigator.clipboard.writeText(String(value));
    setCopiedKey(`${rowId}-${colKey}`);
    setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  /* ── export ──────────────────────────────────────────── */
  const handleExport = useCallback((format) => {
    const exportData = allData || data;
    const rows = exportData.map(row =>
      Object.fromEntries(columns.map(col => [col.label, row[col.key] ?? '']))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const fname = exportFilename || title || 'export';
    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `${fname}.csv`);
    } else {
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${fname}.xlsx`);
    }
  }, [allData, data, columns, exportFilename, title]);

  /* ── bulk selection ──────────────────────────────────── */
  const toggleRow = useCallback((id) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    if (selectedRows.size === data.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(data.map(r => r[idKey])));
  }, [data, idKey, selectedRows.size]);
  const getSelectedData = useCallback(() => {
    return data.filter(r => selectedRows.has(r[idKey]));
  }, [data, idKey, selectedRows]);

  /* ── summary row ─────────────────────────────────────── */
  const computeSummary = useCallback((col) => {
    const sourceData = allData || data;
    if (!col.summary) return null;
    const values = sourceData.map(r => r[col.key]).filter(v => v != null);
    if (typeof col.summary === 'function') return col.summary(values);
    if (col.summary === 'sum') {
      const sum = values.reduce((s, v) => s + Number(v || 0), 0);
      if (col.format === 'currency') return `$${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      return sum.toLocaleString();
    }
    if (col.summary === 'count') return values.length.toLocaleString();
    if (col.summary === 'avg') {
      const avg = values.reduce((s, v) => s + Number(v || 0), 0) / (values.length || 1);
      if (col.format === 'currency') return `$${avg.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      return avg.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    return null;
  }, [allData, data]);

  /* ── cell renderer ─────────────────────────────────── */
  const renderCell = (col, row) => {
    const val = row[col.key];
    const content = (() => {
      if (col.render)  return col.render(val, row);
      if (col.link)    return <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => col.link(row)}>{val}</span>;
      if (col.badge)   return <span className={col.badge[val] || 'badge badge-gray'}>{val}</span>;
      if (col.format === 'currency')
        return val != null
          ? `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          : '—';
      if (col.format === 'date')
        return val ? val.split('T')[0] : '—';
      return val ?? '—';
    })();
    if (col.copyable && val) {
      const uid = `${row[idKey]}-${col.key}`;
      const copied = copiedKey === uid;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {content}
          <button
            className="btn-copy-inline"
            onClick={e => { e.stopPropagation(); handleCopy(val, row[idKey], col.key); }}
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
          </button>
        </span>
      );
    }
    return content;
  };

  return (
    <div className="page-card">
      {/* ── header bar ──────────────────────────────────── */}
      <div className="page-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{title}</span>
          {hasActiveFilters && rawTotal != null && (
            <span className="filter-count">
              Showing {totalItems} of {rawTotal}
            </span>
          )}
          <span className="filter-count" style={{ marginLeft: 4 }}>
            {(allData || data).length} record{(allData || data).length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} ref={toolbarRef}>
          {hasActiveFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { clearFilters(); setShowSavedFilters(false); setShowExport(false); }}>
              <X size={13} /> Clear
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => { setShowFilters(f => !f); setShowSavedFilters(false); setShowExport(false); }}>
            <Filter size={13} /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {/* Saved filters dropdown */}
          {onSaveFilter && (
            <div style={{ position: 'relative' }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowSavedFilters(p => !p); setShowExport(false); }} title="Saved filters">
                <Bookmark size={13} /> Saved Filters
              </button>
              {showSavedFilters && (
                <div className="saved-filters-dropdown">
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}
                        placeholder="Filter name…" value={filterName} onChange={e => setFilterName(e.target.value)} />
                      <button className="btn btn-primary btn-sm" disabled={!filterName.trim() || !hasActiveFilters}
                        onClick={() => { onSaveFilter(filterName.trim(), filters); setFilterName(''); }}>
                        Save
                      </button>
                    </div>
                  </div>
                  {(savedFilters || []).length === 0 ? (
                    <div style={{ padding: '12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>No saved filters</div>
                  ) : (savedFilters || []).map(sf => (
                    <div key={sf.name} className="saved-filter-item">
                      <span className="filter-item-name" style={{ flex: 1, cursor: 'pointer' }} onClick={() => { onLoadFilter(sf.filters); setShowSavedFilters(false); }}>{sf.name}</span>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDeleteFilter(sf.name)}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {exportFilename !== undefined && (
            <div className="export-dropdown-wrap" style={{ position: 'relative' }}>
              <button className="btn btn-outline btn-sm" title="Export data"
                onClick={() => { setShowExport(p => !p); setShowSavedFilters(false); }}>
                <Download size={13} /> Export
              </button>
              {showExport && (
                <div className="export-dropdown">
                  <button onClick={() => { handleExport('csv'); setShowExport(false); }}>CSV</button>
                  <button onClick={() => { handleExport('xlsx'); setShowExport(false); }}>Excel (.xlsx)</button>
                </div>
              )}
            </div>
          )}
          {headerRight}
        </div>
      </div>

      {/* ── bulk actions bar ────────────────────────────── */}
      {hasBulk && selectedRows.size > 0 && (
        <div className="bulk-actions-bar">
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedRows.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {bulkActions.map((action, i) => (
              <button key={i} className={`btn btn-sm ${action.danger ? 'btn-danger' : 'btn-outline'}`}
                onClick={() => action.onClick(getSelectedData())}>
                {action.icon && <action.icon size={14} />} {action.label}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRows(new Set())}>
              <X size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* ── body ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
      ) : (<>
        <table className="data-table">
          <thead>
            <tr>
              {hasBulk && (
                <th style={{ width: 36, textAlign: 'center', cursor: 'pointer' }} onClick={toggleAll}>
                  {selectedRows.size === data.length && data.length > 0
                    ? <CheckSquare size={15} color="#3b82f6" />
                    : <Square size={15} color="#94a3b8" />}
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable !== false ? 'sortable' : ''}
                  onClick={col.sortable !== false ? () => toggleSort(col.key) : undefined}
                  style={col.headerStyle}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <span className="sort-arrow">{arrow(col.key)}</span>
                  )}
                </th>
              ))}
              {hasActions && <th>Actions</th>}
            </tr>
            {showFilters && (
              <tr className="filter-row">
                {hasBulk && <th />}
                {columns.map(col => (
                  <th key={col.key}>
                    {col.filterable === false ? null
                      : col.filterType === 'select' ? (
                        <select
                          className="col-filter"
                          value={filters[col.key] || ''}
                          onChange={e => setFilter(col.key, e.target.value)}
                        >
                          <option value="">All</option>
                          {(col.filterOptions || []).map(opt => {
                            const v = typeof opt === 'object' ? opt.value : opt;
                            const l = typeof opt === 'object' ? opt.label : opt;
                            return <option key={v} value={v}>{l}</option>;
                          })}
                        </select>
                      )
                      : col.filterType === 'date' ? (
                        <input
                          className="col-filter"
                          type="date"
                          value={filters[col.key] || ''}
                          onChange={e => setFilter(col.key, e.target.value)}
                        />
                      )
                      : (
                        <input
                          className="col-filter"
                          placeholder="Filter…"
                          value={filters[col.key] || ''}
                          onChange={e => setFilter(col.key, e.target.value)}
                        />
                      )
                    }
                  </th>
                ))}
                {hasActions && (
                  <th>
                    <button className="btn-filter-reset" onClick={clearFilters} title="Reset all filters">
                      <X size={14} /> Reset
                    </button>
                  </th>
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0) + (hasBulk ? 1 : 0)}
                  style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}
                >
                  {emptyMessage || 'No records found.'}
                </td>
              </tr>
            ) : data.map((row, idx) => (
              <tr key={idKey ? row[idKey] : idx} style={rowStyle ? rowStyle(row) : undefined}>
                {hasBulk && (
                  <td style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleRow(row[idKey])}>
                    {selectedRows.has(row[idKey])
                      ? <CheckSquare size={15} color="#3b82f6" />
                      : <Square size={15} color="#cbd5e1" />}
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} style={col.style}>
                    {renderCell(col, row)}
                  </td>
                ))}
                {hasActions && (
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {extraActions?.map((action, i) => (
                        <button
                          key={i}
                          className={`btn ${action.danger ? 'btn-danger' : 'btn-ghost'} btn-sm btn-icon`}
                          onClick={() => action.onClick(row)}
                          title={action.title}
                        >
                          <action.icon size={13} />
                        </button>
                      ))}
                      {onEdit && (
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(row)} title="Edit">
                          <Pencil size={13} />
                        </button>
                      )}
                      {onDelete && (
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(row)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {hasSummary && data.length > 0 && (
            <tfoot>
              <tr className="summary-row">
                {hasBulk && <td />}
                {columns.map(col => (
                  <td key={col.key} style={{ fontWeight: 700, fontSize: 13 }}>
                    {col.summary
                      ? computeSummary(col)
                      : col === columns[0] ? <span style={{ color: '#64748b', fontStyle: 'italic' }}>Totals</span> : ''}
                  </td>
                ))}
                {hasActions && <td />}
              </tr>
            </tfoot>
          )}
        </table>
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </>)}
    </div>
  );
}
