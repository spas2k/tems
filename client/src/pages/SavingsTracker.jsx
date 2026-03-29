/**
 * @file Savings tracking dashboard with KPIs and charts.
 * @module SavingsTracker
 *
 * Shows savings KPIs, area chart trends, pie chart by category, and bar chart by vendor.
 */
import React, { useEffect, useState } from 'react';
import {
  DollarSign, TrendingUp, Award, Target, CheckCircle2, AlertTriangle,
  ArrowRight, Zap, Percent, Clock, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { getSavingsTracker } from '../api';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = n => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-icon"><Icon size={40} /></div>
    </div>
  );
}

export default function SavingsTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSavingsTracker()
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (error) return (
    <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '16px 20px', borderRadius: 12, fontWeight: 600, border: '1px solid rgba(239,68,68,0.3)' }}>
      Error loading savings data: {error}
    </div>
  );

  const k = data.kpis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ═══ Hero ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #047857 100%)',
        borderRadius: 14, padding: '28px 32px', position: 'relative', overflow: 'hidden',
        border: '1px solid #059669',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(16,185,129,0.08)' }} />
        <div style={{ position: 'absolute', left: '30%', bottom: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(52,211,153,0.06)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
              Savings & Recovery Tracker
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>
              ${fmt(k.total_recovered)}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Total Recovered (Savings + Dispute Credits)</div>

            <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Realized Savings</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#a7f3d0' }}>${fmt(k.realized_savings)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dispute Credits</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#93c5fd' }}>${fmt(k.dispute_credits)}</div>
              </div>
            </div>
          </div>

          {/* Conversion rate ring on right side */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 110 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', position: 'relative',
              background: `conic-gradient(#4ade80 ${(k.conversion_rate || 0) * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 78, height: 78, borderRadius: '50%', background: '#065f46',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{Math.round(k.conversion_rate || 0)}%</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Conversion Rate</div>
          </div>
        </div>
      </div>

      {/* ═══ KPI Grid ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14 }}>
        <KpiCard label="Identified" value={k.identified_count} icon={Target} color="blue" sub="Pending review" />
        <KpiCard label="In Progress" value={k.in_progress_count} icon={Clock} color="orange" sub="Being implemented" />
        <KpiCard label="Resolved" value={k.resolved_count} icon={CheckCircle2} color="green" sub="Successfully closed" />
        <KpiCard label="Open Disputes" value={k.open_disputes} icon={AlertTriangle} color="red" sub="Pending resolution" />
      </div>

      {/* ═══ Charts Row 1: Monthly Trend + By Category ═══ */}
      <div className="dash-grid-2">
        {/* Monthly Trend */}
        {data.monthlyTrend?.length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#10b981" /> Monthly Recovery Trend
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="disputeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
                <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="savings" name="Savings" stroke="#10b981" strokeWidth={2} fill="url(#savingsGrad)" />
                <Area type="monotone" dataKey="credits" name="Credits" stroke="#3b82f6" strokeWidth={2} fill="url(#disputeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By Category */}
        {data.byCategory?.length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#f59e0b" /> Savings by Category
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.byCategory.map(r => ({ name: r.category || 'Other', value: Number(r.total) }))}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                >
                  {data.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ═══ By Vendor Bar ═══ */}
      {data.byVendor?.length > 0 && (
        <div className="page-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} color="#3b82f6" /> Recovery by Vendor (Top 10)
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.byVendor.map(r => ({
              name: (r.vendor_name || 'Unknown').length > 16 ? (r.vendor_name || 'Unknown').slice(0, 16) + '…' : (r.vendor_name || 'Unknown'),
              Savings: Number(r.savings || 0),
              Credits: Number(r.credits || 0),
            }))} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
              <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Savings" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Credits" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ═══ Recent Resolved Table ═══ */}
      {data.recentResolved?.length > 0 && (
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} color="#16a34a" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Recently Resolved</span>
              <span className="badge badge-green">{data.recentResolved.length}</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th><th>Vendor</th><th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th><th>Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentResolved.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span className={`badge ${r.type === 'savings' ? 'badge-green' : 'badge-blue'}`}>
                      {r.type === 'savings' ? 'Savings' : 'Credit'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{r.vendor_name || '—'}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {r.description || '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>${fmt(r.amount)}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{r.resolved_date?.split('T')[0] || '—'}</td>
                  <td><span className="badge badge-green">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
