/**
 * @file Executive-level financial dashboard.
 * @module ExecutiveDashboard
 *
 * C-level summary with cost by vendor/location/charge type, monthly trends, top cost drivers, savings overview, and expiring contracts.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Building2, FileText, Network, TrendingUp, TrendingDown,
  AlertTriangle, Zap, Award, Clock, ArrowRight, Briefcase, MapPin,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { getExecutiveDashboard } from '../api';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = n => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

function KpiCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <div className={`kpi-card ${color}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-icon"><Icon size={40} /></div>
    </div>
  );
}

function SectionHeader({ icon: Icon, iconColor, title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon size={16} color={iconColor} />
      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary, #334155)' }}>{title}</span>
      <div style={{ flex: 1 }} />
      {children}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getExecutiveDashboard()
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
    <div style={{ background: 'var(--bg-error)', color: 'var(--text-error)', padding: '16px 20px', borderRadius: 12, fontWeight: 600 }}>
      Error loading executive dashboard: {error}
    </div>
  );

  const k = data.kpis;

  // Prepare stacked vendor trend if available
  const vendorTrendMap = {};
  const vendorNames = new Set();
  (data.vendorTrend || []).forEach(r => {
    if (!vendorTrendMap[r.month]) vendorTrendMap[r.month] = { month: r.month };
    vendorTrendMap[r.month][r.vendor_name || 'Unknown'] = r.total;
    vendorNames.add(r.vendor_name || 'Unknown');
  });
  const vendorTrendData = Object.values(vendorTrendMap).sort((a, b) => a.month.localeCompare(b.month));
  const vendorNameArr = [...vendorNames].slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ═══ Hero Banner ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        borderRadius: 14, padding: '28px 32px', position: 'relative', overflow: 'hidden',
        border: '1px solid #334155',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(59,130,246,0.06)' }} />
        <div style={{ position: 'absolute', right: 100, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(16,185,129,0.05)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
              Executive Overview
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>
              ${fmt(k.total_spend)}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Total telecom spend across all vendors</div>

            <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline Savings</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>${fmt(k.pipeline_savings)}</div>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Realized Savings</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#93c5fd' }}>${fmt(k.realized_savings)}</div>
              </div>
              {k.recovered_credits > 0 && (
                <div style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, padding: '8px 16px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dispute Credits</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#c4b5fd' }}>${fmt(k.recovered_credits)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - dispute inset */}
          {k.open_dispute_amount > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(239,68,68,0.15)', padding: '10px 18px', borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.3)', alignSelf: 'flex-end',
            }}>
              <AlertTriangle size={16} color="#fca5a5" />
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Open Disputes</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fca5a5' }}>${fmt(k.open_dispute_amount)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ KPI Grid ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14 }}>
        <KpiCard label="Active Vendors"   value={k.vendor_count}    icon={Building2}     color="blue"   sub="Vendor accounts" onClick={() => navigate('/vendors')} />
        <KpiCard label="Contracts"         value={k.contract_count}  icon={FileText}      color="teal"   sub="Active agreements" onClick={() => navigate('/contracts')} />
        <KpiCard label="Inventory"         value={k.inventory_count} icon={Network}       color="purple" sub="Active items" onClick={() => navigate('/inventory')} />
        <KpiCard label="Open Invoices"     value={k.open_invoices}   icon={Briefcase}     color="orange" sub="Pending review" onClick={() => navigate('/invoices')} />
        <KpiCard label="Disputed"          value={k.disputed_invoices} icon={AlertTriangle} color="red" sub={`$${fmt(k.open_dispute_amount)}`} onClick={() => navigate('/disputes')} />
      </div>

      {/* ═══ Charts Row 1: Spend Trend + Cost by Vendor ═══ */}
      <div className="dash-grid-2">
        {/* Monthly Trend Area Chart */}
        <div className="page-card" style={{ padding: '16px 20px' }}>
          <SectionHeader icon={TrendingUp} iconColor="#3b82f6" title="Spend Trend (Monthly)" />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
              <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#spendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Vendor Bar */}
        <div className="page-card" style={{ padding: '16px 20px' }}>
          <SectionHeader icon={Building2} iconColor="#2563eb" title="Cost by Vendor (Top 10)">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendors')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              View all <ArrowRight size={12} />
            </button>
          </SectionHeader>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.costByVendor.map(r => ({
              name: (r.vendor_name || 'Unknown').length > 14 ? (r.vendor_name || 'Unknown').slice(0, 14) + '…' : (r.vendor_name || 'Unknown'),
              Amount: r.total,
            }))} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
              <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
              <Bar dataKey="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ Charts Row 2: Charge Type Pie + Location Bar ═══ */}
      <div className="dash-grid-2">
        {/* Charge Type Pie */}
        {data.costByChargeType.length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <SectionHeader icon={DollarSign} iconColor="#f59e0b" title="Spend by Charge Type" />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.costByChargeType.map(r => ({ name: r.charge_type || 'Other', value: r.total }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value"
                >
                  {data.costByChargeType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost by Location Bar */}
        {data.costByLocation.length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <SectionHeader icon={MapPin} iconColor="#10b981" title="Cost by Location (Top 10)">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/locations')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                View all <ArrowRight size={12} />
              </button>
            </SectionHeader>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" data={data.costByLocation.map(r => ({
                name: (r.location || 'Unknown').length > 18 ? (r.location || 'Unknown').slice(0, 18) + '…' : (r.location || 'Unknown'),
                Amount: r.total,
              }))} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={120} />
                <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="Amount" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ═══ Vendor Trend (Stacked Area) ═══ */}
      {vendorTrendData.length > 0 && (
        <div className="page-card" style={{ padding: '16px 20px' }}>
          <SectionHeader icon={TrendingUp} iconColor="#8b5cf6" title="Spend Trend by Vendor" />
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={vendorTrendData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
              <Tooltip formatter={v => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {vendorNameArr.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name} stackId="1"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.35} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ═══ Tables Row: Top Cost Drivers + Expiring Contracts ═══ */}
      <div className="dash-grid-2">
        {/* Top Cost Drivers */}
        {data.topCostDrivers.length > 0 && (
          <div className="page-card">
            <div className="page-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#ef4444" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Top 5 Cost Drivers</span>
              </div>
            </div>
            <table className="data-table">
              <thead><tr>
                <th>Vendor</th><th>Charge Type</th><th>USOC</th><th style={{ textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>
                {data.topCostDrivers.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.vendor_name || '—'}</td>
                    <td><span className="badge badge-blue">{d.charge_type || '—'}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.usoc_code || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>${fmt(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Expiring Contracts */}
        {data.expiringContracts.length > 0 && (
          <div className="page-card">
            <div className="page-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Expiring Contracts (90 days)</span>
                <span className="badge badge-orange">{data.expiringContracts.length}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contracts')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <table className="data-table">
              <thead><tr>
                <th>Contract</th><th>Vendor</th><th>Expires</th><th style={{ textAlign: 'right' }}>Value</th>
              </tr></thead>
              <tbody>
                {data.expiringContracts.map(c => (
                  <tr key={c.contracts_id}>
                    <td>
                      <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/contracts/${c.contracts_id}`)}>
                        {c.contract_number || c.contract_name}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.vendor_name || '—'}</td>
                    <td style={{ color: '#f59e0b', fontWeight: 600 }}>{c.expiration_date?.split('T')[0]}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.contract_value ? `$${fmt(c.contract_value)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Top Savings Opportunities ═══ */}
      {data.topSavings.length > 0 && (
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#16a34a" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Top Savings Opportunities</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cost-savings')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Vendor</th><th>Category</th><th>Description</th><th style={{ textAlign: 'right' }}>Projected</th><th>Status</th>
            </tr></thead>
            <tbody>
              {data.topSavings.map(s => (
                <tr key={s.cost_savings_id}>
                  <td style={{ fontWeight: 600 }}>{s.vendor_name || '—'}</td>
                  <td><span className="badge badge-blue">{s.category}</span></td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>${fmt(s.projected_savings)}</td>
                  <td><span className={`badge ${s.status === 'Identified' ? 'badge-orange' : 'badge-blue'}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
