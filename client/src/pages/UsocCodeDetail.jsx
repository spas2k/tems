import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Save, FileText } from 'lucide-react';
import { getUsocCode, updateUsocCode, getContractRates } from '../api';
import DetailHeader from '../components/DetailHeader';
import ChangeHistory from '../components/ChangeHistory';
import dayjs from 'dayjs';

const CATEGORIES = ['Access', 'Transport', 'Wireless', 'Feature', 'Surcharge'];
const STATUSES   = ['Active', 'Inactive'];
const STATUS_BADGE = { Active: 'badge badge-green', Inactive: 'badge badge-gray' };

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function UsocCodeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);

  const [usoc, setUsoc] = useState(null);
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsocCode(id),
      getContractRates({ usoc_codes_id: id }),
    ]).then(([u, r]) => {
      const c = u.data;
      setUsoc(c);
      setPageTitle(c.usoc_code);
      setRates(r.data);
      setForm({
        usoc_code:    c.usoc_code || '',
        description:  c.description || '',
        category:     c.category || 'Access',
        sub_category: c.sub_category || '',
        default_mrc:  c.default_mrc != null ? c.default_mrc : '',
        default_nrc:  c.default_nrc != null ? c.default_nrc : '',
        unit:         c.unit || '',
        status:       c.status || 'Active',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateUsocCode(id, form);
      setUsoc(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('USOC code saved successfully.');
    } catch { showToast('Save failed.', false); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading USOC code…</div>;
  if (!usoc) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>USOC code not found.</div>;

  const fmt = n => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>{toast.msg}</div>}

      {/* Header bar */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/usoc-codes')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={15} /> Back</button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{usoc.usoc_code}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{usoc.description} · {usoc.category}</div>
            </div>
          </div>
          <span className={STATUS_BADGE[usoc.status] || 'badge badge-gray'}>{usoc.status}</span>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </DetailHeader>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card purple">
          <div className="kpi-label">Default MRC</div>
          <div className="kpi-value">{fmt(usoc.default_mrc)}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Default NRC</div>
          <div className="kpi-value">{fmt(usoc.default_nrc)}</div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Contract Rates</div>
          <div className="kpi-value">{rates.length}</div>
          <div className="kpi-sub">{rates.length} rate{rates.length !== 1 ? 's' : ''} using this USOC</div>
        </div>
      </div>

      {/* Editable details */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>USOC Code Details</span>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="USOC Code *"><input className="form-input" value={form.usoc_code} onChange={e => set('usoc_code', e.target.value)} /></Field>
          <Field label="Category">
            <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Description"><input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} /></Field>
          <Field label="Sub-Category"><input className="form-input" value={form.sub_category} onChange={e => set('sub_category', e.target.value)} /></Field>
          <Field label="Default MRC ($)"><input className="form-input" type="number" step="0.01" value={form.default_mrc} onChange={e => set('default_mrc', e.target.value)} /></Field>
          <Field label="Default NRC ($)"><input className="form-input" type="number" step="0.01" value={form.default_nrc} onChange={e => set('default_nrc', e.target.value)} /></Field>
          <Field label="Unit"><input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="Each" /></Field>
          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Contract Rates using this USOC */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="#0d9488" /> Contract Rates Using This USOC
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{rates.length} rate{rates.length !== 1 ? 's' : ''}</span>
        </div>
        {rates.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <FileText size={22} style={{ marginBottom: 8, opacity: 0.35 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No contract rates reference this USOC code</div>
            <div style={{ fontSize: 11 }}>Add rates from the Contract Detail page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract</th><th>Account</th><th>MRC</th><th>NRC</th><th>Effective</th><th>Expiration</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.contract_rates_id}>
                  <td><span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/contracts/${r.contracts_id}`)}>{r.contract_number || r.contract_name}</span></td>
                  <td>{r.account_name || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(r.mrc)}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(r.nrc)}</td>
                  <td>{r.effective_date ? dayjs(r.effective_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{r.expiration_date ? dayjs(r.expiration_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ChangeHistory resource="usoc_codes" resourceId={id} refreshKey={historyKey} />
    </div>
  );
}
