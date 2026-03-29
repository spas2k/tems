/**
 * @file Main operational dashboard with KPI cards and charts.
 * @module Dashboard
 *
 * Fetches dashboard data and renders KPI cards (total spend, invoices, disputes, savings), monthly trend area chart, top vendors bar chart, spend-by-type pie chart, expiring contracts, and recent activity tables.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getSystemSetting } from '../api';
import { useAuth } from '../context/AuthContext';
import CustomDashboard from '../components/CustomDashboard';
import {
  Building2, FileText, Network, ShoppingCart, DollarSign,
  AlertTriangle, Zap, TrendingUp, ArrowRight, Receipt,
  ShieldAlert, CheckCircle2, Clock, RefreshCw, MapPin,
  LifeBuoy, Landmark, Upload, Award, Settings,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const STATUS_BADGE = {
  Paid:       'badge badge-green',
  Open:       'badge badge-blue',
  Disputed:   'badge badge-orange',
  Void:       'badge badge-gray',
  Identified: 'badge badge-purple',
  Resolved:   'badge badge-green',
  'In Progress': 'badge badge-blue',
  Critical:   'badge badge-red',
  High:       'badge badge-orange',
  Medium:     'badge badge-blue',
  Low:        'badge badge-gray',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

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

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = n => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [defaultLayout, setDefaultLayout] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const customLayout = user?.preferences?.dashboardLayout;

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    // If the user has no custom layout, fetch the system default
    if (!customLayout?.widgets?.length) {
      getSystemSetting('defaultDashboardLayout')
        .then(r => { if (r.data?.value) setDefaultLayout(r.data.value); })
        .catch(() => {});
    }
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ background: 'var(--bg-error)', color: 'var(--text-error)', padding: '16px 20px', borderRadius: 12, fontWeight: 600 }}>
      Error loading dashboard: {error}
    </div>
  );

  const variance = Number(data.totalVariance);
  const savingsProjected = Number(data.totalSavingsIdentified);
  const savingsRealized  = Number(data.totalSavingsRealized) || 0;
  const billed   = Number(data.totalBilled);
  const totalMrc = Number(data.totalMrc) || 0;
  const totalNrc = Number(data.totalNrc) || 0;
  const audit    = data.auditCounts || { validated: 0, variance: 0, pending: 0, disputed: 0 };
  const auditTotal = audit.validated + audit.variance + audit.pending + (audit.disputed || 0);
  const openDisputes = Number(data.openDisputes) || 0;
  const disputeAmount = Number(data.disputeAmount) || 0;
  const creditRecovered = Number(data.creditRecovered) || 0;

  /* ═══ Custom Dashboard Layout Mode ═══ */
  const activeLayout = customLayout?.widgets?.length > 0 ? customLayout : defaultLayout;
  if (activeLayout?.widgets?.length > 0) {
    return <CustomDashboard data={data} layout={activeLayout} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Customize button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/dashboard-builder')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <Settings size={14} /> Customize Dashboard
        </button>
      </div>

      {/* ═══ Hero Banner ═══ */}
      <div className="dash-hero" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        borderRadius: 14, padding: '28px 32px', position: 'relative', overflow: 'hidden',
        border: '1px solid #334155',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(59,130,246,0.06)' }} />
        <div style={{ position: 'absolute', right: 100, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(16,185,129,0.05)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
            Telecom Expense Overview
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>${fmt(billed)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Total invoiced across all vendors</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 16px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>MRC</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#93c5fd' }}>${fmt(totalMrc)}</div>
            </div>
            <div style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, padding: '8px 16px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NRC</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#c4b5fd' }}>${fmt(totalNrc)}</div>
            </div>
            {variance > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 16px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Variance</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fca5a5' }}>${fmt(variance)}</div>
              </div>
            )}
          </div>
        </div>
        <div className="dash-hero-right" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Savings Pipeline</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#4ade80' }}>${fmt(savingsProjected)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>{data.savingsOpportunities?.length || 0} opportunities</div>
            </div>
            {savingsRealized > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Realized Savings</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#86efac' }}>${fmt(savingsRealized)}</div>
              </div>
            )}
            {creditRecovered > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Credits Recovered</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#93c5fd' }}>${fmt(creditRecovered)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ KPI Grid ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14 }}>
        <KpiCard label="Vendors"        value={data.totalVendors}      icon={Landmark}      color="blue"   sub={`${data.totalAccounts} accounts`} onClick={() => navigate('/vendors')} />
        <KpiCard label="Contracts"      value={data.activeContracts}   icon={FileText}      color="teal"   sub="Active agreements"  onClick={() => navigate('/contracts')} />
        <KpiCard label="Inventory"      value={data.activeInventory}   icon={Network}       color="purple" sub="Active items"       onClick={() => navigate('/inventory')} />
        <KpiCard label="Locations"      value={data.totalLocations}    icon={MapPin}        color="green"  sub="Site locations"     onClick={() => navigate('/locations')} />
        <KpiCard label="Open Invoices"  value={data.openInvoices}      icon={Receipt}       color="orange" sub={`${data.totalInvoices} total`} onClick={() => navigate('/invoices')} />
        <KpiCard label="Pending Orders" value={data.pendingOrders}     icon={ShoppingCart}  color="slate"  sub="In provisioning"    onClick={() => navigate('/orders')} />
        <KpiCard label="Open Disputes"  value={openDisputes}           icon={ShieldAlert}   color={openDisputes > 0 ? 'red' : 'green'} sub={disputeAmount > 0 ? `$${fmt(disputeAmount)}` : 'None open'} onClick={() => navigate('/disputes')} />
        <KpiCard label="Open Tickets"   value={data.openTickets}       icon={LifeBuoy}      color={data.openTickets > 0 ? 'orange' : 'green'} sub={`${data.totalTickets} total`} onClick={() => navigate('/tickets')} />
      </div>

      {/* ═══ Charts Row 1: Monthly Trend + Top Vendors ═══ */}
      <div className="dash-grid-2">
        {/* Monthly Spend Trend */}
        {(data.monthlyTrend || []).length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#3b82f6" /> Monthly Spend Trend
            </div>
            <ResponsiveContainer width="100%" height={240}>
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
        )}

        {/* Top Vendors by Spend */}
        {(data.topVendors || []).length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Landmark size={16} color="#2563eb" /> Top Vendors by Spend
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendors')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.topVendors.map(r => ({
                name: (r.vendor_name || 'Unknown').length > 14 ? (r.vendor_name || 'Unknown').slice(0, 14) + '…' : (r.vendor_name || 'Unknown'),
                Amount: Number(r.total),
              }))} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
                <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ═══ Charts Row 2: Audit Status Pie + Charge Type Pie ═══ */}
      <div className="dash-grid-2">
        {/* Audit Status Pie */}
        {auditTotal > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#3b82f6" /> Audit Status Breakdown
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>{auditTotal} line items</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={[
                  { name: 'Validated', value: audit.validated },
                  { name: 'Variance',  value: audit.variance  },
                  { name: 'Pending',   value: audit.pending   },
                  ...(audit.disputed > 0 ? [{ name: 'Disputed', value: audit.disputed }] : []),
                ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                  {audit.disputed > 0 && <Cell fill="#8b5cf6" />}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spend by Charge Type Pie */}
        {(data.spendByChargeType || []).length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} color="#f59e0b" /> Spend by Charge Type
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.spendByChargeType.map(r => ({ name: r.charge_type || 'Other', value: Number(r.total) }))}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                >
                  {data.spendByChargeType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ═══ Audit Progress Bar ═══ */}
      {auditTotal > 0 && (
        <div className="page-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <CheckCircle2 size={16} color="#3b82f6" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Line Item Audit Progress</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
              {audit.validated} of {auditTotal} validated ({auditTotal > 0 ? Math.round((audit.validated / auditTotal) * 100) : 0}%)
            </span>
          </div>
          <div className="dash-progress-track" style={{ display: 'flex', height: 10, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
            {audit.validated > 0 && <div style={{ width: `${(audit.validated / auditTotal) * 100}%`, background: '#22c55e', transition: 'width 0.5s' }} />}
            {audit.variance > 0 && <div style={{ width: `${(audit.variance / auditTotal) * 100}%`, background: '#ef4444', transition: 'width 0.5s' }} />}
            {(audit.disputed || 0) > 0 && <div style={{ width: `${(audit.disputed / auditTotal) * 100}%`, background: '#8b5cf6', transition: 'width 0.5s' }} />}
            {audit.pending > 0 && <div style={{ width: `${(audit.pending / auditTotal) * 100}%`, background: '#f59e0b', transition: 'width 0.5s' }} />}
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
            {[
              { label: 'Validated', count: audit.validated, color: '#22c55e' },
              { label: 'Variance',  count: audit.variance,  color: '#ef4444' },
              { label: 'Disputed',  count: audit.disputed || 0, color: '#8b5cf6' },
              { label: 'Pending',   count: audit.pending,   color: '#f59e0b' },
            ].filter(s => s.count > 0).map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                <span style={{ color: '#64748b' }}>{s.label}</span>
                <span style={{ fontWeight: 700 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Tables Row 1: Recent Invoices + Savings Opportunities ═══ */}
      <div className="dash-grid-2">
        {/* Recent Invoices */}
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={16} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Invoices</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Vendor</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th>
            </tr></thead>
            <tbody>
              {(data.recentInvoices || []).map(inv => (
                <tr key={inv.invoices_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.invoices_id}`)}>
                      {inv.invoice_number || `INV-${inv.invoices_id}`}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{inv.vendor_name || inv.account_name || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(inv.total_amount)}</td>
                  <td><span className={STATUS_BADGE[inv.status] || 'badge badge-gray'}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Savings Opportunities */}
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Savings Opportunities</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cost-savings')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Vendor</th><th>Category</th><th style={{ textAlign: 'right' }}>Projected</th><th>Status</th>
            </tr></thead>
            <tbody>
              {(data.savingsOpportunities || []).length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No open savings opportunities</td></tr>
              ) : (data.savingsOpportunities || []).map(s => (
                <tr key={s.cost_savings_id}>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{s.vendor_name || '—'}</td>
                  <td><span className="badge badge-blue">{s.category}</span></td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>${fmt(s.projected_savings)}</td>
                  <td><span className={STATUS_BADGE[s.status] || 'badge badge-gray'}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Tables Row 2: Disputes + Tickets ═══ */}
      <div className="dash-grid-2">
        {/* Recent Disputes */}
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Disputes</span>
              {openDisputes > 0 && <span className="badge badge-red">{openDisputes}</span>}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/disputes')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Vendor</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th>
            </tr></thead>
            <tbody>
              {(data.recentDisputes || []).length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No recent disputes</td></tr>
              ) : (data.recentDisputes || []).map(d => (
                <tr key={d.disputes_id}>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{d.vendor_name || '—'}</td>
                  <td><span className="badge badge-orange">{d.dispute_type}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>${fmt(d.amount)}</td>
                  <td><span className={STATUS_BADGE[d.status] || 'badge badge-gray'}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Tickets */}
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LifeBuoy size={16} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Tickets</span>
              {data.openTickets > 0 && <span className="badge badge-orange">{data.openTickets}</span>}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Ticket</th><th>Title</th><th>Priority</th><th>Status</th>
            </tr></thead>
            <tbody>
              {(data.recentTickets || []).length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No tickets</td></tr>
              ) : (data.recentTickets || []).map(t => (
                <tr key={t.tickets_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }} onClick={() => navigate(`/tickets/${t.tickets_id}`)}>
                      {t.ticket_number}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                  <td><span className={STATUS_BADGE[t.priority] || 'badge badge-gray'}>{t.priority}</span></td>
                  <td><span className={STATUS_BADGE[t.status] || 'badge badge-gray'}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Expiring Contracts ═══ */}
      {(data.expiringContracts || []).length > 0 && (
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Contracts Expiring Soon</span>
              <span className="badge badge-orange">{data.expiringContracts.length}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contracts')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Contract</th><th>Vendor</th><th>Expires</th>
            </tr></thead>
            <tbody>
              {data.expiringContracts.map(c => (
                <tr key={c.contracts_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/contracts/${c.contracts_id}`)}>
                      {c.contract_number || c.contract_name}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{c.vendor_name || '—'}</td>
                  <td style={{ color: '#f59e0b', fontWeight: 600 }}>{c.expiration_date?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Recent Billing Variances ═══ */}
      {(data.recentVariances || []).length > 0 && (
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Billing Variances</span>
              <span className="badge badge-red">{data.recentVariances.length}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View invoices <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Description</th><th>Invoice</th><th>Circuit</th><th style={{ textAlign: 'right' }}>Billed</th><th style={{ textAlign: 'right' }}>Contracted</th><th style={{ textAlign: 'right' }}>Variance</th><th>Audit</th>
            </tr></thead>
            <tbody>
              {data.recentVariances.map(v => (
                <tr key={v.line_items_id}>
                  <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{v.description}</td>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${v.invoices_id}`)}>
                      {v.invoice_number}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.inventory_number || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(v.amount)}</td>
                  <td style={{ textAlign: 'right' }}>${fmt(v.contracted_rate)}</td>
                  <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>${fmt(v.variance)}</td>
                  <td><span className="badge badge-red">{v.audit_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
