/**
 * @file Automated invoice rate auditor with dispute creation.
 * @module InvoiceAuditor
 *
 * Runs an audit scan to detect rate mismatches, duplicate charges, and zero amounts. Allows auto-creation of dispute records from findings.
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck, AlertTriangle, AlertCircle, Info, Search, CheckCircle2,
  Loader2, ArrowRight, DollarSign, Filter, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getAuditScan, createAuditDisputes } from '../api';

const SEV_META = {
  high:   { icon: AlertCircle,   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  badge: 'badge-red' },
  medium: { icon: AlertTriangle,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', badge: 'badge-orange' },
  low:    { icon: Info,           color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', badge: 'badge-blue' },
};
const CHART_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceAuditor() {
  const [findings, setFindings] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [scanned, setScanned]   = useState(false);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [created, setCreated]   = useState(0);
  const [sortKey, setSortKey]   = useState('delta');
  const [sortDir, setSortDir]   = useState('desc');
  const [sevFilter, setSevFilter] = useState('all');

  const runScan = async () => {
    setLoading(true); setError(null); setFindings([]); setSelected(new Set()); setCreated(0);
    try {
      const r = await getAuditScan();
      setFindings(r.data.findings || []);
      setSummary(r.data.summary || null);
      setScanned(true);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let list = sevFilter === 'all' ? findings : findings.filter(f => f.severity === sevFilter);
    list = [...list].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'delta') { av = Math.abs(Number(av) || 0); bv = Math.abs(Number(bv) || 0); }
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [findings, sevFilter, sortKey, sortDir]);

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const SortIcon = ({ k }) => sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>) : null;

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((_, i) => i)));
  };
  const toggleOne = i => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const handleCreateDisputes = async () => {
    const items = filtered.filter((_, i) => selected.has(i));
    if (!items.length) return;
    setCreating(true);
    try {
      const r = await createAuditDisputes(items);
      setCreated(r.data.created || items.length);
      setSelected(new Set());
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setCreating(false); }
  };

  // Summaries for charts
  const sevCounts = useMemo(() => {
    const m = { high: 0, medium: 0, low: 0 };
    findings.forEach(f => { m[f.severity] = (m[f.severity] || 0) + 1; });
    return Object.entries(m).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [findings]);

  const ruleCounts = useMemo(() => {
    const m = {};
    findings.forEach(f => { m[f.rule] = (m[f.rule] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [findings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ═══ Hero ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        borderRadius: 14, padding: '28px 32px', position: 'relative', overflow: 'hidden',
        border: '1px solid #334155',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(239,68,68,0.06)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
            Invoice Auditor
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Rule-Based Mismatch Detection
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4, maxWidth: 560 }}>
            Scan all line items against contract rates, inventory records, and billing rules. Automatically flag mismatches and create disputes.
          </div>
          <button
            onClick={runScan}
            disabled={loading}
            style={{
              marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14,
              background: loading ? '#334155' : '#3b82f6', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? <><Loader2 size={16} className="spin" /> Scanning…</> : <><Search size={16} /> Run Full Scan</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 10, fontWeight: 600, border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* ═══ Results ═══ */}
      {scanned && !loading && (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14 }}>
            <div className="kpi-card blue">
              <div className="kpi-label">Total Scanned</div>
              <div className="kpi-value">{summary?.total_scanned || 0}</div>
              <div className="kpi-icon"><ShieldCheck size={40} /></div>
            </div>
            <div className="kpi-card red">
              <div className="kpi-label">High Severity</div>
              <div className="kpi-value">{summary?.high_count || 0}</div>
              <div className="kpi-icon"><AlertCircle size={40} /></div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-label">Medium Severity</div>
              <div className="kpi-value">{summary?.medium_count || 0}</div>
              <div className="kpi-icon"><AlertTriangle size={40} /></div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-label">Low Severity</div>
              <div className="kpi-value">{summary?.low_count || 0}</div>
              <div className="kpi-icon"><Info size={40} /></div>
            </div>
            <div className="kpi-card teal">
              <div className="kpi-label">Total Delta</div>
              <div className="kpi-value">${fmt(summary?.total_delta)}</div>
              <div className="kpi-icon"><DollarSign size={40} /></div>
            </div>
          </div>

          {/* Charts */}
          {findings.length > 0 && (
            <div className="dash-grid-2">
              <div className="page-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="#f59e0b" /> Findings by Severity
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sevCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {sevCounts.map((entry, i) => (
                        <Cell key={i} fill={SEV_META[entry.name]?.color || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend formatter={v => <span style={{ textTransform: 'capitalize' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="page-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Filter size={16} color="#3b82f6" /> Findings by Rule
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ruleCounts} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Findings table */}
          <div className="page-card">
            <div className="page-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} color="#3b82f6" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Findings</span>
                <span className="badge badge-blue">{filtered.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Severity filter */}
                <select
                  value={sevFilter}
                  onChange={e => setSevFilter(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 12, background: 'var(--bg-primary,#fff)' }}
                >
                  <option value="all">All Severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {selected.size > 0 && (
                  <button
                    onClick={handleCreateDisputes}
                    disabled={creating}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {creating ? <Loader2 size={14} className="spin" /> : <AlertTriangle size={14} />}
                    Create {selected.size} Dispute{selected.size > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>

            {created > 0 && (
              <div style={{
                padding: '10px 16px', background: 'rgba(16,185,129,0.1)', color: '#059669',
                fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid rgba(16,185,129,0.2)',
              }}>
                <CheckCircle2 size={16} /> {created} dispute{created > 1 ? 's' : ''} created successfully.
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <CheckCircle2 size={40} color="#16a34a" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: 16, color: '#16a34a' }}>All Clear</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>No mismatches found. Invoices look clean!</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      </th>
                      <th onClick={() => toggleSort('severity')} style={{ cursor: 'pointer' }}>Severity <SortIcon k="severity" /></th>
                      <th onClick={() => toggleSort('rule')} style={{ cursor: 'pointer' }}>Rule <SortIcon k="rule" /></th>
                      <th>Invoice</th>
                      <th>Line Item</th>
                      <th>Vendor</th>
                      <th style={{ textAlign: 'right' }}>Billed</th>
                      <th style={{ textAlign: 'right' }}>Expected</th>
                      <th style={{ textAlign: 'right' }} onClick={() => toggleSort('delta')} className="cursor-pointer">
                        Delta <SortIcon k="delta" />
                      </th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f, i) => {
                      const sev = SEV_META[f.severity] || SEV_META.low;
                      const SevIcon = sev.icon;
                      return (
                        <tr key={i} style={{ background: selected.has(i) ? 'rgba(59,130,246,0.04)' : undefined }}>
                          <td><input type="checkbox" checked={selected.has(i)} onChange={() => toggleOne(i)} /></td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                              borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                              background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                            }}>
                              <SevIcon size={12} /> {f.severity}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{f.rule}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#3b82f6' }}>
                            {f.invoice_number || `#${f.invoices_id}`}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {f.line_items_id ? `LI-${f.line_items_id}` : (f.line_item_ids || []).map(id => `LI-${id}`).join(', ')}
                          </td>
                          <td style={{ fontSize: 12 }}>{f.vendor_name || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{f.billed != null ? `$${fmt(f.billed)}` : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{f.expected != null ? `$${fmt(f.expected)}` : '—'}</td>
                          <td style={{
                            textAlign: 'right', fontWeight: 700,
                            color: Number(f.delta) > 0 ? '#ef4444' : Number(f.delta) < 0 ? '#16a34a' : '#64748b',
                          }}>
                            {f.delta != null ? `$${fmt(Math.abs(f.delta))}` : '—'}
                          </td>
                          <td style={{ fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>
                            {f.detail || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Spin keyframes */}
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
