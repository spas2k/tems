import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocation, updateLocation } from '../api';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';

const SITE_TYPES = ['Data Center', 'Office', 'Remote', 'Warehouse', 'Colocation', 'Other'];

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function LocationDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('accounts', 'update');

  const [location, setLocation] = useState(null);
  const [form,     setFormData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty,    setDirty]    = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    getLocation(id)
      .then(res => {
        const d = res.data;
        setLocation(d);
        setPageTitle(d.name);
        setFormData({
          name:          d.name          || '',
          site_code:     d.site_code     || '',
          site_type:     d.site_type     || 'Office',
          address:       d.address       || '',
          city:          d.city          || '',
          state:         d.state         || '',
          zip:           d.zip           || '',
          country:       d.country       || 'USA',
          contact_name:  d.contact_name  || '',
          contact_phone: d.contact_phone || '',
          contact_email: d.contact_email || '',
          status:        d.status        || 'Active',
          notes:         d.notes         || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (location?.name) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/locations/${id}`, label: location.name, type: 'location' }
      }));
    }
  }, [location]);

  const set = (k, v) => { setFormData(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateLocation(id, form);
      setLocation(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Location saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading location…</div>;
  if (!location) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Location not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#dcfce7' : '#fee2e2',
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/locations')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={18} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{location.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {location.site_type}{location.site_code ? ` · ${location.site_code}` : ''}
                {location.city ? ` · ${location.city}, ${location.state}` : ''}
              </div>
            </div>
          </div>
          <span className={location.status === 'Active' ? 'badge badge-green' : 'badge badge-gray'}>
            {location.status}
          </span>
        </div>
        {canUpdate && (
          <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </DetailHeader>

      {/* Location Details */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Location Details</span>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Site Name *">
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Site Code">
            <input className="form-input" value={form.site_code} onChange={e => set('site_code', e.target.value)} />
          </Field>
          <Field label="Site Type">
            <select className="form-input" value={form.site_type} onChange={e => set('site_type', e.target.value)}>
              {SITE_TYPES.map(t => <option key={t}>{t}</option>)}
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

      {/* Address */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Address</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Street Address">
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
            </Field>
          </div>
          <Field label="City">
            <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
          </Field>
          <Field label="State">
            <input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} />
          </Field>
          <Field label="ZIP Code">
            <input className="form-input" value={form.zip} onChange={e => set('zip', e.target.value)} />
          </Field>
          <Field label="Country">
            <input className="form-input" value={form.country} onChange={e => set('country', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Contact */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Contact</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Contact Name">
            <input className="form-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          </Field>
          <Field label="Contact Phone">
            <input className="form-input" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Contact Email">
              <input className="form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Notes</span>
        </div>
        <div style={{ padding: 20 }}>
          <textarea className="form-input" rows={4} value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Additional notes about this location…" />
        </div>
      </div>

      <NoteTimeline entityType="location" entityId={id} />
      <ChangeHistory resource="locations" resourceId={id} refreshKey={historyKey} />
    </div>
  );
}
