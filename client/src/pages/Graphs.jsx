/**
 * @file Saved graph gallery with open/delete actions.
 * @module Graphs
 *
 * Lists saved graph configurations with preview, open, and delete capabilities. Links to CreateGraph for new graphs.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart as LineChartIcon, Plus, Play, Trash2, Clock, User, Database,
  Filter, RefreshCw, AlertCircle, Search, BarChart2, PieChart, Activity, Pencil,
} from 'lucide-react';
import { getSavedGraphs, deleteSavedGraph } from '../api';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';

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

const CHART_LABELS = {
  bar: 'Bar', line: 'Line', area: 'Area', pie: 'Pie', donut: 'Donut',
  scatter: 'Scatter', radar: 'Radar', composed: 'Composed',
  stackedBar: 'Stacked Bar', horizontalBar: 'Horizontal Bar', treemap: 'Treemap',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Graphs() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('reports', 'create');
  const canDelete = hasPermission('reports', 'delete');
  const [graphs, setGraphs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    getSavedGraphs()
      .then(r => setGraphs(r.data || []))
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to load graphs'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id, name) => {
    if (!(await confirm(`Delete graph "${name}"? This cannot be undone.`))) return;
    setDeleting(id);
    try {
      await deleteSavedGraph(id);
      setGraphs(prev => prev.filter(g => g.saved_graphs_id !== id));
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }, []);

  const filtered = graphs.filter(g => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.name?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      TABLE_LABELS[(typeof g.config === 'string' ? JSON.parse(g.config) : g.config)?.tableKey]?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-card">
      {/* Header */}
      <div className="page-card-header">
        <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
          <LineChartIcon size={18} /> Saved Graphs
        </span>
        {canCreate && <button className="btn btn-primary" onClick={() => navigate('/create-graph')}>
          <Plus size={15} /> New Graph
        </button>}
      </div>

      {/* Search + Refresh */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            placeholder="Search graphs…"
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
          <div>Loading graphs…</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
          <button className="btn btn-ghost" onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && graphs.length === 0 && (
        <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>
          <LineChartIcon size={52} strokeWidth={1} style={{ margin: '0 auto 18px', color: '#cbd5e1' }} />
          <div className="rc-empty-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No saved graphs yet</div>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
            Build your first graph using the graph creator.
          </p>
          {canCreate && <button className="btn btn-primary" onClick={() => navigate('/create-graph')}>
            <Plus size={15} /> Create Graph
          </button>}
        </div>
      )}

      {!loading && !error && graphs.length > 0 && (
        <>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              No graphs match "{search}"
            </div>
          )}

          {filtered.length > 0 && (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Graph Name</th>
                  <th>Data Source</th>
                  <th style={{ textAlign: 'center' }}>Chart Type</th>
                  <th style={{ textAlign: 'center' }}>Filters</th>
                  <th>Last Updated</th>
                  <th>Created By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const cfg      = typeof g.config === 'string' ? JSON.parse(g.config) : (g.config || {});
                  const tableKey = cfg.tableKey || '';
                  const color    = TABLE_COLORS[tableKey] || '#64748b';
                  const chartType = CHART_LABELS[cfg.chartType] || cfg.chartType || '—';
                  const filCount = (cfg.filters || []).length;
                  const linkCount = (cfg.linkedTables || []).length;

                  return (
                    <tr key={g.saved_graphs_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/graphs/${g.saved_graphs_id}`)}>

                      <td>
                        <div className="rc-flyout-item-title" style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                        {g.description && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, maxWidth: 320,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.description}
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
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <Activity size={13} color="#94a3b8" />
                          {chartType}
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
                          {fmt(g.updated_at)}
                        </span>
                      </td>

                      <td>
                        {g.created_by_name ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b' }}>
                            <User size={12} />
                            {g.created_by_name}
                          </span>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}
                          onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/graphs/${g.saved_graphs_id}`)}
                            title="View Graph"
                          >
                            <Play size={12} fill="currentColor" /> View
                          </button>
                          {canCreate && <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => navigate(`/create-graph?id=${g.saved_graphs_id}`)}
                            title="Edit Graph"
                          >
                            <Pencil size={12} /> Edit
                          </button>}
                          {canDelete && <button
                            className="btn btn-sm btn-danger"
                            disabled={deleting === g.saved_graphs_id}
                            onClick={() => handleDelete(g.saved_graphs_id, g.name)}
                            title="Delete graph"
                          >
                            {deleting === g.saved_graphs_id
                              ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                              : <Trash2 size={12} />}
                          </button>}
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
