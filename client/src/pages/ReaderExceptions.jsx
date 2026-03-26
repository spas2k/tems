import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Eye, Filter, RefreshCw, X } from 'lucide-react';
import { getReaderExceptions, getReaderExceptionStats, resolveReaderException, updateReaderException } from '../api';

const TYPE_LABELS = {
  no_template_match: 'No Template Match',
  no_account: 'No Account',
  no_vendor: 'Unknown Vendor',
  no_inventory: 'Unknown Inventory',
  parse_error: 'Parse Error',
  unknown_format: 'Unknown Format',
};

const SEVERITY_BADGE = {
  blocking: { cls: 'badge-red',    icon: XCircle },
  warning:  { cls: 'badge-orange', icon: AlertTriangle },
};

const STATUS_BADGE = {
  open:     'badge-red',
  resolved: 'badge-green',
  ignored:  'badge-gray',
};

const STATUS_KPI = {
  open:     'red',
  resolved: 'green',
  ignored:  'slate',
};

export default function ReaderExceptions() {
  const [exceptions, setExceptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'open', type: '', severity: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [resolveNote, setResolveNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.type) params.type = filter.type;
      if (filter.severity) params.severity = filter.severity;
      const [ex, st] = await Promise.all([getReaderExceptions(params), getReaderExceptionStats()]);
      setExceptions(ex.data);
      setStats(st.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id, status) => {
    try {
      if (status === 'resolved') {
        await resolveReaderException(id, { resolution: { note: resolveNote || 'Resolved manually' }, status: 'resolved' });
      } else {
        await updateReaderException(id, { status });
      }
      setSelectedId(null);
      setResolveNote('');
      await load();
    } catch { /* ignore */ }
  };

  const selected = selectedId ? exceptions.find(e => e.invoice_reader_exceptions_id === selectedId) : null;

  const openCount = stats?.by_status?.find(s => s.status === 'open')?.count || 0;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Stats KPI Cards ── */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {stats.by_status?.map(s => (
            <div key={s.status}
              className={`kpi-card ${STATUS_KPI[s.status] || 'slate'}`}
              style={{ cursor: 'pointer', minWidth: 110, outline: filter.status === s.status ? '2px solid #2563eb' : 'none', outlineOffset: -2 }}
              onClick={() => setFilter(f => ({ ...f, status: f.status === s.status ? '' : s.status }))}>
              <div className="kpi-label">{s.status}</div>
              <div className="kpi-value">{s.count}</div>
            </div>
          ))}
          {stats.open_by_type?.length > 0 && stats.open_by_type.map(t => (
            <div key={t.type}
              className="kpi-card purple"
              style={{ cursor: 'pointer', minWidth: 120, outline: filter.type === t.type ? '2px solid #7c3aed' : 'none', outlineOffset: -2 }}
              onClick={() => setFilter(f => ({ ...f, type: f.type === t.type ? '' : t.type }))}>
              <div className="kpi-label">{TYPE_LABELS[t.type] || t.type}</div>
              <div className="kpi-value">{t.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Panel ── */}
      {selected && (
        <div className="form-page-section">
          <div className="form-page-section-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
              {TYPE_LABELS[selected.type] || selected.type}
              <span className={`badge ${SEVERITY_BADGE[selected.severity]?.cls || 'badge-gray'}`}>
                {selected.severity}
              </span>
            </span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedId(null)}>
              <X size={16} />
            </button>
          </div>
          <div className="form-page-section-body">
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: 13, margin: 0 }}>
              File: <strong>{selected.file_name || '—'}</strong>
              {selected.profile_name && <> · Profile: <strong>{selected.profile_name}</strong></>}
              {selected.upload_format && <> · Format: <span className="badge badge-blue" style={{ marginLeft: 4 }}>{selected.upload_format}</span></>}
            </p>

            <div>
              <label className="form-label">Context</label>
              <pre style={{ background: 'var(--bg-muted, #f1f5f9)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 200, margin: 0, border: '1px solid var(--border-color, #e2e8f0)' }}>
                {JSON.stringify(selected.context, null, 2)}
              </pre>
            </div>

            {selected.resolution && (
              <div>
                <label className="form-label">Resolution</label>
                <pre style={{ background: 'var(--bg-success)', padding: 12, borderRadius: 8, fontSize: 12, margin: 0, border: '1px solid var(--bg-success-border)' }}>
                  {JSON.stringify(selected.resolution, null, 2)}
                </pre>
              </div>
            )}

            {selected.status === 'open' && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 4 }}>
                <input className="form-input" style={{ flex: 1 }} placeholder="Resolution note (optional)…"
                  value={resolveNote} onChange={e => setResolveNote(e.target.value)} />
                <button className="btn btn-primary" onClick={() => handleResolve(selected.invoice_reader_exceptions_id, 'resolved')}>
                  <CheckCircle size={14} /> Resolve
                </button>
                <button className="btn btn-ghost" onClick={() => handleResolve(selected.invoice_reader_exceptions_id, 'ignored')}>
                  Ignore
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Card with Table ── */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={16} /> Reader Exceptions
            {openCount > 0 && (
              <span className="badge badge-red" style={{ marginLeft: 4 }}>{openCount} open</span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={load} style={{ color: '#bfdbfe' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Inline Filters ── */}
        <div style={{ display: 'flex', gap: 12, padding: '12px 20px', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
          <Filter size={14} style={{ color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }} />
          <select className="form-input" style={{ width: 140 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
          <select className="form-input" style={{ width: 180 }} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="form-input" style={{ width: 140 }} value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}>
            <option value="">All Severity</option>
            <option value="blocking">Blocking</option>
            <option value="warning">Warning</option>
          </select>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: 40 }}>Loading exceptions…</p>
        ) : exceptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted, #94a3b8)' }}>
            <CheckCircle size={48} style={{ marginBottom: 12, opacity: 0.25 }} />
            <p style={{ fontSize: 15, margin: 0 }}>No exceptions found.</p>
            <p style={{ fontSize: 13, margin: '6px 0 0' }}>All clear — nothing needs attention right now.</p>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>File</th>
                <th>Profile</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map(e => {
                const sevCfg = SEVERITY_BADGE[e.severity] || SEVERITY_BADGE.warning;
                const SevIcon = sevCfg.icon;
                return (
                  <tr key={e.invoice_reader_exceptions_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedId(e.invoice_reader_exceptions_id)}>
                    <td style={{ fontWeight: 600 }}>{TYPE_LABELS[e.type] || e.type}</td>
                    <td>
                      <span className={`badge ${sevCfg.cls}`}>
                        <SevIcon size={11} style={{ marginRight: 3 }} /> {e.severity}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.file_name || '—'}
                    </td>
                    <td>{e.profile_name || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[e.status] || 'badge-gray'}`}>{e.status}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</td>
                    <td onClick={ev => ev.stopPropagation()}>
                      <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setSelectedId(e.invoice_reader_exceptions_id)} title="View details">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
