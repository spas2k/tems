import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Save, Network, ExternalLink, SlidersHorizontal, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAccount, updateAccount, getAccountCircuits } from '../api';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';
import dayjs from 'dayjs';

const VENDOR_TYPES = ['AT&T', 'Comcast', 'Verizon', 'Lumen', 'Spectrum', 'Other'];

const CIRC_STATUS_BADGE = {
  Active:       'badge badge-green',
  Pending:      'badge badge-blue',
  Disconnected: 'badge badge-gray',
  Suspended:    'badge badge-orange',
};

const NAV_SECTIONS = [
  { key: 'details',  label: 'Account Details', Icon: SlidersHorizontal },
  { key: 'circuits', label: 'Circuits',         Icon: Network           },
  { key: 'notes',    label: 'Notes & History',  Icon: MessageSquare     },
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

export default function AccountDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('accounts', 'update');
  const [account,  setAccount]  = useState(null);
  const [circuits, setCircuits] = useState([]);
  const [form,     setForm]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty,    setDirty]    = useState(false);
  const [toast,    setToast]    = useState(null);
  const refs = { details: useRef(null), circuits: useRef(null), notes: useRef(null) };
  const scrollTo = key => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getAccount(id), getAccountCircuits(id)])
      .then(([ac, ci]) => {
        setAccount(ac.data);
        setPageTitle(ac.data.name);
        setCircuits(ci.data);
        setForm({
          name:           ac.data.name           || '',
          account_number: ac.data.account_number || '',
          vendor_type:    ac.data.vendor_type    || 'Other',
          contact_email:  ac.data.contact_email  || '',
          contact_phone:  ac.data.contact_phone  || '',
          status:         ac.data.status         || 'Active',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (account?.name) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/accounts/${id}`, label: account.name, type: 'account' }
      }));
    }
  }, [account]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAccount(id, form);
      setAccount(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Account saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading account…</div>;
  if (!account) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Account not found.</div>;

  const activeCircuits = circuits.filter(c => c.status === 'Active');
  const totalMRC = activeCircuits.reduce((s, c) => s + Number(c.contracted_rate || 0), 0);

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

      {/* Header bar */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/accounts')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{account.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {account.vendor_type}{account.account_number ? ` · Acct #${account.account_number}` : ''}
              </div>
            </div>
          </div>
          <span className={account.status === 'Active' ? 'badge badge-green' : 'badge badge-gray'}>
            {account.status}
          </span>
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
        </div>
      </DetailHeader>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Circuits</div>
          <div className="kpi-value">{circuits.length}</div>
          <div className="kpi-icon"><Network size={36} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active Circuits</div>
          <div className="kpi-value">{activeCircuits.length}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Pending / Suspended</div>
          <div className="kpi-value">
            {circuits.filter(c => c.status === 'Pending' || c.status === 'Suspended').length}
          </div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Monthly MRC</div>
          <div className="kpi-value">${totalMRC.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="kpi-sub">Active circuits only</div>
        </div>
      </div>

      {/* Editable Account Details */}
      <div className="page-card" ref={refs.details} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Account Details</span>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Field label="Vendor Name *">
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>

          <Field label="Account Number">
            <input className="form-input" value={form.account_number} onChange={e => set('account_number', e.target.value)} />
          </Field>

          <Field label="Vendor Type">
            <select className="form-input" value={form.vendor_type} onChange={e => set('vendor_type', e.target.value)}>
              {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>

          <Field label="Contact Email">
            <input className="form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="billing@vendor.com" />
          </Field>

          <Field label="Contact Phone">
            <input className="form-input" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="(800) 555-0100" />
          </Field>

        </div>
      </div>

      {/* Circuits Table */}
      <div className="page-card" ref={refs.circuits} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span
            className="rc-results-count"
            style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate('/circuits', { state: { filters: { account_name: account.name }, showFilters: true } })}
            title="View all circuits for this account"
          >
            <Network size={16} color="#7c3aed" /> Circuits on This Account
            <ExternalLink size={12} color="#94a3b8" />
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {circuits.length} circuit{circuits.length !== 1 ? 's' : ''}
          </span>
        </div>

        {circuits.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Network size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No circuits linked to this account</div>
            <div style={{ fontSize: 11 }}>Add circuits from the Circuits page and assign them to this vendor.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Circuit ID</th>
                <th>Location</th>
                <th>Type</th>
                <th>Bandwidth</th>
                <th>Contract</th>
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
                  <td>{ci.location || '—'}</td>
                  <td>{ci.type || '—'}</td>
                  <td>{ci.bandwidth || '—'}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{ci.contract_number || '—'}</td>
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

      <div ref={refs.notes} style={{ scrollMarginTop: 80 }}>
        <NoteTimeline entityType="account" entityId={id} />
        <ChangeHistory resource="accounts" resourceId={id} refreshKey={historyKey} />
      </div>
    </div>
  );
}
