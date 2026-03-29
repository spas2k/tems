import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, FileText, Network, ShoppingCart, DollarSign,
  AlertTriangle, Zap, TrendingUp, ArrowRight, Receipt,
  ShieldAlert, CheckCircle2, Clock, RefreshCw, MapPin,
  LifeBuoy, Landmark, Upload, Award, Link2, MessageSquare,
  Settings2, LineChart as LineChartIcon,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Treemap,
} from 'recharts';
import { getSavedGraph, runReport, getSavedReport } from '../api';

/* ── Shared helpers (same as Dashboard.jsx) ── */
const STATUS_BADGE = {
  Paid: 'badge badge-green', Open: 'badge badge-blue', Disputed: 'badge badge-orange',
  Void: 'badge badge-gray', Identified: 'badge badge-purple', Resolved: 'badge badge-green',
  'In Progress': 'badge badge-blue', Critical: 'badge badge-red', High: 'badge badge-orange',
  Medium: 'badge badge-blue', Low: 'badge badge-gray',
};
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const GRAPH_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
];
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = n => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
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

/* ══════════════════════════════════════════════════════════
   Built-in Widget Renderers
   ══════════════════════════════════════════════════════════ */

function HeroBanner({ data }) {
  const billed = Number(data.totalBilled);
  const totalMrc = Number(data.totalMrc) || 0;
  const totalNrc = Number(data.totalNrc) || 0;
  const variance = Number(data.totalVariance);
  const savingsProjected = Number(data.totalSavingsIdentified);
  const savingsRealized = Number(data.totalSavingsRealized) || 0;
  const creditRecovered = Number(data.creditRecovered) || 0;

  return (
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
  );
}

const ALL_KPI_CARDS = [
  { key: 'vendors', label: 'Vendors', field: 'totalVendors', icon: Landmark, color: 'blue', sub: d => `${d.totalAccounts} accounts`, path: '/vendors' },
  { key: 'contracts', label: 'Contracts', field: 'activeContracts', icon: FileText, color: 'teal', sub: () => 'Active agreements', path: '/contracts' },
  { key: 'inventory', label: 'Inventory', field: 'activeInventory', icon: Network, color: 'purple', sub: () => 'Active items', path: '/inventory' },
  { key: 'locations', label: 'Locations', field: 'totalLocations', icon: MapPin, color: 'green', sub: () => 'Site locations', path: '/locations' },
  { key: 'invoices', label: 'Open Invoices', field: 'openInvoices', icon: Receipt, color: 'orange', sub: d => `${d.totalInvoices} total`, path: '/invoices' },
  { key: 'orders', label: 'Pending Orders', field: 'pendingOrders', icon: ShoppingCart, color: 'slate', sub: () => 'In provisioning', path: '/orders' },
  { key: 'disputes', label: 'Open Disputes', field: 'openDisputes', icon: ShieldAlert, colorFn: d => (Number(d.openDisputes) || 0) > 0 ? 'red' : 'green', sub: d => { const a = Number(d.disputeAmount) || 0; return a > 0 ? `$${fmt(a)}` : 'None open'; }, path: '/disputes' },
  { key: 'tickets', label: 'Open Tickets', field: 'openTickets', icon: LifeBuoy, colorFn: d => (d.openTickets > 0 ? 'orange' : 'green'), sub: d => `${d.totalTickets} total`, path: '/tickets' },
];

function KpiGrid({ data, navigate, config }) {
  const enabledCards = config?.cards || ALL_KPI_CARDS.map(c => c.key);
  const cards = ALL_KPI_CARDS.filter(c => enabledCards.includes(c.key));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 14 }}>
      {cards.map(c => (
        <KpiCard
          key={c.key}
          label={c.label}
          value={data[c.field]}
          icon={c.icon}
          color={c.colorFn ? c.colorFn(data) : c.color}
          sub={c.sub(data)}
          onClick={() => navigate(c.path)}
        />
      ))}
    </div>
  );
}

function MonthlyTrendChart({ data }) {
  if (!(data.monthlyTrend || []).length) return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={16} color="#3b82f6" /> Monthly Spend Trend
      </div>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>No monthly trend data yet</div>
    </div>
  );
  return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={16} color="#3b82f6" /> Monthly Spend Trend
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="spendGradCustom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtK(v)} />
          <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
          <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#spendGradCustom)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopVendorsChart({ data, navigate }) {
  if (!(data.topVendors || []).length) return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Landmark size={16} color="#2563eb" /> Top Vendors by Spend
      </div>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>No vendor spend data yet</div>
    </div>
  );
  return (
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
  );
}

