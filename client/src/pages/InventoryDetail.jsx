/**
 * @file Inventory item detail page with related invoices.
 * @module InventoryDetail
 *
 * Shows inventory item info with account/contract/order lookups, related invoices, notes, and change history.
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Network, Save, Receipt, ShoppingCart, AlertTriangle, ExternalLink, SlidersHorizontal, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DetailHeader from '../components/DetailHeader';
import MultiStatusSlider from '../components/MultiStatusSlider';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';
import {
  getInventoryItem, updateInventoryItem,
  getInventoryItemInvoices,
  getAccounts, getContracts, getOrders, getOrder, getLocations,
} from '../api';
import LookupField from '../components/LookupField';
import { LOOKUP_ACCOUNTS, LOOKUP_CONTRACTS, LOOKUP_ORDERS, LOOKUP_LOCATION_TEXT } from '../utils/lookupConfigs';
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
  { key: 'details',  label: 'InventoryItem Details', Icon: SlidersHorizontal },
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

export default function InventoryDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('inventory', 'update');

  const [inventoryItem,  setInventoryItem]  = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [order,    setOrder]    = useState(null);
  const [accounts,  setAccounts]  = useState([]);
  const [contracts, setContracts] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [locations, setLocations] = useState([]);

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

  const handleToggleActive = async (newStatus) => {
    setMenuOpen(false);
    const prev = form.status;
    setForm(f => ({ ...f, status: newStatus }));
    try {
      const updated = await updateInventoryItem(id, { ...form, status: newStatus });
      setInventoryItem(updated.data);
      setHistoryKey(k => k + 1);
      showToast(`Status changed to ${newStatus}.`);
    } catch {
      setForm(f => ({ ...f, status: prev }));
      showToast('Status update failed.', false);
    }
  };

  useEffect(() => {
    Promise.all([
      getInventoryItem(id),
      getInventoryItemInvoices(id),
      getAccounts(),
      getContracts(),
      getOrders(),
      getLocations(),
    ]).then(([ci, inv, ac, co, or_, locs]) => {
      const c = ci.data;
      setInventoryItem(c);
      setPageTitle(c.inventory_number);
      setInvoices(inv.data);
      setAccounts(ac.data);
      setContracts(co.data);
      setOrders(or_.data);
      setLocations(locs.data);
      setForm({
        accounts_id:      c.accounts_id || '',
        contracts_id:     c.contracts_id || '',
        orders_id:        c.orders_id || '',
        inventory_number:      c.inventory_number || '',
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
    if (inventoryItem?.inventory_number) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/inventory/${id}`, label: inventoryItem.inventory_number, type: 'inventoryItem' }
      }));
    }
  }, [inventoryItem]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateInventoryItem(id, form);
      setInventoryItem(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('InventoryItem saved successfully.');
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
    return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>Loading inventoryItem…</div>;
  }
  if (!inventoryItem) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444', fontSize: 15 }}>InventoryItem not found.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? 'var(--bg-success)' : 'var(--bg-error)',
          color: toast.ok ? 'var(--text-success)' : 'var(--text-error)',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      {/* Page header bar */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-back" onClick={() => navigate('/inventory')}>
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--icon-bg-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Network size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>
                {inventoryItem.inventory_number}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {inventoryItem.location || 'No location'} · {inventoryItem.account_name}
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[inventoryItem.status] || 'badge badge-gray'}>{inventoryItem.status}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 6px' }}>
            {NAV_SECTIONS.map(({ key, label, Icon }) => (
              <NavIcon key={key} label={label} Icon={Icon} onClick={() => scrollTo(key)} />
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
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
              title="InventoryItem options"
              onClick={() => setMenuOpen(v => !v)}
              style={{ ...NAV_BTN, background: menuOpen ? 'rgba(255,255,255,0.15)' : 'transparent', color: menuOpen ? '#f8fafc' : '#cbd5e1' }}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 220, zIndex: 9000, padding: '6px 0' }}>
                <MenuItem label={inventoryItem.status === 'Disconnected' ? 'Activate InventoryItem' : 'Disconnect InventoryItem'} onClick={handleToggleActive} />
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
          <div className="kpi-label">InventoryItem Type</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{inventoryItem.type || '—'}</div>
          <div className="kpi-sub">{inventoryItem.bandwidth || 'Bandwidth not set'}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Monthly Rate</div>
          <div className="kpi-value">
            {inventoryItem.contracted_rate != null ? `$${Number(inventoryItem.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div className="kpi-sub">Contracted rate</div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Invoices on File</div>
          <div className="kpi-value">{invoices.length}</div>
          <div className="kpi-sub">Linked via line items</div>
        </div>
      </div>

      {/* Editable InventoryItem Details */}
      <div className="page-card" ref={refs.details} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>InventoryItem Details</span>
          <MultiStatusSlider value={form.status} options={STATUSES} onChange={handleToggleActive} disabled={!canUpdate} />
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Field label="InventoryItem ID *">
            <input className="form-input" value={form.inventory_number} onChange={e => set('inventory_number', e.target.value)} />
          </Field>

          <div>
            <LookupField
              label="Vendor Account *"
              {...LOOKUP_ACCOUNTS(accounts)}
              value={form.accounts_id}
              onChange={row => set('accounts_id', row.accounts_id)}
              onClear={() => set('accounts_id', '')}
              displayValue={accounts.find(a => a.accounts_id === Number(form.accounts_id))?.name}
            />
          </div>

          <div>
            <LookupField
              label="Location"
              {...LOOKUP_LOCATION_TEXT(locations)}
              value={form.location}
              onChange={row => set('location', row.location_name)}
              onClear={() => set('location', '')}
              displayValue={form.location}
            />
          </div>

          <Field label="InventoryItem Type">
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

          <div>
            <LookupField
              label="Contract"
              {...LOOKUP_CONTRACTS(contracts)}
              value={form.contracts_id}
              onChange={row => set('contracts_id', row.contracts_id)}
              onClear={() => set('contracts_id', '')}
              displayValue={contracts.find(c => c.contracts_id === Number(form.contracts_id))?.contract_number}
            />
          </div>

          <div>
            <LookupField
              label="Linked Order"
              {...LOOKUP_ORDERS(orders)}
              value={form.orders_id}
              onChange={row => set('orders_id', row.orders_id)}
              onClear={() => set('orders_id', '')}
              displayValue={orders.find(o => o.orders_id === Number(form.orders_id))?.order_number}
            />
          </div>

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
            <div>No order linked to this inventoryItem.</div>
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
            onClick={() => navigate('/invoices', { state: { filters: { account_name: inventoryItem.account_name }, showFilters: true } })}
            title="View all invoices for this vendor"
          >
            <Receipt size={16} color="#2563eb" /> Invoices Containing This InventoryItem
            <ExternalLink size={12} color="#94a3b8" />
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Receipt size={20} style={{ marginBottom: 6 }} />
            <div>No invoices found for this inventoryItem.</div>
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
                <th>InventoryItem Charges</th>
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
                    ${Number(inv.inventoryItem_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
        <NoteTimeline entityType="inventoryItem" entityId={id} />
        <ChangeHistory resource="inventory" resourceId={id} refreshKey={historyKey} />
      </div>
    </div>
  );
}
