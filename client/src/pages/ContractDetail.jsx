import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Save, Network, ShoppingCart, AlertTriangle, RefreshCw, Plus, Pencil, Trash2, Tag, ExternalLink, SlidersHorizontal, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getContract, updateContract, getContractInventory, getContractOrders, getVendors,
  getContractRates, getUsocCodes, createContractRate, updateContractRate, deleteContractRate,
  getContracts,
} from '../api';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';
import Modal from '../components/Modal';
import dayjs from 'dayjs';
import { useConfirm } from '../context/ConfirmContext';
import LookupField from '../components/LookupField';
import { LOOKUP_VENDORS, LOOKUP_CONTRACTS, LOOKUP_CURRENCIES } from '../utils/lookupConfigs';

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

const NAV_SECTIONS = [
  { key: 'details',  label: 'Contract Details', Icon: SlidersHorizontal },
  { key: 'inventory', label: 'Inventory',          Icon: Network           },
  { key: 'rates',    label: 'Rate Schedule',     Icon: Tag               },
  { key: 'orders',   label: 'Orders',            Icon: ShoppingCart      },
  { key: 'notes',    label: 'Notes & History',   Icon: MessageSquare     },
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

export default function ContractDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('contracts', 'update');

  const [contract, setContract] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [vendors, setVendors] = useState([]);
  const [contractsList, setContractsList] = useState([]);
  const [rates,    setRates]    = useState([]);
  const [usocCodes, setUsocCodes] = useState([]);

  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [dirty,   setDirty]   = useState(false);
  const [toast,   setToast]   = useState(null);
  const refs = { details: useRef(null), inventory: useRef(null), rates: useRef(null), orders: useRef(null), notes: useRef(null) };
  const scrollTo = key => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const [rateModal, setRateModal]     = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const EMPTY_RATE = { usoc_codes_id: '', mrc: '', nrc: '', effective_date: '', expiration_date: '', notes: '' };
  const [rateForm, setRateForm]       = useState(EMPTY_RATE);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getContract(id),
      getContractInventory(id),
      getContractOrders(id),
      getVendors(),
      getContracts().catch(() => ({ data: [] })),
      getContractRates({ contracts_id: id }).catch(() => ({ data: [] })),
      getUsocCodes().catch(() => ({ data: [] })),
    ]).then(([co, ci, or_, v, conList, rt, uc]) => {
      const c = co.data;
      setContract(c);
      setPageTitle(c.contract_number || c.contract_name);
      setInventory(ci.data);
      setOrders(or_.data);
      setVendors(v.data);
      setContractsList(conList.data);
      setRates(rt.data);
      setUsocCodes(uc.data);
      setForm({
        vendors_id:      c.vendors_id      || '',
        parent_contract_id: c.parent_contract_id || '',
        currency_id:     c.currency_id     || '',
        contract_name:   c.contract_name   || '',
        contract_number: c.contract_number || '',
        type:            c.type            || '',
        subtype:         c.subtype         || '',
        start_date:      c.start_date      ? c.start_date.split('T')[0] : '',
        expiration_date: c.expiration_date ? c.expiration_date.split('T')[0] : '',
        contracted_rate: c.contracted_rate != null ? c.contracted_rate : '',
        rate_unit:       c.rate_unit       || '',
        term_months:     c.term_months     || '',
        term_type:       c.term_type       || '',
        minimum_spend:   c.minimum_spend != null ? c.minimum_spend : '',
        etf_amount:      c.etf_amount != null ? c.etf_amount : '',
        commitment_type: c.commitment_type || '',
        contract_value:  c.contract_value != null ? c.contract_value : '',
        tax_assessed:    c.tax_assessed != null ? c.tax_assessed : '',
        business_line:   c.business_line   || '',
        status:          c.status          || 'Active',
        auto_renew:      !!c.auto_renew,
      });
    }).catch(err => {
      console.error('Failed to load contract:', err);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (contract?.contract_number || contract?.contract_name) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/contracts/${id}`, label: contract.contract_number || contract.contract_name, type: 'contract' }
      }));
    }
  }, [contract]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateContract(id, form);
      setContract(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Contract saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading contract…</div>;
  if (!contract) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Contract not found.</div>;

  const setR = (k, v) => setRateForm(p => ({ ...p, [k]: v }));
  const openNewRate  = () => { setEditingRate(null); setRateForm({ ...EMPTY_RATE, usoc_codes_id: usocCodes[0]?.usoc_codes_id || '' }); setRateModal(true); };
  const openEditRate = r => { setEditingRate(r); setRateForm({ usoc_codes_id: r.usoc_codes_id, mrc: r.mrc ?? '', nrc: r.nrc ?? '', effective_date: r.effective_date?.split('T')[0] || '', expiration_date: r.expiration_date?.split('T')[0] || '', notes: r.notes || '' }); setRateModal(true); };
  const refreshRates = () => getContractRates({ contracts_id: id }).then(r => setRates(r.data));
  const saveRate = async () => {
    try {
      const payload = { ...rateForm, contracts_id: id };
      if (editingRate) await updateContractRate(editingRate.contract_rates_id, payload);
      else await createContractRate(payload);
      setRateModal(false); refreshRates(); showToast(editingRate ? 'Rate updated.' : 'Rate added.');
    } catch { showToast('Save failed.', false); }
  };
  const deleteRate = async rId => {
    if (!(await confirm('Delete this rate?'))) return;
    try { await deleteContractRate(rId); refreshRates(); showToast('Rate deleted.'); }
    catch { showToast('Delete failed.', false); }
  };

  const daysToExpiry = contract.expiration_date
    ? Math.ceil((new Date(contract.expiration_date) - new Date()) / 86400000)
    : null;
  const expiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 90;
  const expired = daysToExpiry !== null && daysToExpiry <= 0;

  const totalMRC = inventory
    .filter(c => c.status === 'Active')
    .reduce((s, c) => s + Number(c.contracted_rate || 0), 0);

  const vendorName = vendors.find(v => v.vendors_id === contract.vendors_id)?.name || '—';

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
            onClick={() => navigate('/contracts')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--icon-bg-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={18} color="#0d9488" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>
                {contract.contract_number || contract.contract_name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {vendorName}{contract.contract_name ? ` · ${contract.contract_name}` : ''}
              </div>
            </div>
          </div>
          <span className={STATUS_BADGE[contract.status] || 'badge badge-gray'}>{contract.status}</span>
          {contract.auto_renew === 1 && (
            <span className="badge-auto-renew">
              <RefreshCw size={10} /> Auto-Renew
            </span>
          )}
          {expiringSoon && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-color)', background: 'var(--bg-warn)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              <AlertTriangle size={11} /> Expires in {daysToExpiry}d
            </span>
          )}
          {expired && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-error)', background: 'var(--bg-error)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              <AlertTriangle size={11} /> Expired
            </span>
          )}
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
            {contract.expiration_date
              ? (expired ? 'Expired' : expiringSoon ? `${daysToExpiry} days left` : `Expires ${dayjs(contract.expiration_date).format('MM/DD/YYYY')}`)
              : 'No end date'}
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Inventory</div>
          <div className="kpi-value">{inventory.length}</div>
          <div className="kpi-sub">MRC ${totalMRC.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-label">Orders</div>
          <div className="kpi-value">{orders.length}</div>
          <div className="kpi-sub">{orders.filter(o => o.status === 'In Progress').length} in progress</div>
        </div>
      </div>

      {/* Editable Contract Details */}
      <div className="page-card" ref={refs.details} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Contract Details</span>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Field label="Contract Name *">
            <input className="form-input" value={form.contract_name} onChange={e => set('contract_name', e.target.value)} />
          </Field>

          <Field label="Contract Number">
            <input className="form-input" value={form.contract_number} onChange={e => set('contract_number', e.target.value)} />
          </Field>

          <Field label="Vendor *">
            <LookupField
              {...LOOKUP_VENDORS(vendors)}
              value={form.vendors_id}
              onChange={row => set('vendors_id', row.vendors_id)}
              onClear={() => set('vendors_id', '')}
              displayValue={vendors.find(v => v.vendors_id === form.vendors_id)?.name}
            />
          </Field>

          <Field label="Status">
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Type">
            <input className="form-input" value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Service Agreement" />
          </Field>

          <Field label="Subtype">
            <input className="form-input" value={form.subtype} onChange={e => set('subtype', e.target.value)} placeholder="e.g. Telecommunications" />
          </Field>

          <Field label="Parent Contract">
            <LookupField
              {...LOOKUP_CONTRACTS(contractsList)}
              value={form.parent_contract_id}
              onChange={row => set('parent_contract_id', row.contracts_id)}
              onClear={() => set('parent_contract_id', '')}
              displayValue={contractsList.find(c => c.contracts_id === form.parent_contract_id)?.contract_number}
            />
          </Field>

          <Field label="Currency">
            <LookupField
              {...LOOKUP_CURRENCIES([])}
              value={form.currency_id}
              onChange={row => set('currency_id', row.currency_id)}
              onClear={() => set('currency_id', '')}
              displayValue={form.currency_id}
            />
          </Field>

          <Field label="Start Date">
            <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </Field>

          <Field label="Expiration Date">
            <input className="form-input" type="date" value={form.expiration_date} onChange={e => set('expiration_date', e.target.value)} />
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

          <Field label="Term Type">
            <input className="form-input" value={form.term_type} onChange={e => set('term_type', e.target.value)} placeholder="e.g. Fixed, Auto-Renewal" />
          </Field>

          <Field label="Minimum Spend ($)">
            <input className="form-input" type="number" step="0.01" value={form.minimum_spend} onChange={e => set('minimum_spend', e.target.value)} />
          </Field>

          <Field label="ETF Amount ($)">
            <input className="form-input" type="number" step="0.01" value={form.etf_amount} onChange={e => set('etf_amount', e.target.value)} />
          </Field>

          <Field label="Contract Value ($)">
            <input className="form-input" type="number" step="0.01" value={form.contract_value} onChange={e => set('contract_value', e.target.value)} />
          </Field>

          <Field label="Tax Assessed ($)">
            <input className="form-input" type="number" step="0.01" value={form.tax_assessed} onChange={e => set('tax_assessed', e.target.value)} />
          </Field>

          <Field label="Commitment Type">
            <select className="form-input" value={form.commitment_type} onChange={e => set('commitment_type', e.target.value)}>
              <option value="">None</option>
              <option value="Volume">Volume</option>
              <option value="Revenue">Revenue</option>
              <option value="Term">Term</option>
            </select>
          </Field>

          <Field label="Business Line">
            <input className="form-input" value={form.business_line} onChange={e => set('business_line', e.target.value)} placeholder="e.g. Operations, IT" />
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

      {/* Inventory on this Contract */}
      <div className="page-card" ref={refs.inventory} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span
            className="rc-results-count"
            style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate('/inventory', { state: { filters: { vendor_name: vendorName }, showFilters: true } })}
            title="View all inventory for this vendor"
          >
            <Network size={16} color="#7c3aed" /> Inventory on This Contract
            <ExternalLink size={12} color="#94a3b8" />
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{inventory.length} inventoryItem{inventory.length !== 1 ? 's' : ''}</span>
        </div>
        {inventory.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Network size={22} style={{ marginBottom: 8, opacity: 0.35 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No inventory linked to this contract</div>
            <div style={{ fontSize: 11 }}>Assign inventory to this contract from the InventoryItem Detail page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>InventoryItem ID</th><th>Vendor</th><th>Location</th><th>Type</th>
                <th>Bandwidth</th><th>Contracted Rate</th><th>Install Date</th><th>Disconnect Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(ci => (
                <tr key={ci.inventory_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/inventory/${ci.inventory_id}`)}>{ci.inventory_number}</span>
                  </td>
                  <td>{vendorName}</td>
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

      {/* Rate Schedule */}
      <div className="page-card" ref={refs.rates} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} color="#7c3aed" /> Rate Schedule
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{rates.length} rate{rates.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-primary" onClick={openNewRate} style={{ fontSize: 12 }}><Plus size={14} /> Add Rate</button>
          </div>
        </div>
        {rates.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Tag size={22} style={{ marginBottom: 8, opacity: 0.35 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No rates defined yet</div>
            <div style={{ fontSize: 11 }}>Add USOC-based rates to this contract's rate schedule.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>USOC Code</th><th>Description</th><th>Category</th><th>MRC</th><th>NRC</th><th>Effective</th><th>Expiration</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.contract_rates_id}>
                  <td><span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/usoc-codes/${r.usoc_codes_id}`)}>{r.usoc_code}</span></td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.usoc_description || '—'}</td>
                  <td><span className="badge badge-purple">{r.usoc_category}</span></td>
                  <td style={{ fontWeight: 700 }}>{r.mrc != null ? `$${Number(r.mrc).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td style={{ fontWeight: 700 }}>{r.nrc != null ? `$${Number(r.nrc).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td>{r.effective_date ? dayjs(r.effective_date).format('MM/DD/YYYY') : '—'}</td>
                  <td>{r.expiration_date ? dayjs(r.expiration_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ color: '#94a3b8', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditRate(r)}><Pencil size={13} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteRate(r.contract_rates_id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Orders on this Contract */}
      <div className="page-card" ref={refs.orders} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span
            className="rc-results-count"
            style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => navigate('/orders', { state: { filters: { vendor_name: vendorName }, showFilters: true } })}
            title="View all orders for this vendor"
          >
            <ShoppingCart size={16} color="#d97706" /> Orders on This Contract
            <ExternalLink size={12} color="#94a3b8" />
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
                <tr key={o.orders_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.orders_id}`)}>{o.order_number}</span>
                  </td>
                  <td>{vendorName}</td>
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

      {/* Rate Modal */}
      <Modal open={rateModal} title={editingRate ? 'Edit Rate' : 'Add Rate'} onClose={() => setRateModal(false)} onSave={saveRate}>
        <div><label className="form-label">USOC Code *</label>
          <select className="form-input" value={rateForm.usoc_codes_id} onChange={e => setR('usoc_codes_id', e.target.value)}>
            <option value="">Select USOC…</option>
            {usocCodes.map(u => <option key={u.usoc_codes_id} value={u.usoc_codes_id}>{u.usoc_code} — {u.description}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div><label className="form-label">MRC ($)</label><input className="form-input" type="number" step="0.01" value={rateForm.mrc} onChange={e => setR('mrc', e.target.value)} /></div>
          <div><label className="form-label">NRC ($)</label><input className="form-input" type="number" step="0.01" value={rateForm.nrc} onChange={e => setR('nrc', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Effective Date</label><input className="form-input" type="date" value={rateForm.effective_date} onChange={e => setR('effective_date', e.target.value)} /></div>
          <div><label className="form-label">Expiration Date</label><input className="form-input" type="date" value={rateForm.expiration_date} onChange={e => setR('expiration_date', e.target.value)} /></div>
        </div>
        <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={rateForm.notes} onChange={e => setR('notes', e.target.value)} /></div>
      </Modal>

      <div ref={refs.notes} style={{ scrollMarginTop: 80 }}>
        <NoteTimeline entityType="contract" entityId={id} />
        <ChangeHistory resource="contracts" resourceId={id} refreshKey={historyKey} />
      </div>
    </div>
  );
}
