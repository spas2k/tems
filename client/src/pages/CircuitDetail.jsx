import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Network, Save, Receipt, ShoppingCart, AlertTriangle } from 'lucide-react';
import {
  getCircuit, updateCircuit,
  getCircuitInvoices,
  getAccounts, getContracts, getOrders, getOrder,
} from '../api';
import dayjs from 'dayjs';

const TYPES    = ['MPLS', 'Internet', 'Ethernet', 'Voice', 'SD-WAN', 'Dedicated', 'Other'];
const STATUSES = ['Active', 'Pending', 'Disconnected', 'Suspended'];

const STATUS_BADGE = {
  Active: 'badge badge-green',
  Pending: 'badge badge-blue',
  Disconnected: 'badge badge-gray',
  Suspended: 'badge badge-orange',
};

const INV_STATUS_BADGE = {
  Open: 'badge badge-blue',
  Paid: 'badge badge-green',
  Overdue: 'badge badge-red',
  Disputed: 'badge badge-orange',
  Voided: 'badge badge-gray',
};

const ORD_STATUS_BADGE = {
  'In Progress': 'badge badge-blue',
  Complete: 'badge badge-green',
  Cancelled: 'badge badge-gray',
  Pending: 'badge badge-orange',
};

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function CircuitDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);

  const [circuit,  setCircuit]  = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [order,    setOrder]    = useState(null);
  const [accounts,  setAccounts]  = useState([]);
  const [contracts, setContracts] = useState([]);
  const [orders,    setOrders]    = useState([]);

  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCircuit(id),
      getCircuitInvoices(id),
      getAccounts(),
      getContracts(),
      getOrders(),
    ]).then(([ci, inv, ac, co, or_]) => {
      const c = ci.data;
      setCircuit(c);
      setPageTitle(c.circuit_id);
      setInvoices(inv.data);
      setAccounts(ac.data);
      setContracts(co.data);
      setOrders(or_.data);
      setForm({
        account_id:      c.account_id || '',
        contract_id:     c.contract_id || '',
        order_id:        c.order_id || '',
        circuit_id:      c.circuit_id || '',
        type:            c.type || 'Internet',
        bandwidth:       c.bandwidth || '',
        location:        c.location || '',
        contracted_rate: c.contracted_rate != null ? c.contracted_rate : '',
        status:          c.status || 'Active',
        install_date:    c.install_date ? c.install_date.split('T')[0] : '',
        disconnect_date: c.disconnect_date ? c.disconnect_date.split('T')[0] : '',
      });
      // Fetch full order if linked
      if (c.order_id) {
        getOrder(c.order_id).then(r => setOrder(r.data)).catch(() => setOrder(null));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCircuit(id, form);
      setCircuit(updated.data);
      setDirty(false);
      showToast('Circuit saved successfully.');
      // Reload order if order_id changed
      if (form.order_id) {
        getOrder(form.order_id).then(r => setOrder(r.data)).catch(() => setOrder(null));
      } else {
        setOrder(null);
      }
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>Loading circuit…</div>;
  }
  if (!circuit) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444', fontSize: 15 }}>Circuit not found.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#dcfce7' : '#fee2e2',
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      {/* Page header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', padding: '14px 20px', borderRadius: 12,
        border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.075)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/circuits')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Network size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                {circuit.circuit_id}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {circuit.location || 'No location'} · {circuit.account_name}
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[circuit.status] || 'badge badge-gray'}>{circuit.status}</span>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}
        >
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card purple">
          <div className="kpi-label">Circuit Type</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{circuit.type || '—'}</div>
          <div className="kpi-sub">{circuit.bandwidth || 'Bandwidth not set'}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Monthly Rate</div>
          <div className="kpi-value">
            {circuit.contracted_rate != null ? `$${Number(circuit.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div className="kpi-sub">Contracted rate</div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Invoices on File</div>
          <div className="kpi-value">{invoices.length}</div>
          <div className="kpi-sub">Linked via line items</div>
        </div>
      </div>

      {/* Editable Circuit Details */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Circuit Details</span>
          {dirty && (
            <span style={{ fontSize: 11, color: '#f59e0b', background: '#fef3c7', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
              Unsaved changes
            </span>
          )}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Field label="Circuit ID *">
            <input className="form-input" value={form.circuit_id} onChange={e => set('circuit_id', e.target.value)} />
          </Field>

          <Field label="Vendor Account *">
            <select className="form-input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
              <option value="">Select vendor…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>

          <Field label="Location">
            <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} />
          </Field>

          <Field label="Circuit Type">
            <select className="form-input" value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Bandwidth">
            <input className="form-input" value={form.bandwidth} onChange={e => set('bandwidth', e.target.value)} placeholder="e.g. 100 Mbps" />
          </Field>

          <Field label="Contracted Rate ($/mo)">
            <input className="form-input" type="number" step="0.01" value={form.contracted_rate} onChange={e => set('contracted_rate', e.target.value)} />
          </Field>

          <Field label="Install Date">
            <input className="form-input" type="date" value={form.install_date} onChange={e => set('install_date', e.target.value)} />
          </Field>

          <Field label="Disconnect Date">
            <input className="form-input" type="date" value={form.disconnect_date} onChange={e => set('disconnect_date', e.target.value)} />
          </Field>

          <Field label="Contract">
            <select className="form-input" value={form.contract_id || ''} onChange={e => set('contract_id', e.target.value || null)}>
              <option value="">None</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number}</option>)}
            </select>
          </Field>

          <Field label="Linked Order">
            <select className="form-input" value={form.order_id || ''} onChange={e => set('order_id', e.target.value || null)}>
              <option value="">None</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.account_name || ''}</option>)}
            </select>
          </Field>

          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

        </div>
      </div>

      {/* Related Order */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={16} color="#f59e0b" /> Related Order
          </span>
        </div>
        {!order ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <AlertTriangle size={20} style={{ marginBottom: 6 }} />
            <div>No order linked to this circuit.</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Use the dropdown above to assign an order.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Account</th>
                <th>Description</th>
                <th>Order Date</th>
                <th>Due Date</th>
                <th>Contracted Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/orders/${order.id}`)}>{order.order_number}</span>
                </td>
                <td>{order.account_name}</td>
                <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.description || '—'}</td>
                <td>{order.order_date ? dayjs(order.order_date).format('MM/DD/YYYY') : '—'}</td>
                <td>{order.due_date ? dayjs(order.due_date).format('MM/DD/YYYY') : '—'}</td>
                <td style={{ fontWeight: 700 }}>
                  {order.contracted_rate != null ? `$${Number(order.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td>
                  <span className={ORD_STATUS_BADGE[order.status] || 'badge badge-gray'}>{order.status}</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Related Invoices */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={16} color="#2563eb" /> Invoices Containing This Circuit
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Receipt size={20} style={{ marginBottom: 6 }} />
            <div>No invoices found for this circuit.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Vendor</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Period</th>
                <th>Circuit Charges</th>
                <th>Line Items</th>
                <th>Invoice Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>{inv.invoice_number}</span>
                  </td>
                  <td>{inv.account_name}</td>
                  <td>{inv.invoice_date ? dayjs(inv.invoice_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{inv.due_date ? dayjs(inv.due_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ fontSize: 11 }}>
                    {inv.period_start ? `${dayjs(inv.period_start).format('MM/DD')} – ${dayjs(inv.period_end).format('MM/DD/YYYY')}` : '—'}
                  </td>
                  <td style={{ fontWeight: 700, color: '#2563eb' }}>
                    ${Number(inv.circuit_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>{inv.line_item_count}</td>
                  <td style={{ fontWeight: 700 }}>
                    ${Number(inv.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={INV_STATUS_BADGE[inv.status] || 'badge badge-gray'}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
