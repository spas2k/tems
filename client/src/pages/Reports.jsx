import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Plus, Play, Trash2, Clock, User, Database,
  Filter, Columns, RefreshCw, AlertCircle, FileText, Search,
} from 'lucide-react';
import { getSavedReports, deleteSavedReport } from '../api';
import { useConfirm } from '../context/ConfirmContext';

const TABLE_LABELS = {
  inventory:       'Inventory',
  invoices:       'Invoices',
  line_items:     'Line Items',
  contracts:      'Contracts',
  accounts:       'Accounts',
  orders:         'Orders',
  disputes:       'Disputes',
  cost_savings:   'Cost Savings',
  allocations:    'Allocations',
  usoc_codes:     'USOC Codes',
  contract_rates: 'Contract Rates',
  vendor_remit:   'Vendor Remittance',
  locations:      'Locations',
  tickets:        'Tickets',
};

const TABLE_COLORS = {
  inventory:       '#7c3aed',
  invoices:       '#dc2626',
  line_items:     '#d97706',
  contracts:      '#0d9488',
  accounts:       '#2563eb',
  orders:         '#ea580c',
  disputes:       '#be123c',
  cost_savings:   '#16a34a',
  allocations:    '#9333ea',
  usoc_codes:     '#06b6d4',
  contract_rates: '#14b8a6',
  vendor_remit:   '#8b5cf6',
  locations:      '#f59e0b',
  tickets:        '#ef4444',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Reports() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    getSavedReports()
      .then(r => setReports(r.data || []))
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id, name) => {
    if (!(await confirm(`Delete report "${name}"? This cannot be undone.`))) return;
    setDeleting(id);
    try {
      await deleteSavedReport(id);
      setReports(prev => prev.filter(r => r.saved_reports_id !== id));
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }, []);

  const filtered = reports.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      TABLE_LABELS[r.config?.tableKey]?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-card">
      {/* Header */}
      <div className="page-card-header">
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
          <BarChart2 size={18} /> Saved Reports
        </span>
        <button className="btn btn-primary" onClick={() => navigate('/create-report')}>
          <Plus size={15} /> New Report
        </button>
      </div>

      {/* Search + Refresh */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            placeholder="Search reports…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        </button>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={30} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div>Loading reports…</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
          <button className="btn btn-ghost" onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>
          <FileText size={52} strokeWidth={1} style={{ margin: '0 auto 18px', color: '#cbd5e1' }} />
          <div className="rc-empty-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No saved reports yet</div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
            Build your first report using the report creator.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/create-report')}>
            <Plus size={15} /> Create Report
          </button>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              No reports match "{search}"
            </div>
          )}

          {filtered.length > 0 && (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Data Source</th>
                  <th style={{ textAlign: 'center' }}>Columns</th>
                  <th style={{ textAlign: 'center' }}>Filters</th>
                  <th>Last Updated</th>
                  <th>Created By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cfg      = typeof r.config === 'string' ? JSON.parse(r.config) : (r.config || {});
                  const tableKey = cfg.tableKey || '';
                  const color    = TABLE_COLORS[tableKey] || '#64748b';
                  const colCount = (cfg.fields || []).length;
                  const filCount = (cfg.filters || []).length;
                  const linkCount = (cfg.linkedTables || []).length;
                  const isGrouped = (cfg.groupBy || []).length > 0;

                  return (
                    <tr key={r.saved_reports_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/create-report?id=${r.saved_reports_id}`)}>

                      <td>
                        <div className="rc-flyout-item-title" style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                        {r.description && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, maxWidth: 320,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.description}
                          </div>
                        )}
                      </td>

                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: `${color}18`, color, border: `1px solid ${color}40`,
                          borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                        }}>
                          <Database size={11} />
                          {TABLE_LABELS[tableKey] || tableKey || '—'}
                        </span>
                        {linkCount > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: '#0ea5e9', background: '#e0f2fe', borderRadius: 10, padding: '2px 7px', fontWeight: 600 }}>
                            +{linkCount} linked
                          </span>
                        )}
                        {isGrouped && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: '#7c3aed', background: '#ede9fe', borderRadius: 10, padding: '2px 7px', fontWeight: 600 }}>
                            Grouped
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="rc-results-count" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <Columns size={13} color="#94a3b8" />
                          {colCount}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: filCount > 0 ? '#2563eb' : '#94a3b8' }}>
                          <Filter size={13} />
                          {filCount}
                        </span>
                      </td>

                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b' }}>
                          <Clock size={12} />
                          {fmt(r.updated_at)}
                        </span>
                      </td>

                      <td>
                        {r.created_by_name ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b' }}>
                            <User size={12} />
                            {r.created_by_name}
                          </span>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}
                          onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/create-report?id=${r.saved_reports_id}`)}
                            title="Open in Report Builder"
                          >
                            <Play size={12} fill="currentColor" /> Open
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={deleting === r.saved_reports_id}
                            onClick={() => handleDelete(r.saved_reports_id, r.name)}
                            title="Delete report"
                          >
                            {deleting === r.saved_reports_id
                              ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                              : <Trash2 size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
