import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Landmark, Save, Network, ShoppingCart,
  FileText, ScrollText, AlertTriangle, CreditCard,
  MessageSquare, SlidersHorizontal, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getVendor, updateVendor, getVendorInventory,
  getContracts, getOrders, getInvoices, getDisputes, getVendorRemits,
} from '../api';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';
import dayjs from 'dayjs';

const SERVICE_TYPES = ['Telecom', 'ISP', 'Wireless', 'Fiber/Colocation', 'Fiber/Small Cell', 'SD-WAN/Carrier', 'ISP/Cable', 'Other'];

const BADGE = {
  Active:        'badge badge-green',
  Pending:       'badge badge-blue',
  Disconnected:  'badge badge-gray',
  Suspended:     'badge badge-orange',
  Inactive:      'badge badge-gray',
  Paid:          'badge badge-green',
  Unpaid:        'badge badge-orange',
  Overdue:       'badge badge-red',
  Disputed:      'badge badge-orange',
  Completed:     'badge badge-green',
  Cancelled:     'badge badge-gray',
  'In Progress': 'badge badge-blue',
  Open:          'badge badge-blue',
  Resolved:      'badge badge-green',
  Closed:        'badge badge-gray',
};

const NAV_SECTIONS = [
  { key: 'details',   label: 'Vendor Details',     Icon: SlidersHorizontal },
  { key: 'inventory',  label: 'Inventory',            Icon: Network           },
  { key: 'contracts', label: 'Contracts',           Icon: ScrollText        },
  { key: 'orders',    label: 'Orders',              Icon: ShoppingCart      },
  { key: 'invoices',  label: 'Invoices',            Icon: FileText          },
  { key: 'disputes',  label: 'Disputes',            Icon: AlertTriangle     },
  { key: 'remit',     label: 'Remit / Payment Info',Icon: CreditCard        },
  { key: 'notes',     label: 'Notes',               Icon: MessageSquare     },
];

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function SectionCard({ title, count, icon: Icon, iconColor, children, sectionRef, navigatePath, navFilters }) {
  const nav = useNavigate();
  const isLink = !!navigatePath;
  return (
    <div className="page-card" ref={sectionRef} style={{ scrollMarginTop: 80 }}>
      <div className="page-card-header">
        <span
          className="rc-results-count"
          style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: isLink ? 'pointer' : 'default' }}
          onClick={isLink ? () => nav(navigatePath, { state: { filters: navFilters, showFilters: true } }) : undefined}
          title={isLink ? `View all in table with filters applied` : undefined}
        >
          {Icon && <Icon size={16} color={iconColor || '#64748b'} />}
          {title}
          {isLink && <ExternalLink size={12} color="#94a3b8" />}
        </span>
        {count !== undefined && (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {count} record{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, label, sub }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
      {Icon && <Icon size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} strokeWidth={1.5} />}
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

const NAV_BTN = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 6, border: 'none',
  background: 'transparent', cursor: 'pointer', color: '#cbd5e1',
  transition: 'background 0.15s, color 0.15s',
};