function AuditStatusPie({ data }) {
  const audit = data.auditCounts || { validated: 0, variance: 0, pending: 0, disputed: 0 };
  const auditTotal = audit.validated + audit.variance + audit.pending + (audit.disputed || 0);
  if (auditTotal <= 0) return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle2 size={16} color="#3b82f6" /> Audit Status Breakdown
      </div>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>
        No audited line items yet
      </div>
    </div>
  );
  return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle2 size={16} color="#3b82f6" /> Audit Status Breakdown
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>{auditTotal} line items</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={[
            { name: 'Validated', value: audit.validated },
            { name: 'Variance', value: audit.variance },
            { name: 'Pending', value: audit.pending },
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
  );
}

function ChargeTypePie({ data }) {
  if (!(data.spendByChargeType || []).length) return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <DollarSign size={16} color="#f59e0b" /> Spend by Charge Type
      </div>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>No charge type data yet</div>
    </div>
  );
  return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <DollarSign size={16} color="#f59e0b" /> Spend by Charge Type
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data.spendByChargeType.map(r => ({ name: r.charge_type || 'Other', value: Number(r.total) }))}
            cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
            {data.spendByChargeType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function AuditProgressBar({ data }) {
  const audit = data.auditCounts || { validated: 0, variance: 0, pending: 0, disputed: 0 };
  const auditTotal = audit.validated + audit.variance + audit.pending + (audit.disputed || 0);
  if (auditTotal <= 0) return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CheckCircle2 size={16} color="#3b82f6" />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Line Item Audit Progress</span>
      </div>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>No audited line items yet</div>
    </div>
  );
  return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CheckCircle2 size={16} color="#3b82f6" />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Line Item Audit Progress</span>
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
          {audit.validated} of {auditTotal} validated ({Math.round((audit.validated / auditTotal) * 100)}%)
        </span>
      </div>
      <div style={{ display: 'flex', height: 10, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
        {audit.validated > 0 && <div style={{ width: `${(audit.validated / auditTotal) * 100}%`, background: '#22c55e', transition: 'width 0.5s' }} />}
        {audit.variance > 0 && <div style={{ width: `${(audit.variance / auditTotal) * 100}%`, background: '#ef4444', transition: 'width 0.5s' }} />}
        {(audit.disputed || 0) > 0 && <div style={{ width: `${(audit.disputed / auditTotal) * 100}%`, background: '#8b5cf6', transition: 'width 0.5s' }} />}
        {audit.pending > 0 && <div style={{ width: `${(audit.pending / auditTotal) * 100}%`, background: '#f59e0b', transition: 'width 0.5s' }} />}
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
        {[
          { label: 'Validated', count: audit.validated, color: '#22c55e' },
          { label: 'Variance', count: audit.variance, color: '#ef4444' },
          { label: 'Disputed', count: audit.disputed || 0, color: '#8b5cf6' },
          { label: 'Pending', count: audit.pending, color: '#f59e0b' },
        ].filter(s => s.count > 0).map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            <span style={{ color: '#64748b' }}>{s.label}</span>
            <span style={{ fontWeight: 700 }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentInvoicesTable({ data, navigate }) {
  return (
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
        <thead><tr><th>Invoice #</th><th>Vendor</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {(data.recentInvoices || []).map(inv => (
            <tr key={inv.invoices_id}>
              <td><span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.invoices_id}`)}>{inv.invoice_number || `INV-${inv.invoices_id}`}</span></td>
              <td style={{ fontWeight: 500, fontSize: 12 }}>{inv.vendor_name || inv.account_name || '—'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(inv.total_amount)}</td>
              <td><span className={STATUS_BADGE[inv.status] || 'badge badge-gray'}>{inv.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SavingsTable({ data, navigate }) {
  return (
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
        <thead><tr><th>Vendor</th><th>Category</th><th style={{ textAlign: 'right' }}>Projected</th><th>Status</th></tr></thead>
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
  );
}

function DisputesTable({ data, navigate }) {
  const openDisputes = Number(data.openDisputes) || 0;
  return (
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
        <thead><tr><th>Vendor</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
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
  );
}

function TicketsTable({ data, navigate }) {
  return (
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
        <thead><tr><th>Ticket</th><th>Title</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>
          {(data.recentTickets || []).length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No tickets</td></tr>
          ) : (data.recentTickets || []).map(t => (
            <tr key={t.tickets_id}>
              <td><span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }} onClick={() => navigate(`/tickets/${t.tickets_id}`)}>{t.ticket_number}</span></td>
              <td style={{ fontWeight: 500, fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
              <td><span className={STATUS_BADGE[t.priority] || 'badge badge-gray'}>{t.priority}</span></td>
              <td><span className={STATUS_BADGE[t.status] || 'badge badge-gray'}>{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpiringContractsTable({ data, navigate }) {
  if (!(data.expiringContracts || []).length) return (
    <div className="page-card">
      <div className="page-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Contracts Expiring Soon</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>No contracts expiring within 90 days</div>
    </div>
  );
  return (
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
        <thead><tr><th>Contract</th><th>Vendor</th><th>Expires</th></tr></thead>
        <tbody>
          {data.expiringContracts.map(c => (
            <tr key={c.contracts_id}>
              <td><span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/contracts/${c.contracts_id}`)}>{c.contract_number || c.contract_name}</span></td>
              <td style={{ fontWeight: 500, fontSize: 12 }}>{c.vendor_name || '—'}</td>
              <td style={{ color: '#f59e0b', fontWeight: 600 }}>{c.expiration_date?.split('T')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VariancesTable({ data, navigate }) {
  if (!(data.recentVariances || []).length) return (
    <div className="page-card">
      <div className="page-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Billing Variances</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>No billing variances found</div>
    </div>
  );
  return (
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
        <thead><tr><th>Description</th><th>Invoice</th><th>Circuit</th><th style={{ textAlign: 'right' }}>Billed</th><th style={{ textAlign: 'right' }}>Contracted</th><th style={{ textAlign: 'right' }}>Variance</th><th>Audit</th></tr></thead>
        <tbody>
          {data.recentVariances.map(v => (
            <tr key={v.line_items_id}>
              <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{v.description}</td>
              <td><span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${v.invoices_id}`)}>{v.invoice_number}</span></td>
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
  );
}

/* ══════════════════════════════════════════════════════════
   Embedded Saved Graph Widget
   ══════════════════════════════════════════════════════════ */
function SavedGraphEmbed({ graphId }) {
  const [graph, setGraph] = useState(null);
  const [config, setConfig] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!graphId) { setLoading(false); return; }
    setLoading(true); setError(null);
    let savedCfg = null;
    getSavedGraph(graphId)
      .then(r => {
        const row = r.data;
        const cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
        savedCfg = cfg;
        setGraph(row);
        setConfig(cfg);

        const groupBy = [{ table: cfg.xAxis?.table, field: cfg.xAxis?.field }];
        if (cfg.groupByField) groupBy.push({ table: cfg.groupByField.table, field: cfg.groupByField.field });
        const aggregations = (cfg.yAxes || []).map(y => ({ table: y.table, field: y.field, func: y.agg || 'sum' }));

        return runReport({
          tableKey: cfg.tableKey,
          linkedTables: (cfg.linkedTables || []).map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
          fields: [],
          filters: (cfg.filters || []).map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
          filterLogic: cfg.filterLogic || 'AND',
          sorts: [],
          groupBy,
          aggregations,
          limit: Math.min(cfg.limit || 500, 2000),
          offset: 0,
          distinct: false,
        });
      })
      .then(r => {
        if (!r?.data?.data || !savedCfg) return;
        const results = r.data;
        const xAxis = savedCfg.xAxis;
        const yAxes = savedCfg.yAxes || [];
        if (!xAxis) return;

        const xResultKey = results.fields?.find(f => f.key.includes(xAxis.field))?.key || xAxis.field;
        const processed = results.data.map(row => {
          const entry = { _x: row[xResultKey] ?? row[xAxis.field] ?? '' };
          yAxes.forEach((y, i) => {
            const yResultKey = results.fields?.find(f =>
              f.key.includes(y.field) && f.key.includes(y.agg)
            )?.key || `${y.agg}_${y.table}__${y.field}`;
            entry[`y${i}`] = Number(row[yResultKey] ?? row[`${y.agg}_${y.field}`] ?? 0);
          });
          return entry;
        });
        setChartData(processed);
      })
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to load graph'))
      .finally(() => setLoading(false));
  }, [graphId]);

  if (!graphId) return (
    <div className="page-card" style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
      <LineChartIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
      <div style={{ fontSize: 13 }}>No graph selected</div>
    </div>
  );

  if (loading) return (
    <div className="page-card" style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div className="page-card" style={{ padding: 20 }}>
      <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Failed to load graph</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{error}</div>
    </div>
  );

  const chartType = config?.chartType || 'bar';
  const yAxes = config?.yAxes || [];
  const showLegend = config?.showLegend !== false;

  const renderEmbedChart = () => {
    if (!chartData.length) return <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No data</div>;

    if (chartType === 'pie' || chartType === 'donut') {
      const pieData = chartData.map((d, i) => ({
        name: String(d._x || `Item ${i + 1}`),
        value: d.y0 || 0,
        color: GRAPH_COLORS[i % GRAPH_COLORS.length],
      }));
      return (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={chartType === 'donut' ? 45 : 0} outerRadius={80} paddingAngle={2}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="_x" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
            {yAxes.map((y, i) => (
              <Line key={i} dataKey={`y${i}`} stroke={y.color || GRAPH_COLORS[i]} strokeWidth={2} dot={{ r: 2 }} type="monotone" />
            ))}
            <Tooltip />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="_x" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
            {yAxes.map((y, i) => (
              <Area key={i} dataKey={`y${i}`} fill={y.color || GRAPH_COLORS[i]} stroke={y.color || GRAPH_COLORS[i]} fillOpacity={0.2} type="monotone" />
            ))}
            <Tooltip />
            {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar chart (also handles stacked, horizontal)
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
          layout={chartType === 'horizontalBar' ? 'vertical' : 'horizontal'}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="_x" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
          {yAxes.map((y, i) => (
            <Bar key={i} dataKey={`y${i}`} fill={y.color || GRAPH_COLORS[i]}
              stackId={chartType === 'stackedBar' ? 'stack' : undefined}
              radius={[3, 3, 0, 0]} />
          ))}
          <Tooltip />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <LineChartIcon size={16} color="#3b82f6" />
        {graph?.name || 'Saved Graph'}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/graphs/${graphId}`)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          Full view <ArrowRight size={12} />
        </button>
      </div>
      {renderEmbedChart()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Embedded Saved Report Widget
   ══════════════════════════════════════════════════════════ */
function SavedReportEmbed({ reportId, limit }) {
  const [report, setReport] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const maxRows = limit || 10;

  useEffect(() => {
    if (!reportId) { setLoading(false); return; }
    setLoading(true); setError(null);
    getSavedReport(reportId)
      .then(r => {
        const row = r.data;
        const cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
        setReport(row);

        return runReport({
          ...cfg,
          limit: maxRows,
          offset: 0,
        });
      })
      .then(r => setResults(r?.data || null))
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [reportId, maxRows]);

  if (!reportId) return (
    <div className="page-card" style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
      <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
      <div style={{ fontSize: 13 }}>No report selected</div>
    </div>
  );

  if (loading) return (
    <div className="page-card" style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 150 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div className="page-card" style={{ padding: 20 }}>
      <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Failed to load report</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{error}</div>
    </div>
  );

  const fields = results?.fields || [];
  const rows = results?.data || [];

  return (
    <div className="page-card">
      <div className="page-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="#8b5cf6" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{report?.name || 'Saved Report'}</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{rows.length} rows</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/reports/${reportId}`)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          Full view <ArrowRight size={12} />
        </button>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No data returned</div>
      ) : (
        <div style={{ overflow: 'auto', maxHeight: 320 }}>
          <table className="data-table">
            <thead>
              <tr>
                {fields.slice(0, 6).map(f => <th key={f.key} style={{ whiteSpace: 'nowrap' }}>{f.label}</th>)}
                {fields.length > 6 && <th>…</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {fields.slice(0, 6).map(f => {
                    const v = row[f.key];
                    const display = v === null || v === undefined ? '—'
                      : f.format === 'currency' ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : f.format === 'date' ? String(v).split('T')[0]
                      : String(v);
                    return <td key={f.key} style={{ fontSize: 12, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</td>;
                  })}
                  {fields.length > 6 && <td style={{ color: '#94a3b8', fontSize: 11 }}>…</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Quick Links Widget
   ══════════════════════════════════════════════════════════ */
function QuickLinksWidget({ config }) {
  const navigate = useNavigate();
  const links = config?.links || [];
  if (!links.length) return (
    <div className="page-card" style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
      <Link2 size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
      <div style={{ fontSize: 13 }}>No quick links configured</div>
      <div style={{ fontSize: 11, marginTop: 4 }}>Add links in the Dashboard Builder</div>
    </div>
  );

  return (
    <div className="page-card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link2 size={16} color="#3b82f6" /> Quick Links
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {links.filter(l => l.label && l.path).map((link, i) => (
          <button
            key={i}
            onClick={() => navigate(link.path)}
            style={{
              padding: '10px 14px', borderRadius: 10,
              border: '1px solid #e2e8f0', background: '#f8fafc',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>{link.label}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{link.path}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Welcome / Note Widget
   ══════════════════════════════════════════════════════════ */
const NOTE_COLORS = {
  blue: { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#93c5fd', icon: '#3b82f6' },
  green: { bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '#86efac', icon: '#22c55e' },
  purple: { bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '#c4b5fd', icon: '#8b5cf6' },
  orange: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '#fcd34d', icon: '#f59e0b' },
  slate: { bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '#cbd5e1', icon: '#64748b' },
};

function WelcomeWidget({ config }) {
  const colors = NOTE_COLORS[config?.color] || NOTE_COLORS.blue;
  const text = config?.text || 'Welcome to your custom dashboard!';
  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 14, padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <MessageSquare size={20} color={colors.icon} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Widget Renderer + Custom Dashboard View
   ══════════════════════════════════════════════════════════ */
const WIDGET_RENDERERS = {
  hero_banner: (data, navigate) => <HeroBanner data={data} />,
  kpi_cards: (data, navigate, config) => <KpiGrid data={data} navigate={navigate} config={config} />,
  chart_monthly_trend: (data, navigate) => <MonthlyTrendChart data={data} />,
  chart_top_vendors: (data, navigate) => <TopVendorsChart data={data} navigate={navigate} />,
  chart_audit_status: (data, navigate) => <AuditStatusPie data={data} />,
  chart_charge_type: (data, navigate) => <ChargeTypePie data={data} />,
  audit_progress: (data, navigate) => <AuditProgressBar data={data} />,
  table_recent_invoices: (data, navigate) => <RecentInvoicesTable data={data} navigate={navigate} />,
  table_savings: (data, navigate) => <SavingsTable data={data} navigate={navigate} />,
  table_disputes: (data, navigate) => <DisputesTable data={data} navigate={navigate} />,
  table_tickets: (data, navigate) => <TicketsTable data={data} navigate={navigate} />,
  table_expiring_contracts: (data, navigate) => <ExpiringContractsTable data={data} navigate={navigate} />,
  table_variances: (data, navigate) => <VariancesTable data={data} navigate={navigate} />,
  saved_graph: (_data, _navigate, config) => <SavedGraphEmbed graphId={config?.graphId} />,
  saved_report: (_data, _navigate, config) => <SavedReportEmbed reportId={config?.reportId} limit={config?.limit} />,
  quick_links: (_data, _navigate, config) => <QuickLinksWidget config={config} />,
  welcome_message: (_data, _navigate, config) => <WelcomeWidget config={config} />,
};

export default function CustomDashboard({ data, layout }) {
  const navigate = useNavigate();
  const widgets = layout?.widgets || [];
  const settings = layout?.settings || {};

  // Auto-refresh support
  useEffect(() => {
    if (!settings.autoRefresh || !settings.refreshInterval) return;
    const interval = setInterval(() => {
      window.location.reload();
    }, (settings.refreshInterval || 5) * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval]);

  // Group widgets into rows for the grid layout
  // Full-width widgets get their own row, half-width widgets pair up
  const rows = useMemo(() => {
    const result = [];
    let pendingHalf = null;

    widgets.forEach(widget => {
      if (widget.width === 'half') {
        if (pendingHalf) {
          result.push([pendingHalf, widget]);
          pendingHalf = null;
        } else {
          pendingHalf = widget;
        }
      } else {
        if (pendingHalf) {
          result.push([pendingHalf]);
          pendingHalf = null;
        }
        result.push([widget]);
      }
    });

    if (pendingHalf) {
      result.push([pendingHalf]);
    }
    return result;
  }, [widgets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Edit bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {settings.autoRefresh && (
          <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={12} /> Auto-refresh every {settings.refreshInterval || 5}m
          </span>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/dashboard-builder')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Settings2 size={14} /> Customize
        </button>
      </div>

      {/* Render widget rows */}
      {rows.map((row, ri) => {
        if (row.length === 1 && row[0].width !== 'half') {
          // Full-width widget
          const w = row[0];
          const renderer = WIDGET_RENDERERS[w.type];
          if (!renderer) return null;
          return <div key={w.id || ri}>{renderer(data, navigate, w.config)}</div>;
        }

        // Row of 1 or 2 half-width widgets
        return (
          <div key={`row-${ri}`} className="dash-grid-2">
            {row.map(w => {
              const renderer = WIDGET_RENDERERS[w.type];
              if (!renderer) return null;
              return <div key={w.id}>{renderer(data, navigate, w.config)}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}
