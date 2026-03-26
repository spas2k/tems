import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Save, SlidersHorizontal, ClipboardList } from 'lucide-react';
import { getDispute, updateDispute, getVendors, getInvoices } from '../api';
import LookupField from '../components/LookupField';
import { LOOKUP_VENDORS, LOOKUP_INVOICES } from '../utils/lookupConfigs';
import DetailHeader from '../components/DetailHeader';
import ChangeHistory from '../components/ChangeHistory';
import dayjs from 'dayjs';

const STATUSES = ['Open', 'Under Review', 'Credited', 'Denied', 'Closed'];
const TYPES = ['Overcharge', 'Duplicate Charge', 'Wrong Rate', 'Missing Credit', 'Service Not Delivered', 'Other'];

const STATUS_BADGE = {
  Open:           'badge badge-blue',
  'Under Review': 'badge badge-orange',
  Credited:       'badge badge-green',
  Denied:         'badge badge-red',
  Closed:         'badge badge-gray',
};

const NAV_SECTIONS = [
  { key: 'details', label: 'Dispute Details', Icon: SlidersHorizontal },
  { key: 'history', label: 'Change History',  Icon: ClipboardList     },
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

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function DisputeDetail() {
  const { id }   = useParams();
  const navigate  = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);

  const [dispute,  setDispute]  = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form,     setForm]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty,    setDirty]    = useState(false);
  const [toast,    setToast]    = useState(null);
  const refs = { details: useRef(null), history: useRef(null) };
  const scrollTo = key => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    setLoading(true);
    Promise.all([getDispute(id), getVendors(), getInvoices()])
      .then(([d, a, inv]) => {
        const rec = d.data;
        setDispute(rec);
        setAccounts(a.data);
        setInvoices(inv.data);
        setForm({
          ...rec,
          filed_date: rec.filed_date?.split('T')[0] || '',
          resolved_date: rec.resolved_date?.split('T')[0] || '',
        });
        setPageTitle(`Dispute ${rec.reference_number || '#' + rec.disputes_id}`);
      })
      .catch(() => setDispute(undefined))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.resolved_date) payload.resolved_date = null;
      if (!payload.credit_amount) payload.credit_amount = null;
      if (!payload.line_items_id) payload.line_items_id = null;
      const { data } = await updateDispute(id, payload);
      setDispute(data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Dispute saved.');
    } catch { showToast('Save failed.', false); }
    finally { setSaving(false); }
  };

  const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  /* ── Loading / error states ─────────── */
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (dispute === undefined) return (
    <div style={{ background: '#fee2e2', color: '#dc2626', padding: '16px 20px', borderRadius: 12, fontWeight: 600 }}>
      Dispute not found. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/disputes')} style={{ marginLeft: 8 }}>Back to Disputes</button>
    </div>
  );
  if (!form) return null;

  return (
    <>
      {toast && <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`}>{toast.msg}</div>}

      {/* Header */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/disputes')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={16} /> Back</button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={18} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>
                {dispute.reference_number || `Dispute #${dispute.disputes_id}`}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Filed {dayjs(dispute.filed_date).format('MMM D, YYYY')}
                {dispute.resolved_date && ` · Resolved ${dayjs(dispute.resolved_date).format('MMM D, YYYY')}`}
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[dispute.status] || 'badge badge-gray'}>{dispute.status}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 6px' }}>
            {NAV_SECTIONS.map(({ key, label, Icon }) => (
              <NavIcon key={key} label={label} Icon={Icon} onClick={() => scrollTo(key)} />
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!dirty || saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </DetailHeader>

      {/* Summary banner */}
      <div style={{
        background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginTop: 16, marginBottom: 16,
        display: 'flex', gap: 32, alignItems: 'center', border: '1px solid #334155',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>Disputed Amount</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fca5a5' }}>${fmt(dispute.amount)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>Credit Received</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#4ade80' }}>${fmt(dispute.credit_amount)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>Vendor</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{dispute.vendor_name || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>Invoice</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#93c5fd', cursor: 'pointer' }}
               onClick={() => dispute.invoices_id && navigate(`/invoices/${dispute.invoices_id}`)}>
            {dispute.invoice_number || '—'}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="page-card" ref={refs.details} style={{ padding: 20, scrollMarginTop: 80 }}>
        <div className="rc-results-count" style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Dispute Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Field label="Account">
            <LookupField
              {...LOOKUP_VENDORS(accounts)}
              value={form.vendors_id}
              onChange={row => set('vendors_id', row.vendors_id)}
              onClear={() => set('vendors_id', '')}
              displayValue={accounts.find(a => a.vendors_id === Number(form.vendors_id))?.name}
            />
          </Field>
          <Field label="Invoice">
            <LookupField
              {...LOOKUP_INVOICES(invoices)}
              value={form.invoices_id}
              onChange={row => set('invoices_id', row.invoices_id)}
              onClear={() => set('invoices_id', '')}
              displayValue={invoices.find(i => i.invoices_id === Number(form.invoices_id))?.invoice_number}
            />
          </Field>
          <Field label="Dispute Type">
            <select className="form-input" value={form.dispute_type} onChange={e => set('dispute_type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </Field>
          <Field label="Credit Amount">
            <input className="form-input" type="number" step="0.01" value={form.credit_amount || ''} onChange={e => set('credit_amount', e.target.value)} />
          </Field>
          <Field label="Filed Date">
            <input className="form-input" type="date" value={form.filed_date} onChange={e => set('filed_date', e.target.value)} />
          </Field>
          <Field label="Resolved Date">
            <input className="form-input" type="date" value={form.resolved_date || ''} onChange={e => set('resolved_date', e.target.value)} />
          </Field>
          <Field label="Reference #">
            <input className="form-input" value={form.reference_number || ''} onChange={e => set('reference_number', e.target.value)} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <Field label="Resolution Notes">
            <textarea className="form-input" rows={3} value={form.resolution_notes || ''} onChange={e => set('resolution_notes', e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea className="form-input" rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>
      </div>
      <div ref={refs.history} style={{ scrollMarginTop: 80 }}>
        <ChangeHistory resource="disputes" resourceId={id} refreshKey={historyKey} />
      </div>
    </>
  );
}
