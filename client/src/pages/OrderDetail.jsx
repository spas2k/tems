import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Save, Network, AlertTriangle } from 'lucide-react';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import {
  getOrder, updateOrder, getOrderCircuits,
  getAccounts, getContracts, getCircuits,
} from '../api';
import dayjs from 'dayjs';

const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const STATUS_BADGE = {
  Pending: 'badge badge-orange',
  'In Progress': 'badge badge-blue',
  Completed: 'badge badge-green',
  Cancelled: 'badge badge-gray',
};

const CIRC_STATUS_BADGE = {
  Active: 'badge badge-green',
  Pending: 'badge badge-blue',
  Disconnected: 'badge badge-gray',
  Suspended: 'badge badge-orange',
};

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function OrderDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();  const { setPageTitle } = useContext(PageTitleContext);
  const [order,     setOrder]     = useState(null);
  const [circuits,  setCircuits]  = useState([]);
  const [accounts,  setAccounts]  = useState([]);
  const [contracts, setContracts] = useState([]);
  const [allCircuits, setAllCircuits] = useState([]);

  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const loadCircuits = () =>
    getOrderCircuits(id).then(r => setCircuits(r.data)).catch(() => setCircuits([]));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getOrder(id),
      getOrderCircuits(id),
      getAccounts(),
      getContracts(),
      getCircuits(),
    ]).then(([o, ci, ac, co, allCi]) => {
      const ord = o.data;
      setOrder(ord);
      setPageTitle(ord.order_number);
      setCircuits(ci.data);
      setAccounts(ac.data);
      setContracts(co.data);
      setAllCircuits(allCi.data);
      setForm({
        accounts_id:      ord.accounts_id      || '',
        contracts_id:     ord.contracts_id     || '',
        circuits_id:      ord.circuits_id      || '',
        order_number:    ord.order_number    || '',
        description:     ord.description     || '',
        contracted_rate: ord.contracted_rate != null ? ord.contracted_rate : '',
        order_date:      ord.order_date      ? ord.order_date.split('T')[0]  : '',
        due_date:        ord.due_date        ? ord.due_date.split('T')[0]    : '',
        status:          ord.status          || 'In Progress',
        notes:           ord.notes           || '',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (order?.order_number) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/orders/${id}`, label: order.order_number, type: 'order' }
      }));
    }
  }, [order]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateOrder(id, form);
      setOrder(updated.data);
      setDirty(false);
      showToast('Order saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>Loading order…</div>;
  }
  if (!order) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444', fontSize: 15 }}>Order not found.</div>;
  }

  const isOverdue = order.due_date && dayjs(order.due_date).isBefore(dayjs(), 'day') && order.status !== 'Completed' && order.status !== 'Cancelled';

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
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/orders')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingCart size={18} color="#d97706" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>
                {order.order_number}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {order.account_name}{order.contract_number ? ` · ${order.contract_number}` : ''}
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[order.status] || 'badge badge-gray'}>{order.status}</span>
          {isOverdue && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#dc2626', background: '#fff1f2', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              <AlertTriangle size={11} /> Overdue
            </span>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}
        >
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </DetailHeader>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card slate">
          <div className="kpi-label">Order Date</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>
            {order.order_date ? dayjs(order.order_date).format('MM/DD/YYYY') : '—'}
          </div>
          <div className="kpi-sub">Submitted</div>
        </div>
        <div className={`kpi-card ${isOverdue ? 'red' : 'orange'}`}>
          <div className="kpi-label">Due Date</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>
            {order.due_date ? dayjs(order.due_date).format('MM/DD/YYYY') : '—'}
          </div>
          <div className="kpi-sub">{isOverdue ? 'Past due' : 'Target completion'}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Contracted Rate</div>
          <div className="kpi-value">
            {order.contracted_rate != null ? `$${Number(order.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div className="kpi-sub">Monthly rate</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Circuits on Order</div>
          <div className="kpi-value">{circuits.length}</div>
          <div className="kpi-sub">Linked circuit changes</div>
        </div>
      </div>

      {/* Editable Order Details */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Order Details</span>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Field label="Order Number *">
            <input className="form-input" value={form.order_number} onChange={e => set('order_number', e.target.value)} />
          </Field>

          <Field label="Vendor Account *">
            <select className="form-input" value={form.accounts_id} onChange={e => set('accounts_id', e.target.value)}>
              <option value="">Select vendor…</option>
              {accounts.map(a => <option key={a.accounts_id} value={a.accounts_id}>{a.name}</option>)}
            </select>
          </Field>

          <Field label="Description">
            <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this order" />
          </Field>

          <Field label="Contract">
            <select className="form-input" value={form.contracts_id || ''} onChange={e => set('contracts_id', e.target.value || null)}>
              <option value="">None</option>
              {contracts.map(c => <option key={c.contracts_id} value={c.contracts_id}>{c.contract_number}</option>)}
            </select>
          </Field>

          <Field label="Order Date">
            <input className="form-input" type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
          </Field>

          <Field label="Due Date">
            <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </Field>

          <Field label="Contracted Rate ($/mo)">
            <input className="form-input" type="number" step="0.01" value={form.contracted_rate} onChange={e => set('contracted_rate', e.target.value)} />
          </Field>

          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Notes">
              <textarea className="form-input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes about this order…" style={{ resize: 'vertical' }} />
            </Field>
          </div>

        </div>
      </div>

      {/* Circuit Change Orders */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Network size={16} color="#7c3aed" /> Circuit Change Orders
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {circuits.length} circuit{circuits.length !== 1 ? 's' : ''} linked to this order
          </span>
        </div>

        {circuits.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Network size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No circuits linked to this order</div>
            <div style={{ fontSize: 11 }}>Circuits are linked by setting their "Linked Order" field on the Circuit Detail page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Circuit ID</th>
                <th>Vendor</th>
                <th>Location</th>
                <th>Type</th>
                <th>Bandwidth</th>
                <th>Contracted Rate</th>
                <th>Install Date</th>
                <th>Disconnect Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {circuits.map(ci => (
                <tr key={ci.circuits_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/circuits/${ci.circuits_id}`)}>{ci.circuit_number}</span>
                  </td>
                  <td>{ci.account_name}</td>
                  <td>{ci.location || '—'}</td>
                  <td>{ci.type || '—'}</td>
                  <td>{ci.bandwidth || '—'}</td>
                  <td style={{ fontWeight: 700 }}>
                    {ci.contracted_rate != null
                      ? `$${Number(ci.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td>{ci.install_date ? dayjs(ci.install_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{ci.disconnect_date ? dayjs(ci.disconnect_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>
                    <span className={CIRC_STATUS_BADGE[ci.status] || 'badge badge-gray'}>{ci.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NoteTimeline entityType="order" entityId={id} />
    </div>
  );
}
