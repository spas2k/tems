import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api';
import {
  Building2, FileText, Network, ShoppingCart, DollarSign,
  AlertTriangle, Zap, TrendingUp, ArrowRight, Receipt,
} from 'lucide-react';

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
    <div style={{ background: '#fee2e2', color: '#dc2626', padding: '16px 20px', borderRadius: 12, fontWeight: 600 }}>
      Error loading dashboard: {error}
    </div>
  );

  const variance = Number(data.totalVariance);
  const savings  = Number(data.totalSavingsIdentified);
  const billed   = Number(data.totalBilled);
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <div style={{
        background: '#1e293b',
        borderRadius: 12, padding: '24px 28px', position: 'relative', overflow: 'hidden',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        border: '1px solid #334155',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Monthly Overview</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>${fmt(billed)}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Total invoiced across all vendors</div>
          {variance > 0 && (
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.2)', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={14} color="#fca5a5" />
              <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>${fmt(variance)} billing variance detected</span>
            </div>
          )}
        </div>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Savings Pipeline</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#4ade80' }}>${fmt(savings)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{data.savingsOpportunities?.length || 0} opportunities</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KpiCard label="Vendors"       value={data.totalAccounts}  icon={Building2}     color="blue"   sub="Active accounts" />
        <KpiCard label="Contracts"     value={data.activeContracts} icon={FileText}     color="teal"   sub="Active agreements" />
        <KpiCard label="Circuits"      value={data.activeCircuits}  icon={Network}      color="purple" sub="In inventory" />
        <KpiCard label="Open Invoices" value={data.openInvoices}    icon={Receipt}      color="orange" sub="Pending review" />
        <KpiCard label="Pending Orders" value={data.pendingOrders}  icon={ShoppingCart} color="slate"  sub="In provisioning" />
        <KpiCard label="Variance"      value={`$${fmt(variance)}`}  icon={AlertTriangle} color={variance > 0 ? 'red' : 'green'} sub={variance > 0 ? 'Needs attention' : 'All clear'} />
      </div>

      {/* Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent Invoices */}
        <div className="page-card">
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={16} color="#3b82f6" />
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Recent Invoices</span>
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
                <tr key={inv.id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
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
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Savings Opportunities</span>
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
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.account_name}</td>
                  <td><span className="badge badge-blue">{s.category}</span></td>
                  <td style={{ color: '#16a34a', fontWeight: 700 }}>${Number(s.projected_savings).toLocaleString()}</td>
                  <td><span className={STATUS_BADGE[s.status] || 'badge badge-gray'}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