function NavIcon({ label, Icon, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={label}
      onClick={onClick}
      style={{ ...NAV_BTN, background: hover ? 'rgba(255,255,255,0.15)' : 'transparent', color: hover ? '#f8fafc' : '#cbd5e1' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Icon size={15} />
    </button>
  );
}

export default function VendorDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('accounts', 'update');

  const [vendor,    setVendor]    = useState(null);
  const [form,      setForm]      = useState(null);
  const [inventory,  setInventory]  = useState([]);
  const [contracts, setContracts] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [disputes,  setDisputes]  = useState([]);
  const [remit,     setRemit]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty,     setDirty]     = useState(false);
  const [toast,     setToast]     = useState(null);

  const refs = {
    details:   useRef(null),
    inventory:  useRef(null),
    contracts: useRef(null),
    orders:    useRef(null),
    invoices:  useRef(null),
    disputes:  useRef(null),
    remit:     useRef(null),
    notes:     useRef(null),
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const scrollTo = (key) => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getVendor(id),
      getVendorInventory(id),
      getContracts({ vendors_id: id }),
      getOrders({ vendors_id: id }),
      getInvoices({ vendors_id: id }),
      getDisputes({ vendors_id: id }),
      getVendorRemits({ vendors_id: id }),
    ]).then(([vd, ci, co, or_, inv, dis, rem]) => {
      setVendor(vd.data);
      setPageTitle(vd.data.name);
      setInventory(ci.data);
      setContracts(co.data);
      setOrders(or_.data);
      setInvoices(inv.data);
      setDisputes(dis.data);
      setRemit(rem.data);
      setForm({
        name:           vd.data.name           || '',
        account_number: vd.data.account_number || '',
        vendor_type:    vd.data.vendor_type    || 'Other',
        contact_name:   vd.data.contact_name   || '',
        contact_email:  vd.data.contact_email  || '',
        contact_phone:  vd.data.contact_phone  || '',
        status:         vd.data.status         || 'Active',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (vendor?.name) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/vendors/${id}`, label: vendor.name, type: 'vendor' }
      }));
    }
  }, [vendor]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateVendor(id, form);
      setVendor(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Vendor saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading vendor…</div>;
  if (!vendor)  return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Vendor not found.</div>;

  const activeInventory  = inventory.filter(c => c.status === 'Active');
  const totalMRC        = activeInventory.reduce((s, c) => s + Number(c.contracted_rate || 0), 0);
  const activeContracts = contracts.filter(c => c.status === 'Active');
  const openInvoices    = invoices.filter(i => i.status === 'Unpaid' || i.status === 'Overdue');
  const openOrders      = orders.filter(o => o.status === 'Pending' || o.status === 'In Progress');
  const openDisputes    = disputes.filter(d => d.status === 'Open');

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

      {/* Header */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendors')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Landmark size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{vendor.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {vendor.vendor_type}{vendor.account_number ? ` · Acct #${vendor.account_number}` : ''}
              </div>
            </div>
          </div>
          <span className={vendor.status === 'Active' ? 'badge badge-green' : 'badge badge-gray'}>
            {vendor.status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Section navigation icons */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 6px',
          }}>
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
        </div>
      </DetailHeader>

      {/* KPI Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Inventory</div>
          <div className="kpi-value">{inventory.length}</div>
          <div className="kpi-icon"><Network size={36} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active Inventory</div>
          <div className="kpi-value">{activeInventory.length}</div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Monthly MRC</div>
          <div className="kpi-value">${totalMRC.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="kpi-sub">Active inventory only</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Active Contracts</div>
          <div className="kpi-value">{activeContracts.length}</div>
          <div className="kpi-sub">of {contracts.length} total</div>
        </div>
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card orange">
          <div className="kpi-label">Open Invoices</div>
          <div className="kpi-value">{openInvoices.length}</div>
          <div className="kpi-sub">of {invoices.length} total</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Open Orders</div>
          <div className="kpi-value">{openOrders.length}</div>
          <div className="kpi-sub">of {orders.length} total</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Open Disputes</div>
          <div className="kpi-value">{openDisputes.length}</div>
          <div className="kpi-sub">of {disputes.length} total</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Remit Accounts</div>
          <div className="kpi-value">{remit.length}</div>
          <div className="kpi-sub">Payment instructions</div>
        </div>
      </div>

      {/* ── Vendor Details ── */}
      <SectionCard title="Vendor Details" icon={SlidersHorizontal} iconColor="#3b82f6" sectionRef={refs.details}>
        <div style={{ padding: 20 }}>
          {dirty && <div style={{ marginBottom: 12 }}><span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span></div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Vendor Name *">
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Account Number">
              <input className="form-input" value={form.account_number} onChange={e => set('account_number', e.target.value)} />
            </Field>
            <Field label="Service Type">
              <select className="form-input" value={form.vendor_type} onChange={e => set('vendor_type', e.target.value)}>
                {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
            <Field label="Contact Name">
              <input className="form-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Primary contact" />
            </Field>
            <Field label="Contact Phone">
              <input className="form-input" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="(800) 555-0100" />
            </Field>
            <Field label="Contact Email">
              <input className="form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="billing@vendor.com" />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── Inventory ── */}
      <SectionCard title="Inventory" icon={Network} iconColor="#7c3aed" count={inventory.length} sectionRef={refs.inventory}
        navigatePath="/inventory" navFilters={{ account_name: vendor.name }}>
        {inventory.length === 0 ? (
          <EmptyState icon={Network} label="No inventory linked to this vendor" sub="Add inventory from the Inventory page and assign them to this vendor." />
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>InventoryItem ID</th><th>Location</th><th>Type</th><th>Bandwidth</th>
              <th>Contract</th><th>Contracted Rate</th><th>Install Date</th><th>Status</th>
            </tr></thead>
            <tbody>
              {inventory.map(ci => (
                <tr key={ci.inventory_id}>
                  <td><span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/inventory/${ci.inventory_id}`)}>{ci.inventory_number}</span></td>
                  <td>{ci.location || '—'}</td>
                  <td>{ci.type || '—'}</td>
                  <td>{ci.bandwidth || '—'}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{ci.contract_number || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{ci.contracted_rate != null ? `$${Number(ci.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td>{ci.install_date ? dayjs(ci.install_date).format('MM/DD/YYYY') : '—'}</td>
                  <td><span className={BADGE[ci.status] || 'badge badge-gray'}>{ci.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Contracts ── */}
      <SectionCard title="Contracts" icon={ScrollText} iconColor="#0891b2" count={contracts.length} sectionRef={refs.contracts}
        navigatePath="/contracts" navFilters={{ account_name: vendor.name }}>
        {contracts.length === 0 ? (
          <EmptyState icon={ScrollText} label="No contracts for this vendor" sub="Contracts linked to this vendor will appear here." />
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Contract #</th><th>Name</th><th>Start Date</th><th>End Date</th>
              <th>Rate</th><th>Term</th><th>Status</th>
            </tr></thead>
            <tbody>
              {contracts.map(co => (
                <tr key={co.contracts_id}>
                  <td><span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/contracts/${co.contracts_id}`)}>{co.contract_number}</span></td>
                  <td>{co.name || '—'}</td>
                  <td>{co.start_date ? dayjs(co.start_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{co.end_date ? dayjs(co.end_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ fontWeight: 700 }}>{co.contracted_rate != null ? `$${Number(co.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })} /${co.rate_unit || 'mo'}` : '—'}</td>
                  <td>{co.term_months ? `${co.term_months} mo` : '—'}</td>
                  <td><span className={BADGE[co.status] || 'badge badge-gray'}>{co.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Orders ── */}
      <SectionCard title="Orders" icon={ShoppingCart} iconColor="#16a34a" count={orders.length} sectionRef={refs.orders}
        navigatePath="/orders" navFilters={{ account_name: vendor.name }}>
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} label="No orders for this vendor" sub="Orders placed with this vendor will appear here." />
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Order #</th><th>Description</th><th>Order Date</th><th>Due Date</th>
              <th>Rate</th><th>Status</th>
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.orders_id}>
                  <td><span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.orders_id}`)}>{o.order_number}</span></td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description || '—'}</td>
                  <td>{o.order_date ? dayjs(o.order_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{o.due_date ? dayjs(o.due_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ fontWeight: 700 }}>{o.contracted_rate != null ? `$${Number(o.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td><span className={BADGE[o.status] || 'badge badge-gray'}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Invoices ── */}
      <SectionCard title="Invoices" icon={FileText} iconColor="#d97706" count={invoices.length} sectionRef={refs.invoices}
        navigatePath="/invoices" navFilters={{ account_name: vendor.name }}>
        {invoices.length === 0 ? (
          <EmptyState icon={FileText} label="No invoices from this vendor" sub="Invoices received from this vendor will appear here." />
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Invoice Date</th><th>Due Date</th>
              <th>Period</th><th>Total</th><th>Status</th>
            </tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.invoices_id}>
                  <td><span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.invoices_id}`)}>{inv.invoice_number}</span></td>
                  <td>{inv.invoice_date ? dayjs(inv.invoice_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{inv.due_date ? dayjs(inv.due_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {inv.period_start ? dayjs(inv.period_start).format('MM/DD') : '—'} – {inv.period_end ? dayjs(inv.period_end).format('MM/DD') : '—'}
                  </td>
                  <td style={{ fontWeight: 700 }}>{inv.total_amount != null ? `$${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td><span className={BADGE[inv.status] || 'badge badge-gray'}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Disputes ── */}
      <SectionCard title="Disputes" icon={AlertTriangle} iconColor="#dc2626" count={disputes.length} sectionRef={refs.disputes}
        navigatePath="/disputes" navFilters={{ account_name: vendor.name }}>
        {disputes.length === 0 ? (
          <EmptyState icon={AlertTriangle} label="No disputes for this vendor" sub="Disputes linked to this vendor will appear here." />
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Type</th><th>Description</th>
              <th>Amount</th><th>Filed</th><th>Status</th>
            </tr></thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.disputes_id}>
                  <td><span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/disputes/${d.disputes_id}`)}>{d.invoice_number || '—'}</span></td>
                  <td>{d.dispute_type || '—'}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{d.dispute_amount != null ? `$${Number(d.dispute_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td>{d.filed_date ? dayjs(d.filed_date).format('MM/DD/YYYY') : '—'}</td>
                  <td><span className={BADGE[d.status] || 'badge badge-gray'}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Vendor Remit ── */}
      <SectionCard title="Remit / Payment Info" icon={CreditCard} iconColor="#7c3aed" count={remit.length} sectionRef={refs.remit}
        navigatePath="/vendor-remit" navFilters={{ vendor_name: vendor.name }}>
        {remit.length === 0 ? (
          <EmptyState icon={CreditCard} label="No remit information on file" sub="Add payment remittance info from the Vendor Remit page." />
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Remit Name</th><th>Code</th><th>Payment Method</th>
              <th>Bank Name</th><th>Routing #</th><th>Address</th><th>Status</th>
            </tr></thead>
            <tbody>
              {remit.map(r => (
                <tr key={r.vendor_remit_id}>
                  <td style={{ fontWeight: 700 }}>{r.remit_name}</td>
                  <td>{r.remit_code || '—'}</td>
                  <td>{r.payment_method || '—'}</td>
                  <td>{r.bank_name || '—'}</td>
                  <td>{r.routing_number || '—'}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {[r.remit_address, r.remit_city, r.remit_state, r.remit_zip].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td><span className={BADGE[r.status] || 'badge badge-gray'}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── Notes ── */}
      <div ref={refs.notes} style={{ scrollMarginTop: 80 }}>
        <NoteTimeline entityType="vendor" entityId={id} />
        <ChangeHistory resource="accounts" resourceId={id} refreshKey={historyKey} />
      </div>
    </div>
  );
}
