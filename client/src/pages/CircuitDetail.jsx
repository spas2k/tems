import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Network, Save, Receipt, ShoppingCart, AlertTriangle, ExternalLink, SlidersHorizontal, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';
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

const NAV_SECTIONS = [
  { key: 'details',  label: 'Circuit Details', Icon: SlidersHorizontal },
  { key: 'order',    label: 'Related Order',   Icon: ShoppingCart      },
  { key: 'invoices', label: 'Invoices',        Icon: Receipt           },
  { key: 'notes',    label: 'Notes & History', Icon: MessageSquare     },
];
const NAV_BTN = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 6, border: 'none',
  background: 'transparent', cursor: 'pointer', color: '#cbd5e1',
  transition: 'background 0.15s, color 0.15s',
};
function NavIcon({ label, Icon, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button title={label} onClick={onClick}
      style={{ ...NAV_BTN, background: hover ? 'rgba(255,255,255,0.15)' : 'transparent', color: hover ? '#f8fafc' : '#cbd5e1' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    ><Icon size={15} /></button>
  );
}

function MenuDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />;
}
function MenuItem({ label, onClick, stub = false }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '9px 16px', border: 'none',
        background: hover ? 'rgba(255,255,255,0.08)' : 'transparent',
        cursor: stub ? 'default' : 'pointer',
        color: stub ? '#64748b' : '#e2e8f0',
        fontSize: 13, fontWeight: 500,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >{label}</button>
  );
}

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
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('circuits', 'update');

  const [circuit,  setCircuit]  = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [order,    setOrder]    = useState(null);
  const [accounts,  setAccounts]  = useState([]);
  const [contracts, setContracts] = useState([]);
  const [orders,    setOrders]    = useState([]);

  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty,   setDirty]   = useState(false);
  const [toast,   setToast]   = useState(null);
  const refs = { details: useRef(null), order: useRef(null), invoices: useRef(null), notes: useRef(null) };
  const scrollTo = key => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggleActive = async () => {
    setMenuOpen(false);
    const newStatus = circuit.status === 'Disconnected' ? 'Active' : 'Disconnected';
    try {
      const updated = await updateCircuit(id, { ...form, status: newStatus });
      setCircuit(updated.data);
      setForm(f => ({ ...f, status: newStatus }));
      showToast(`Circuit ${newStatus === 'Active' ? 'activated' : 'disconnected'}.`);
    } catch { showToast('Status update failed.', false); }
  };

  useEffect(() => {
    Promise.all([
      getCircuit(id),
      getCircuitInvoices(id),
      getAccounts(),
      getContracts(),
      getOrders(),
    ]).then(([ci, inv, ac, co, or_]) => {
      const c = ci.data;
      setCircuit(c);
      setPageTitle(c.circuit_number);
      setInvoices(inv.data);
      setAccounts(ac.data);
      setContracts(co.data);
      setOrders(or_.data);
      setForm({
        accounts_id:      c.accounts_id || '',
        contracts_id:     c.contracts_id || '',
        orders_id:        c.orders_id || '',
        circuit_number:      c.circuit_number || '',
        type:            c.type || 'Internet',
        bandwidth:       c.bandwidth || '',
        location:        c.location || '',
        contracted_rate: c.contracted_rate != null ? c.contracted_rate : '',
        status:          c.status || 'Active',
        install_date:    c.install_date ? c.install_date.split('T')[0] : '',
        disconnect_date: c.disconnect_date ? c.disconnect_date.split('T')[0] : '',
      });
      // Fetch full order if linked
      if (c.orders_id) {
        getOrder(c.orders_id).then(r => setOrder(r.data)).catch(() => setOrder(null));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (circuit?.circuit_number) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/circuits/${id}`, label: circuit.circuit_number, type: 'circuit' }
      }));
    }
  }, [circuit]);

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
      setHistoryKey(k => k + 1);
      showToast('Circuit saved successfully.');
      // Reload order if order_id changed
      if (form.orders_id) {
        getOrder(form.orders_id).then(r => setOrder(r.data)).catch(() => setOrder(null));
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
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/circuits')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Network size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>
                {circuit.circuit_number}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {circuit.location || 'No location'} · {circuit.account_name}
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[circuit.status] || 'badge badge-gray'}>{circuit.status}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 6px' }}>
            {NAV_SECTIONS.map(({ key, label, Icon }) => (
              <NavIcon key={key} label={label} Icon={Icon} onClick={() => scrollTo(key)} />
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          {canUpdate && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!dirty || saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              title="Circuit options"
              onClick={() => setMenuOpen(v => !v)}
              style={{ ...NAV_BTN, background: menuOpen ? 'rgba(255,255,255,0.15)' : 'transparent', color: menuOpen ? '#f8fafc' : '#cbd5e1' }}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 220, zIndex: 9000, padding: '6px 0' }}>
                <MenuItem label={circuit.status === 'Disconnected' ? 'Activate Circuit' : 'Disconnect Circuit'} onClick={handleToggleActive} />
                <MenuDivider />
                <MenuItem label="Non-PO Edit" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Create Contract Mapping" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="TRR Field Updates" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Validate Asset" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Validate MRC" onClick={() => setMenuOpen(false)} stub />
              </div>
            )}
          </div>
        </div>
      </DetailHeader>

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
      <div className="page-card" ref={refs.details} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Circuit Details</span>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Field label="Circuit ID *">
            <input className="form-input" value={form.circuit_number} onChange={e => set('circuit_number', e.target.value)} />
          </Field>

          <Field label="Vendor Account *">
            <select className="form-input" value={form.accounts_id} onChange={e => set('accounts_id', e.target.value)}>
              <option value="">Select vendor…</option>
              {accounts.map(a => <option key={a.accounts_id} value={a.accounts_id}>{a.name}</option>)}
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
            <select className="form-input" value={form.contracts_id || ''} onChange={e => set('contracts_id', e.target.value || null)}>
              <option value="">None</option>
              {contracts.map(c => <option key={c.contracts_id} value={c.contracts_id}>{c.contract_number}</option>)}
            </select>
          </Field>

          <Field label="Linked Order">
            <select className="form-input" value={form.orders_id || ''} onChange={e => set('orders_id', e.target.value || null)}>
              <option value="">None</option>
              {orders.map(o => <option key={o.orders_id} value={o.orders_id}>{o.order_number} — {o.account_name || ''}</option>)}
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
      <div className="page-card" ref={refs.order} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/orders/${order.orders_id}`)}>{order.order_number}</span>
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
      <div className="page-card" ref={refs.invoices} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span
            className="rc-results-count"
            style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate('/invoices', { state: { filters: { account_name: circuit.account_name }, showFilters: true } })}
            title="View all invoices for this vendor"
          >
            <Receipt size={16} color="#2563eb" /> Invoices Containing This Circuit
            <ExternalLink size={12} color="#94a3b8" />
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
                <tr key={inv.invoices_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.invoices_id}`)}>{inv.invoice_number}</span>
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

      <div ref={refs.notes} style={{ scrollMarginTop: 80 }}>
        <NoteTimeline entityType="circuit" entityId={id} />
        <ChangeHistory resource="circuits" resourceId={id} refreshKey={historyKey} />
      </div>
    </div>
  );
}
