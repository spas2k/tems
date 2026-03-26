import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api';
import {
  Building2, FileText, Network, ShoppingCart, DollarSign,
  AlertTriangle, Zap, TrendingUp, ArrowRight, Receipt,
  ShieldAlert, CheckCircle2, Clock, RefreshCw,
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

export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard()
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
      Error loading dashboard: {error}
    </div>
  );

  const variance = Number(data.totalVariance);
  const savings  = Number(data.totalSavingsIdentified);
  const billed   = Number(data.totalBilled);
  const totalMrc = Number(data.totalMrc) || 0;
  const totalNrc = Number(data.totalNrc) || 0;
  const audit    = data.auditCounts || { validated: 0, variance: 0, pending: 0 };
  const auditTotal = audit.validated + audit.variance + audit.pending;
  const openDisputes = Number(data.openDisputes) || 0;
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <div className="dash-hero" style={{
        background: '#1e293b',
        borderRadius: 12, padding: '24px 28px', position: 'relative', overflow: 'hidden',
        border: '1px solid #334155',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Monthly Overview</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>${fmt(billed)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Total invoiced across all vendors</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '6px 14px' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>MRC</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#93c5fd' }}>${fmt(totalMrc)}</div>
            </div>
            <div style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, padding: '6px 14px' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>NRC</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#c4b5fd' }}>${fmt(totalNrc)}</div>
            </div>
          </div>
          {variance > 0 && (
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.2)', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={14} color="#fca5a5" />
              <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>${fmt(variance)} billing variance detected</span>
            </div>
          )}
        </div>
        <div className="dash-hero-right" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Savings Pipeline</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#4ade80' }}>${fmt(savings)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{data.savingsOpportunities?.length || 0} opportunities</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KpiCard label="Vendors"       value={data.totalAccounts}  icon={Building2}     color="blue"   sub="Active accounts" />
        <KpiCard label="Contracts"     value={data.activeContracts} icon={FileText}     color="teal"   sub="Active agreements" />
        <KpiCard label="Inventory"      value={data.activeInventory}  icon={Network}      color="purple" sub="In inventory" />
        <KpiCard label="Open Invoices" value={data.openInvoices}    icon={Receipt}      color="orange" sub="Pending review" />
        <KpiCard label="Pending Orders" value={data.pendingOrders}  icon={ShoppingCart} color="slate"  sub="In provisioning" />
        <KpiCard label="Monthly MRC"   value={`$${fmt(totalMrc)}`}  icon={RefreshCw}    color="blue"   sub="Recurring charges" />
        <KpiCard label="Total NRC"     value={`$${fmt(totalNrc)}`}  icon={DollarSign}   color="purple" sub="Non-recurring" />
        <KpiCard label="Variance"      value={`$${fmt(variance)}`}  icon={AlertTriangle} color={variance > 0 ? 'red' : 'green'} sub={variance > 0 ? 'Needs attention' : 'All clear'} />
        <KpiCard label="Open Disputes" value={openDisputes}         icon={ShieldAlert}  color={openDisputes > 0 ? 'red' : 'green'} sub={openDisputes > 0 ? 'Active disputes' : 'None open'} />
      </div>

      {/* Charts Row */}
      <div className="dash-grid-2">
        {/* Audit Status Pie */}
        {auditTotal > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#3b82f6" /> Audit Status Breakdown
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[
                  { name: 'Validated', value: audit.validated },
                  { name: 'Variance',  value: audit.variance  },
                  { name: 'Pending',   value: audit.pending   },
                ]} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Invoice Amounts Bar */}
        {(data.recentInvoices || []).length > 0 && (
          <div className="page-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={16} color="#3b82f6" /> Recent Invoice Amounts
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(data.recentInvoices || []).slice(0, 7).map(inv => ({
                name: inv.account_name?.length > 12 ? inv.account_name.slice(0, 12) + '…' : inv.account_name,
                Amount: parseFloat(inv.total_amount) || 0,
              }))} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Savings Opportunities Bar */}
      {(data.savingsOpportunities || []).length > 0 && (
        <div className="page-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#16a34a" /> Savings Pipeline by Vendor
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(data.savingsOpportunities || []).slice(0, 10).map(s => ({
              name: s.vendor_name?.length > 14 ? s.vendor_name.slice(0, 14) + '…' : s.vendor_name,
              Savings: parseFloat(s.projected_savings) || 0,
            }))} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="Savings" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Audit Status Summary */}
      {auditTotal > 0 && (        <div className="page-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <CheckCircle2 size={16} color="#3b82f6" />
            <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 14 }}>Line Item Audit Status</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>{auditTotal} total line items</span>
          </div>
          <div className="dash-progress-track" style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
            {audit.validated > 0 && <div style={{ width: `${(audit.validated / auditTotal) * 100}%`, background: '#22c55e' }} />}
            {audit.variance > 0 && <div style={{ width: `${(audit.variance / auditTotal) * 100}%`, background: '#ef4444' }} />}
            {audit.pending > 0 && <div style={{ width: `${(audit.pending / auditTotal) * 100}%`, background: '#f59e0b' }} />}
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ color: '#64748b' }}>Validated</span>
              <span className="rc-results-count" style={{ fontWeight: 700 }}>{audit.validated}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ color: '#64748b' }}>Variance</span>
              <span className="rc-results-count" style={{ fontWeight: 700 }}>{audit.variance}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <span style={{ color: '#64748b' }}>Pending</span>
              <span className="rc-results-count" style={{ fontWeight: 700 }}>{audit.pending}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tables Row 1 */}
      <div className="dash-grid-2">
        {/* Recent Invoices */}
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} color="#3b82f6" />
              <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 14 }}>Recent Invoices</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Vendor</th><th>Amount</th><th>Status</th>
            </tr></thead>
            <tbody>
              {(data.recentInvoices || []).map(inv => (
                <tr key={inv.invoices_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.invoices_id}`)}>
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{inv.account_name}</td>
                  <td style={{ fontWeight: 700 }}>${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td><span className={STATUS_BADGE[inv.status] || 'badge badge-gray'}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Savings */}
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#16a34a" />
              <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 14 }}>Savings Opportunities</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cost-savings')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Vendor</th><th>Category</th><th>Projected</th><th>Status</th>
            </tr></thead>
            <tbody>
              {(data.savingsOpportunities || []).map(s => (
                <tr key={s.cost_savings_id}>
                  <td style={{ fontWeight: 500 }}>{s.vendor_name}</td>
                  <td><span className="badge badge-blue">{s.category}</span></td>
                  <td style={{ color: '#16a34a', fontWeight: 700 }}>${Number(s.projected_savings).toLocaleString()}</td>
                  <td><span className={STATUS_BADGE[s.status] || 'badge badge-gray'}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Variances */}
      {(data.recentVariances || []).length > 0 && (
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 14 }}>Recent Billing Variances</span>
              <span className="badge badge-red" style={{ marginLeft: 4 }}>{data.recentVariances.length}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View invoices <ArrowRight size={12} />
            </button>
          </div>
          <table className="data-table">
            <thead><tr>
              <th>Description</th><th>Invoice</th><th>InventoryItem</th><th>Billed</th><th>Contracted</th><th>Variance</th><th>Audit</th>
            </tr></thead>
            <tbody>
              {data.recentVariances.map(v => (
                <tr key={v.line_items_id}>
                  <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description}</td>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${v.invoices_id}`)}>
                      {v.invoice_number}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.inventory_number || '—'}</td>
                  <td style={{ fontWeight: 700 }}>${Number(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td>${Number(v.contracted_rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ color: '#ef4444', fontWeight: 700 }}>${Number(v.variance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
