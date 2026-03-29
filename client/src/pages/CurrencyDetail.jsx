import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCurrency, updateCurrency } from '../api';
import DetailHeader from '../components/DetailHeader';
import StatusToggle from '../components/StatusToggle';
import ChangeHistory from '../components/ChangeHistory';

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function CurrencyDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('currencies', 'update');

  const [currency,    setCurrency]    = useState(null);
  const [form,        setFormData]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [historyKey,  setHistoryKey]  = useState(0);
  const [dirty,       setDirty]       = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    getCurrency(id)
      .then(res => {
        const d = res.data;
        setCurrency(d);
        setPageTitle(d.name);
        setFormData({
          currency_code: d.currency_code || '',
          name:          d.name          || '',
          symbol:        d.symbol        || '',
          exchange_rate: d.exchange_rate != null ? d.exchange_rate : 1,
          status:        d.status        || 'Active',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => { setFormData(p => ({ ...p, [k]: v })); setDirty(true); };

  const toggleActive = async (v) => {
    const newStatus = v === 'Active' ? 'Active' : 'Inactive';
    try {
      const payload = { ...form, status: newStatus };
      const updated = await updateCurrency(id, payload);
      setCurrency(updated.data);
      setFormData(p => ({ ...p, status: newStatus }));
      setHistoryKey(k => k + 1);
      showToast(newStatus === 'Active' ? 'Currency activated.' : 'Currency deactivated.');
    } catch {
      showToast('Failed to update status.', false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCurrency(id, form);
      setCurrency(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Currency saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading currency…</div>;
  if (!currency) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Currency not found.</div>;

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
          <button className="btn-back" onClick={() => navigate('/currencies')}>
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--icon-bg-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{currency.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {currency.currency_code} · {currency.symbol}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
          {canUpdate && (
            <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </DetailHeader>

      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Currency Details</span>
          <StatusToggle value={form.status} onChange={toggleActive} disabled={!canUpdate} />
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Currency Code *">
            <input className="form-input" value={form.currency_code} onChange={e => set('currency_code', e.target.value)} />
          </Field>
          <Field label="Currency Name *">
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Symbol *">
            <input className="form-input" value={form.symbol} onChange={e => set('symbol', e.target.value)} />
          </Field>
          <Field label="Exchange Rate">
            <input className="form-input" type="number" step="0.000001" value={form.exchange_rate} onChange={e => set('exchange_rate', e.target.value)} />
          </Field>
        </div>
      </div>

      <ChangeHistory resource="currencies" resourceId={id} refreshKey={historyKey} />
    </div>
  );
}
