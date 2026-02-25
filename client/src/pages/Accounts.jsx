import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../api';
import Modal from '../components/Modal';

const VENDOR_TYPES = ['AT&T', 'Comcast', 'Verizon', 'Lumen', 'Spectrum', 'Other'];
const STATUS_BADGE = { Active: 'badge badge-green', Inactive: 'badge badge-gray' };

const EMPTY = { name: '', account_number: '', vendor_type: 'AT&T', contact_name: '', contact_email: '', contact_phone: '', status: 'Active', notes: '' };

export default function Accounts() {
  const navigate = useNavigate();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [toast, setToast]     = useState(null);

  const load = () => { setLoading(true); getAccounts().then(r => setData(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const openNew = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = rec => { setEditing(rec); setForm({ ...rec }); setModal(true); };

  const handleSave = async () => {
    try {
      if (editing) await updateAccount(editing.id, form);
      else await createAccount(form);
      setModal(false); load(); showToast(editing ? 'Account updated.' : 'Account created.');
    } catch { showToast('Save failed.', false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this account?')) return;
    try { await deleteAccount(id); load(); showToast('Account deleted.'); }
    catch { showToast('Delete failed.', false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          {toast.msg}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Accounts</div>
          <div className="kpi-value">{data.length}</div>
          <div className="kpi-icon"><Building2 size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{data.filter(d => d.status === 'Active').length}</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value">{data.filter(d => d.status === 'Inactive').length}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>All Vendor Accounts</span>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Account</button>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Vendor Name</th><th>Account #</th><th>Type</th><th>Contact</th><th>Email</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/accounts/${row.id}`)}>{row.name}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{row.account_number}</td>
                  <td>{row.vendor_type}</td>
                  <td>{row.contact_name || '—'}</td>
                  <td style={{ color: '#3b82f6' }}>{row.contact_email || '—'}</td>
                  <td><span className={STATUS_BADGE[row.status] || 'badge badge-gray'}>{row.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={13} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(row.id)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} title={editing ? 'Edit Account' : 'New Vendor Account'} onClose={() => setModal(false)} onSave={handleSave}>
        <div><label className="form-label">Vendor Name *</label><input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="form-row">
          <div><label className="form-label">Account Number</label><input className="form-input" value={form.account_number} onChange={e => set('account_number', e.target.value)} /></div>
          <div><label className="form-label">Vendor Type</label>
            <select className="form-input" value={form.vendor_type} onChange={e => set('vendor_type', e.target.value)}>
              {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Contact Name</label><input className="form-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
          <div><label className="form-label">Contact Phone</label><input className="form-input" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} /></div>
        </div>
        <div><label className="form-label">Contact Email</label><input className="form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} /></div>
        <div><label className="form-label">Status</label>
          <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option>Active</option><option>Inactive</option>
          </select>
        </div>
        <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </Modal>
    </div>
  );
}
