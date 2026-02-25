import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Save, Network, ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getContract, updateContract, getContractCircuits, getContractOrders, getAccounts,
} from '../api';
import dayjs from 'dayjs';

const STATUSES = ['Active', 'Pending', 'Expired', 'Terminated'];

const STATUS_BADGE = {
  Active:     'badge badge-green',
  Pending:    'badge badge-blue',
  Expired:    'badge badge-gray',
  Terminated: 'badge badge-red',
};
const CIRC_STATUS_BADGE = {
  Active:       'badge badge-green',
  Pending:      'badge badge-blue',
  Disconnected: 'badge badge-gray',
  Suspended:    'badge badge-orange',
};
const ORD_STATUS_BADGE = {
  'In Progress': 'badge badge-blue',
  Completed:     'badge badge-green',
  Cancelled:     'badge badge-gray',
  Pending:       'badge badge-orange',
};

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function ContractDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);

  const [contract, setContract] = useState(null);
  const [circuits, setCircuits] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getContract(id),
      getContractCircuits(id),
      getContractOrders(id),
      getAccounts(),
    ]).then(([co, ci, or_, ac]) => {
      const c = co.data;
      setContract(c);
      setPageTitle(c.contract_number || c.name);
      setCircuits(ci.data);
      setOrders(or_.data);
      setAccounts(ac.data);
      setForm({
        account_id:      c.account_id      || '',
        name:            c.name            || '',
        contract_number: c.contract_number || '',
        start_date:      c.start_date      ? c.start_date.split('T')[0] : '',
        end_date:        c.end_date        ? c.end_date.split('T')[0]   : '',
        contracted_rate: c.contracted_rate != null ? c.contracted_rate : '',
        rate_unit:       c.rate_unit       || '',
        term_months:     c.term_months     || '',
        status:          c.status          || 'Active',
        auto_renew:      !!c.auto_renew,
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateContract(id, form);
      setContract(updated.data);
      setDirty(false);
      showToast('Contract saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading contract…</div>;
  if (!contract) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Contract not found.</div>;

  const daysToExpiry = contract.end_date
    ? Math.ceil((new Date(contract.end_date) - new Date()) / 86400000)
    : null;
  const expiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 90;
  const expired = daysToExpiry !== null && daysToExpiry <= 0;

  const totalMRC = circuits
    .filter(c => c.status === 'Active')
    .reduce((s, c) => s + Number(c.contracted_rate || 0), 0);

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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', padding: '14px 20px', borderRadius: 12,
        border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.075)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/contracts')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={18} color="#0d9488" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                {contract.contract_number || contract.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {contract.account_name}{contract.name ? ` · ${contract.name}` : ''}
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[contract.status] || 'badge badge-gray'}>{contract.status}</span>
          {contract.auto_renew === 1 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#0f766e', background: '#ccfbf1', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              <RefreshCw size={10} /> Auto-Renew
            </span>
          )}
          {expiringSoon && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#c2410c', background: '#ffedd5', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              <AlertTriangle size={11} /> Expires in {daysToExpiry}d
            </span>
          )}
          {expired && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#dc2626', background: '#fee2e2', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              <AlertTriangle size={11} /> Expired
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
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card teal">
          <div className="kpi-label">Contracted Rate</div>
          <div className="kpi-value">
            {contract.contracted_rate != null
              ? `$${Number(contract.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : '—'}
          </div>
          <div className="kpi-sub">{contract.rate_unit || 'Per period'}</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Term</div>
          <div className="kpi-value">{contract.term_months ? `${contract.term_months} mo` : '—'}</div>
          <div className="kpi-sub">
            {contract.end_date
              ? (expired ? 'Expired' : expiringSoon ? `${daysToExpiry} days left` : `Expires ${dayjs(contract.end_date).format('MM/DD/YYYY')}`)
              : 'No end date'}
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Circuits</div>
          <div className="kpi-value">{circuits.length}</div>
          <div className="kpi-sub">MRC ${totalMRC.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-label">Orders</div>
          <div className="kpi-value">{orders.length}</div>
          <div className="kpi-sub">{orders.filter(o => o.status === 'In Progress').length} in progress</div>
        </div>
      </div>

      {/* Editable Contract Details */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Contract Details</span>
          {dirty && (
            <span style={{ fontSize: 11, color: '#f59e0b', background: '#fef3c7', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
              Unsaved changes
            </span>
          )}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Field label="Contract Name *">
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>

          <Field label="Contract Number">
            <input className="form-input" value={form.contract_number} onChange={e => set('contract_number', e.target.value)} />
          </Field>

          <Field label="Vendor Account *">
            <select className="form-input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
              <option value="">Select vendor…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>

          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Start Date">
            <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </Field>

          <Field label="End Date">
            <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </Field>

          <Field label="Contracted Rate ($)">
            <input className="form-input" type="number" step="0.01" value={form.contracted_rate} onChange={e => set('contracted_rate', e.target.value)} />
          </Field>

          <Field label="Rate Unit">
            <input className="form-input" value={form.rate_unit} onChange={e => set('rate_unit', e.target.value)} placeholder="e.g. /month, /year" />
          </Field>

          <Field label="Term (months)">
            <input className="form-input" type="number" value={form.term_months} onChange={e => set('term_months', e.target.value)} />
          </Field>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox" id="ar" checked={!!form.auto_renew}
                onChange={e => set('auto_renew', e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="ar" style={{ fontSize: 13, color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                Auto-Renew
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* Circuits on this Contract */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Network size={16} color="#7c3aed" /> Circuits on This Contract
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{circuits.length} circuit{circuits.length !== 1 ? 's' : ''}</span>
        </div>
        {circuits.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Network size={22} style={{ marginBottom: 8, opacity: 0.35 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No circuits linked to this contract</div>
            <div style={{ fontSize: 11 }}>Assign circuits to this contract from the Circuit Detail page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Circuit ID</th><th>Vendor</th><th>Location</th><th>Type</th>
                <th>Bandwidth</th><th>Contracted Rate</th><th>Install Date</th><th>Disconnect Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {circuits.map(ci => (
                <tr key={ci.id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/circuits/${ci.id}`)}>{ci.circuit_id}</span>
                  </td>
                  <td>{ci.account_name}</td>
                  <td>{ci.location || '—'}</td>
                  <td>{ci.type || '—'}</td>
                  <td>{ci.bandwidth || '—'}</td>
                  <td style={{ fontWeight: 700 }}>
                    {ci.contracted_rate != null ? `$${Number(ci.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td>{ci.install_date ? dayjs(ci.install_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{ci.disconnect_date ? dayjs(ci.disconnect_date).format('MM/DD/YYYY') : '—'}</td>
                  <td><span className={CIRC_STATUS_BADGE[ci.status] || 'badge badge-gray'}>{ci.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Orders on this Contract */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={16} color="#d97706" /> Orders on This Contract
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <ShoppingCart size={22} style={{ marginBottom: 8, opacity: 0.35 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No orders linked to this contract</div>
            <div style={{ fontSize: 11 }}>Assign orders to this contract from the Order Detail page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th><th>Vendor</th><th>Description</th>
                <th>Order Date</th><th>Due Date</th><th>Rate</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>{o.order_number}</span>
                  </td>
                  <td>{o.account_name}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 13 }}>{o.description || '—'}</td>
                  <td>{o.order_date ? dayjs(o.order_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{o.due_date ? dayjs(o.due_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ fontWeight: 700 }}>
                    {o.contracted_rate != null ? `$${Number(o.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td><span className={ORD_STATUS_BADGE[o.status] || 'badge badge-gray'}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
