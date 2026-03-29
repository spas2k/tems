/**
 * @file Period-over-period invoice variance analysis.
 * @module VarianceAnalysis
 *
 * Compares two billing periods showing variance by account, charge type, and USOC with drill-down detail and bar charts.
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, RefreshCw,
  Layers, ChevronDown, ChevronUp, BarChart3, ArrowRight, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from 'recharts';
import { getVarianceAnalysis, getVariancePeriods, getVarianceAccountDetail } from '../api';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = n => {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
};

function DeltaBadge({ value }) {
  const v = Number(value) || 0;
  if (v === 0) return <span style={{ color: '#64748b', fontSize: 12 }}>—</span>;
  const positive = v > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6,
      fontSize: 12, fontWeight: 700,
      background: positive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
      color: positive ? '#ef4444' : '#16a34a',
      border: `1px solid ${positive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
    }}>
      {positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      ${fmt(Math.abs(v))}
    </span>
  );
}

export default function VarianceAnalysis() {
  const [periods, setPeriods]       = useState([]);
  const [periodA, setPeriodA]       = useState('');
  const [periodB, setPeriodB]       = useState('');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [sortKey, setSortKey]       = useState('delta');
  const [sortDir, setSortDir]       = useState('desc');
  const [drillAccount, setDrillAccount] = useState(null);
  const [drillData, setDrillData]   = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  // Load periods
  useEffect(() => {
    getVariancePeriods().then(r => {
      const p = r.data.periods || [];
      setPeriods(p);
      if (p.length >= 2) { setPeriodA(p[1].month); setPeriodB(p[0].month); }
      else if (p.length === 1) { setPeriodA(p[0].month); setPeriodB(p[0].month); }
    }).catch(() => {});
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!periodA || !periodB) return;
    setLoading(true); setError(null); setDrillAccount(null); setDrillData(null);
    try {
      const r = await getVarianceAnalysis({ period_a: periodA, period_b: periodB });
      setData(r.data);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [periodA, periodB]);

  // Auto-run when periods change
  useEffect(() => { if (periodA && periodB) runAnalysis(); }, [periodA, periodB, runAnalysis]);

  const openDrill = async (accountId, accountName) => {
    setDrillAccount({ id: accountId, name: accountName });
    setDrillLoading(true);
    try {
      const r = await getVarianceAccountDetail(accountId, { period_a: periodA, period_b: periodB });
      setDrillData(r.data);
    } catch (e) { setDrillData({ error: e.message }); }
    finally { setDrillLoading(false); }
  };

  const sortedAccounts = useMemo(() => {
    if (!data?.accounts) return [];
    return [...data.accounts].sort((a, b) => {
      const av = sortKey === 'delta' ? Math.abs(Number(a.delta) || 0) : (a[sortKey] || '');
      const bv = sortKey === 'delta' ? Math.abs(Number(b.delta) || 0) : (b[sortKey] || '');
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = k => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };
  const SortIcon = ({ k }) => sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>) : null;

  const s = data?.summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ═══ Hero ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        borderRadius: 14, padding: '28px 32px', position: 'relative', overflow: 'hidden',
        border: '1px solid #334155',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(16,185,129,0.06)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
            Variance Analysis
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Month-over-Month Comparison
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            Compare invoice totals between two billing periods.
          </div>

          {/* Period selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Period A (Baseline)</label>
              <select value={periodA} onChange={e => setPeriodA(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 140 }}>
                {periods.map(p => <option key={p.month} value={p.month}>{p.month} ({p.count})</option>)}
              </select>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: 800, marginTop: 16 }}>→</div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Period B (Current)</label>
              <select value={periodB} onChange={e => setPeriodB(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#fff', fontSize: 13, fontWeight: 600, minWidth: 140 }}>
                {periods.map(p => <option key={p.month} value={p.month}>{p.month} ({p.count})</option>)}
              </select>
            </div>
            <button onClick={runAnalysis} disabled={loading}
              style={{
                marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer',
              }}>
              <RefreshCw size={14} /> Compare
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 10, fontWeight: 600, border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14 }}>
            <div className="kpi-card blue">
              <div className="kpi-label">Period A Total</div>
              <div className="kpi-value">${fmt(s.total_a)}</div>
              <div className="kpi-sub">{periodA}</div>
              <div className="kpi-icon"><BarChart3 size={40} /></div>
            </div>
            <div className="kpi-card teal">
              <div className="kpi-label">Period B Total</div>
              <div className="kpi-value">${fmt(s.total_b)}</div>
              <div className="kpi-sub">{periodB}</div>
              <div className="kpi-icon"><BarChart3 size={40} /></div>
            </div>
            <div className={`kpi-card ${Number(s.total_delta) > 0 ? 'red' : Number(s.total_delta) < 0 ? 'green' : 'blue'}`}>
              <div className="kpi-label">Net Change</div>
              <div className="kpi-value">{Number(s.total_delta) >= 0 ? '+' : ''}${fmt(s.total_delta)}</div>
              <div className="kpi-sub">{pct(s.pct_change)}</div>
              <div className="kpi-icon">{Number(s.total_delta) > 0 ? <TrendingUp size={40} /> : Number(s.total_delta) < 0 ? <TrendingDown size={40} /> : <Minus size={40} />}</div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-label">New Lines</div>
              <div className="kpi-value">{s.new_lines || 0}</div>
              <div className="kpi-icon"><ArrowUp size={40} /></div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-label">Removed Lines</div>
              <div className="kpi-value">{s.removed_lines || 0}</div>
              <div className="kpi-icon"><ArrowDown size={40} /></div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="dash-grid-2">
            {/* Charge Type Breakdown */}
            {data.chargeTypes?.length > 0 && (
              <div className="page-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} color="#3b82f6" /> Variance by Charge Type
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.chargeTypes.map(r => ({
                    name: r.charge_type || 'Other',
                    'Period A': r.total_a, 'Period B': r.total_b,
                  }))} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Period A" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Period B" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* USOC Movers */}
            {data.usocs?.length > 0 && (
              <div className="page-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="#8b5cf6" /> Top USOC Movers
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart layout="vertical" data={data.usocs.slice(0, 8).map(r => ({
                    name: r.usoc_code || '—', delta: Number(r.delta),
                  }))} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                    <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
                    <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                      {data.usocs.slice(0, 8).map((r, i) => (
                        <Cell key={i} fill={Number(r.delta) >= 0 ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Account Variance Table */}
          <div className="page-card">
            <div className="page-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} color="#3b82f6" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Account Variance</span>
                <span className="badge badge-blue">{sortedAccounts.length}</span>
              </div>
            </div>
            {sortedAccounts.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No account data for the selected periods.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort('account_number')} style={{ cursor: 'pointer' }}>Account <SortIcon k="account_number" /></th>
                      <th>Vendor</th>
                      <th style={{ textAlign: 'right' }}>Period A</th>
                      <th style={{ textAlign: 'right' }}>Period B</th>
                      <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('delta')}>Delta <SortIcon k="delta" /></th>
                      <th style={{ textAlign: 'right' }}>Change</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAccounts.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{a.account_number || `#${a.accounts_id}`}</td>
                        <td style={{ fontSize: 12 }}>{a.vendor_name || '—'}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(a.total_a)}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(a.total_b)}</td>
                        <td style={{ textAlign: 'right' }}><DeltaBadge value={a.delta} /></td>
                        <td style={{ textAlign: 'right', fontSize: 12, color: Number(a.pct_change) > 0 ? '#ef4444' : '#16a34a' }}>
                          {pct(a.pct_change)}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openDrill(a.accounts_id, a.account_number)}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                            Detail <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ═══ Drill-Down Modal ═══ */}
          {drillAccount && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}
              onClick={() => setDrillAccount(null)}
            >
              <div style={{
                background: 'var(--bg-primary, #fff)', borderRadius: 14, padding: '24px 28px',
                width: '90%', maxWidth: 900, maxHeight: '80vh', overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
              }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Account Detail: {drillAccount.name || drillAccount.id}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{periodA} → {periodB}</div>
                  </div>
                  <button onClick={() => setDrillAccount(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <X size={20} color="#64748b" />
                  </button>
                </div>

                {drillLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div>
                ) : drillData?.error ? (
                  <div style={{ color: '#ef4444' }}>{drillData.error}</div>
                ) : drillData?.lineItems?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>USOC</th><th>Charge Type</th><th>Description</th>
                          <th style={{ textAlign: 'right' }}>Period A</th>
                          <th style={{ textAlign: 'right' }}>Period B</th>
                          <th style={{ textAlign: 'right' }}>Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drillData.lineItems.map((li, j) => (
                          <tr key={j}>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{li.usoc_code || '—'}</td>
                            <td><span className="badge badge-blue">{li.charge_type || '—'}</span></td>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{li.description || '—'}</td>
                            <td style={{ textAlign: 'right' }}>{li.amount_a != null ? `$${fmt(li.amount_a)}` : '—'}</td>
                            <td style={{ textAlign: 'right' }}>{li.amount_b != null ? `$${fmt(li.amount_b)}` : '—'}</td>
                            <td style={{ textAlign: 'right' }}><DeltaBadge value={li.delta} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No line-item data for this account.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
