import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getVendorRemit, updateVendorRemit, getVendors } from '../api';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';

const PAYMENT_METHODS = ['ACH', 'Check', 'Wire', 'EFT', 'Credit Card'];

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function VendorRemitDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('vendors', 'update');

  const [remit,   setRemit]   = useState(null);
  const [vendors, setVendors] = useState([]);
  const [form,    setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty,   setDirty]   = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getVendorRemit(id), getVendors()])
      .then(([r, v]) => {
        const d = r.data;
        setRemit(d);
        setVendors(v.data || []);
        setPageTitle(d.remit_name);
        setFormData({
          remit_name:          d.remit_name          || '',
          vendors_id:         String(d.vendors_id  || ''),
          remit_code:          d.remit_code          || '',
          payment_method:      d.payment_method      || 'ACH',
          bank_name:           d.bank_name           || '',
          routing_number:      d.routing_number      || '',
          bank_vendor_number: d.bank_vendor_number || '',
          remit_address:       d.remit_address       || '',
          remit_city:          d.remit_city          || '',
          remit_state:         d.remit_state         || '',
          remit_zip:           d.remit_zip           || '',
          status:              d.status              || 'Active',
          notes:               d.notes               || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (remit?.remit_name) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/vendor-remit/${id}`, label: remit.remit_name, type: 'remit' }
      }));
    }
  }, [remit]);

  const set = (k, v) => { setFormData(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateVendorRemit(id, form);
      setRemit(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Remit record saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading remit record…</div>;
  if (!remit)  return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Remit record not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? 'var(--bg-success)' : 'var(--bg-error)',
          color: toast.ok ? 'var(--text-success)' : 'var(--text-error)',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendor-remit')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--icon-bg-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{remit.remit_name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {remit.vendor_name}{remit.payment_method ? ` · ${remit.payment_method}` : ''}
              </div>
            </div>
          </div>
          <span className={remit.status === 'Active' ? 'badge badge-green' : 'badge badge-gray'}>
            {remit.status}
          </span>
        </div>
        {canUpdate && (
          <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </DetailHeader>

      {/* Remittance Details */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Remittance Details</span>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Remit Name *">
              <input className="form-input" value={form.remit_name} onChange={e => set('remit_name', e.target.value)} />
            </Field>
          </div>
          <Field label="Vendor">
            <select className="form-input" value={form.vendors_id} onChange={e => set('vendors_id', e.target.value)}>
              <option value="">— Select Vendor —</option>
              {vendors.map(v => <option key={v.vendors_id} value={String(v.vendors_id)}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Remit Code">
            <input className="form-input" value={form.remit_code} onChange={e => set('remit_code', e.target.value)} />
          </Field>
          <Field label="Payment Method">
            <select className="form-input" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Bank Information */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Bank Information</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Bank Name">
            <input className="form-input" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
          </Field>
          <Field label="Routing Number (ABA)">
            <input className="form-input" value={form.routing_number} onChange={e => set('routing_number', e.target.value)} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Vendor Number">
              <input className="form-input" value={form.bank_vendor_number} onChange={e => set('bank_vendor_number', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Remit Address */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Remit Address</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Street Address">
              <input className="form-input" value={form.remit_address} onChange={e => set('remit_address', e.target.value)} />
            </Field>
          </div>
          <Field label="City">
            <input className="form-input" value={form.remit_city} onChange={e => set('remit_city', e.target.value)} />
          </Field>
          <Field label="State">
            <input className="form-input" value={form.remit_state} onChange={e => set('remit_state', e.target.value)} />
          </Field>
          <Field label="ZIP Code">
            <input className="form-input" value={form.remit_zip} onChange={e => set('remit_zip', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Notes */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Notes</span>
        </div>
        <div style={{ padding: 20 }}>
          <textarea className="form-input" rows={4} value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Additional remittance notes…" />
        </div>
      </div>

      <NoteTimeline entityType="vendor_remit" entityId={id} />
      <ChangeHistory resource="vendor_remit" resourceId={id} refreshKey={historyKey} />
    </div>
  );
}
