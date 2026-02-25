import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { getContracts, createContract, updateContract, deleteContract, getAccounts } from '../api';
import Modal from '../components/Modal';

const STATUSES = ['Active', 'Pending', 'Expired', 'Terminated'];
const STATUS_BADGE = { Active: 'badge badge-green', Pending: 'badge badge-blue', Expired: 'badge badge-gray', Terminated: 'badge badge-red' };

const EMPTY = { account_id: '', name: '', contract_number: '', start_date: '', end_date: '', contracted_rate: '', rate_unit: '', term_months: '', status: 'Active', auto_renew: false };

export default function Contracts() {
  const navigate = useNavigate();
  const [data, setData]         = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [toast, setToast]       = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getContracts(), getAccounts()])
      .then(([c, a]) => { setData(c.data); setAccounts(a.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, account_id: accounts[0]?.id || '' }); setModal(true); };
  const openEdit = rec => {
    setEditing(rec);
    setForm({ ...rec, start_date: rec.start_date?.split('T')[0] || '', end_date: rec.end_date?.split('T')[0] || '' });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await updateContract(editing.id, form);
      else await createContract(form);
      setModal(false); load(); showToast(editing ? 'Contract updated.' : 'Contract created.');
    } catch { showToast('Save failed.', false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this contract?')) return;
    try { await deleteContract(id); load(); showToast('Contract deleted.'); }
    catch { showToast('Delete failed.', false); }
  };

  const active = data.filter(d => d.status === 'Active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card teal"><div className="kpi-label">Total Contracts</div><div className="kpi-value">{data.length}</div><div className="kpi-icon"><FileText size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Active</div><div className="kpi-value">{active}</div></div>
        <div className="kpi-card orange"><div className="kpi-label">Expiring Soon</div><div className="kpi-value">{data.filter(d => { if (!d.end_date) return false; const days = (new Date(d.end_date) - new Date()) / 86400000; return days > 0 && days <= 90; }).length}</div><div className="kpi-sub">Within 90 days</div></div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>All Contracts</span>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Contract</button>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr>
              <th>Vendor</th><th>Contract #</th><th>Name</th><th>Start Date</th><th>End Date</th><th>Rate</th><th>Term</th><th>Auto-Renew</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.account_name}</td>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/contracts/${row.id}`)}>{row.contract_number || row.name}</span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: 13 }}>{row.name}</td>
                  <td>{row.start_date?.split('T')[0] || '—'}</td>
                  <td>{row.end_date?.split('T')[0] || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{row.contracted_rate != null ? `$${Number(row.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td>{row.term_months ? `${row.term_months} mo` : '—'}</td>
                  <td>{row.auto_renew ? <span className="badge badge-teal">Yes</span> : <span className="badge badge-gray">No</span>}</td>
                  <td><span className={STATUS_BADGE[row.status] || 'badge badge-gray'}>{row.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(row)}><Pencil size={13} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(row.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} title={editing ? 'Edit Contract' : 'New Contract'} onClose={() => setModal(false)} onSave={handleSave}>
        <div><label className="form-label">Vendor Account *</label>
          <select className="form-input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
            <option value="">Select vendor…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div><label className="form-label">Contract Number</label><input className="form-input" value={form.contract_number} onChange={e => set('contract_number', e.target.value)} /></div>
          <div><label className="form-label">Contract Name</label><input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Start Date</label><input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
          <div><label className="form-label">End Date</label><input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Contracted Rate ($)</label><input className="form-input" type="number" step="0.01" value={form.contracted_rate} onChange={e => set('contracted_rate', e.target.value)} /></div>
          <div><label className="form-label">Rate Unit</label><input className="form-input" value={form.rate_unit} onChange={e => set('rate_unit', e.target.value)} placeholder="e.g. /month, /year" /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Term (months)</label><input className="form-input" type="number" value={form.term_months} onChange={e => set('term_months', e.target.value)} /></div>
          <div><label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="ar" checked={!!form.auto_renew} onChange={e => set('auto_renew', e.target.checked)} style={{ width: 16, height: 16 }} />
          <label htmlFor="ar" style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Auto-Renew</label>
        </div>
      </Modal>
    </div>
  );
}
