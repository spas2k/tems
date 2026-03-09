import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Pencil, Trash2, Filter, X, Download, Copy, Check, Square, CheckSquare, Bookmark, Star } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Pagination from './Pagination';
import { useFavorites } from '../context/FavoritesContext';

// ── Filter operator definitions ───────────────────────────────────────────────

const TEXT_OPS = [
  { op: 'contains',     label: 'Contains'       },
  { op: 'not_contains', label: 'Not contains'    },
  { op: 'starts_with',  label: 'Starts with'     },
  { op: 'ends_with',    label: 'Ends with'       },
  { op: 'equals',       label: 'Equals'          },
  { op: 'not_equals',   label: 'Not equals'      },
  { op: 'in_set',       label: 'In set (one per line)'  },
  { op: 'not_in_set',   label: 'Not in set'             },
  { op: 'is_empty',     label: 'Is empty'        },
  { op: 'not_empty',    label: 'Not empty'       },
];
const SELECT_OPS = [
  { op: 'equals',     label: 'Is'          },
  { op: 'not_equals', label: 'Is not'      },
  { op: 'in_set',     label: 'In set'      },
  { op: 'not_in_set', label: 'Not in set'  },
  { op: 'is_empty',   label: 'Is empty'    },
  { op: 'not_empty',  label: 'Not empty'   },
];
const DATE_OPS = [
  { op: 'on',           label: 'On'            },
  { op: 'not_on',       label: 'Not on'        },
  { op: 'before',       label: 'Before'        },
  { op: 'after',        label: 'After'         },
  { op: 'between',      label: 'Between'       },
  { op: 'this_week',    label: 'This week'     },
  { op: 'this_month',   label: 'This month'    },
  { op: 'this_quarter', label: 'This quarter'  },
  { op: 'this_year',    label: 'This year'     },
  { op: 'is_empty',     label: 'Is empty'      },
  { op: 'not_empty',    label: 'Not empty'     },
];
const NUMBER_OPS = [
  { op: 'equals',     label: '= Equals'      },
  { op: 'not_equals', label: '≠ Not equals'  },
  { op: 'gt',         label: '> Greater than' },
  { op: 'gte',        label: '≥ At least'    },
  { op: 'lt',         label: '< Less than'   },
  { op: 'lte',        label: '≤ At most'     },
  { op: 'between',    label: 'Between'       },
  { op: 'is_empty',   label: 'Is empty'      },
  { op: 'not_empty',  label: 'Not empty'     },
];
const OPS_BY_TYPE = { text: TEXT_OPS, select: SELECT_OPS, date: DATE_OPS, number: NUMBER_OPS };
const NO_VALUE_OPS = new Set(['is_empty', 'not_empty', 'this_week', 'this_month', 'this_quarter', 'this_year']);

function FilterCell({ col, value: filterValue, onChange }) {
  const type = col.filterType || 'text';
  const ops  = OPS_BY_TYPE[type] || TEXT_OPS;
  const { op = ops[0].op, value = '' } = filterValue || {};
  const noValue   = NO_VALUE_OPS.has(op);
  const isBetween = op === 'between';
  const [p1, p2]  = value.split('|');

  const setOp  = newOp  => onChange({ op: newOp, value: NO_VALUE_OPS.has(newOp) ? '' : value });
  const setVal = newVal => onChange({ op, value: newVal });

  const isInSet = op === 'in_set' || op === 'not_in_set';

  // Convert internal comma-separated storage ↔ one-per-line display
  const toLines   = v => (v || '').split(',').map(s => s.trim()).filter(Boolean).join('\n');
  const fromLines = v => v.split('\n').map(s => s.trim()).filter(Boolean).join(',');

  // Local state for the textarea so a trailing newline (from pressing Enter)
  // isn't immediately stripped by fromLines → toLines round-trip.
  const [setLines, setSetLines] = useState(() => toLines(value));
  const prevSetRef = useRef({ value, op });
  useEffect(() => {
    const prev = prevSetRef.current;
    // Re-sync only when the filter value changes externally (e.g. clear, load saved)
    // or when the operator switches to/from in_set.
    if (value !== prev.value || op !== prev.op) {
      prevSetRef.current = { value, op };
      setSetLines(toLines(value));
    }
  }, [value, op]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Operator chooser */}
      <select className="col-filter col-filter-op" value={op} onChange={e => setOp(e.target.value)}>
        {ops.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
      </select>

      {/* Value input(s) */}
      {!noValue && !isBetween && (
        type === 'select' && !isInSet ? (
          <select className="col-filter" value={value} onChange={e => setVal(e.target.value)}>
            <option value="">All</option>
            {(col.filterOptions || []).map(opt => {
              const v = typeof opt === 'object' ? opt.value : opt;
              const l = typeof opt === 'object' ? opt.label : opt;
              return <option key={v} value={v}>{l}</option>;
            })}
          </select>
        ) : type === 'date' ? (
          <input className="col-filter" type="date" value={value} onChange={e => setVal(e.target.value)} />
        ) : type === 'number' ? (
          <input className="col-filter" type="number" placeholder="Value" value={value} onChange={e => setVal(e.target.value)} />
        ) : type === 'boolean' ? (
          <select className="col-filter" value={value} onChange={e => setVal(e.target.value)}>
            <option value="">—</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : isInSet ? (
          <textarea
            className="col-filter col-filter-set"
            placeholder={`one item\nper line`}
            value={setLines}
            onChange={e => {
              setSetLines(e.target.value);
              setVal(fromLines(e.target.value));
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}
          />
        ) : (
          <input
            className="col-filter"
            placeholder="Filter…"
            value={value}
            onChange={e => setVal(e.target.value)}
          />
        )
      )}

      {/* Between: two inputs */}
      {isBetween && type === 'date' && (
        <>
          <input className="col-filter" type="date" value={p1 || ''} placeholder="From"
            onChange={e => setVal(`${e.target.value}|${p2 || ''}`)} />
          <input className="col-filter" type="date" value={p2 || ''} placeholder="To"
            onChange={e => setVal(`${p1 || ''}|${e.target.value}`)} />
        </>
      )}
      {isBetween && type === 'number' && (
        <>
          <input className="col-filter" type="number" value={p1 || ''} placeholder="Min"
            onChange={e => setVal(`${e.target.value}|${p2 || ''}`)} />
          <input className="col-filter" type="number" value={p2 || ''} placeholder="Max"
            onChange={e => setVal(`${p1 || ''}|${e.target.value}`)} />
        </>
      )}
      {isBetween && type !== 'date' && type !== 'number' && (
        <>
          <input className="col-filter" value={p1 || ''} placeholder="From"
            onChange={e => setVal(`${e.target.value}|${p2 || ''}`)} />
          <input className="col-filter" value={p2 || ''} placeholder="To"
            onChange={e => setVal(`${p1 || ''}|${e.target.value}`)} />
        </>
      )}

      {/* No-value hint */}
      {noValue && (
        <div className="col-filter-hint">
          {op === 'is_empty' ? 'is blank' : op === 'not_empty' ? 'has a value' : 'current period'}
        </div>
      )}
    </div>
  );
}

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
  titleIcon,       // optional lucide icon element rendered before title
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
  const [showFavModal, setShowFavModal] = useState(false);
  const [favName, setFavName] = useState('');
  const toolbarRef = useRef(null);
  const favModalRef = useRef(null);
  const location = useLocation();
  const { addFavorite, isFavorited } = useFavorites();

  const activeFilters = filters && Object.entries(filters).some(([, f]) =>
    typeof f === 'object' ? (f.value !== '' || ['is_empty','not_empty','this_week','this_month','this_quarter','this_year'].includes(f.op)) : !!f
  );
  const alreadyFaved = isFavorited(location.pathname, filters);

  // Build a human-readable filter summary for the favorites item
  const buildFilterSummary = () => {
    if (!filters) return '';
    const parts = [];
    Object.entries(filters).forEach(([key, f]) => {
      const v = typeof f === 'object' ? f.value : f;
      const op = typeof f === 'object' ? f.op : 'contains';
      const col = columns.find(c => c.key === key);
      const label = col?.label || key;
      if (['is_empty','not_empty','this_week','this_month','this_quarter','this_year'].includes(op)) {
        parts.push(`${label}: ${op.replace('_', ' ')}`);
      } else if (v) {
        parts.push(`${label}: ${v}`);
      }
    });
    return parts.join(' · ');
  };

  const handleSaveFavorite = () => {
    addFavorite({
      name: favName.trim() || title || 'Favorite',
      path: location.pathname,
      filters,
      filterSummary: buildFilterSummary(),
    });
    setShowFavModal(false);
    setFavName('');
  };

  // Close fav modal on outside click
  useEffect(() => {
    if (!showFavModal) return;
    const handler = e => {
      if (favModalRef.current && !favModalRef.current.contains(e.target)) {
        setShowFavModal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFavModal]);

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
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>{titleIcon}{title}</span>
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
          {/* ── Favorite this view ── */}
          <div style={{ position: 'relative' }}>
            <button
              className={`btn btn-sm ${alreadyFaved ? 'btn-fav-active' : 'btn-outline'}`}
              title={alreadyFaved ? 'Already in favorites' : 'Save this view to favorites'}
              onClick={() => {
                if (alreadyFaved) return;
                setFavName(title || '');
                setShowFavModal(p => !p);
                setShowSavedFilters(false);
                setShowExport(false);
              }}
            >
              <Star size={13} fill={alreadyFaved ? 'currentColor' : 'none'} />
            </button>
            {showFavModal && (
              <div ref={favModalRef} className="fav-save-popover">
                <div className="fav-save-popover-title">Save to Favorites</div>
                <input
                  className="form-input"
                  style={{ fontSize: 12, padding: '5px 8px', marginBottom: 8 }}
                  placeholder="Name this view…"
                  autoFocus
                  value={favName}
                  onChange={e => setFavName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveFavorite();
                    if (e.key === 'Escape') setShowFavModal(false);
                  }}
                />
                {buildFilterSummary() && (
                  <div className="fav-save-popover-sub">{buildFilterSummary()}</div>
                )}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowFavModal(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveFavorite} disabled={!favName.trim() && !title}>
                    <Star size={12} /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
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
        <div style={{ overflowX: 'auto' }}>
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
                    {col.filterable !== false && (
                      <FilterCell
                        col={col}
                        value={filters[col.key]}
                        onChange={v => setFilter(col.key, v)}
                      />
                    )}
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
        </div>{/* end overflowX wrapper */}
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
