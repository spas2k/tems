import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Network } from 'lucide-react';
import { getCircuits, createCircuit, updateCircuit, deleteCircuit, getAccounts, getContracts } from '../api';
import Modal from '../components/Modal';

const TYPES   = ['MPLS', 'Internet', 'Ethernet', 'Voice', 'SD-WAN', 'Dedicated', 'Other'];
const STATUSES = ['Active', 'Pending', 'Disconnected', 'Suspended'];
const STATUS_BADGE = { Active: 'badge badge-green', Pending: 'badge badge-blue', Disconnected: 'badge badge-gray', Suspended: 'badge badge-orange' };
const EMPTY = { account_id: '', contract_id: '', order_id: '', circuit_id: '', location: '', type: 'Internet', bandwidth: '', contracted_rate: '', install_date: '', status: 'Active' };

export default function Circuits() {
  const navigate = useNavigate();
  const [data, setData]         = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [toast, setToast]       = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getCircuits(), getAccounts(), getContracts()])
      .then(([ci, a, co]) => { setData(ci.data); setAccounts(a.data); setContracts(co.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, account_id: accounts[0]?.id || '' }); setModal(true); };
  const openEdit = rec => { setEditing(rec); setForm({ ...rec, type: rec.type || 'Internet', install_date: rec.install_date?.split('T')[0] || '', disconnect_date: rec.disconnect_date?.split('T')[0] || '' }); setModal(true); };

  const handleSave = async () => {
    try {
      if (editing) await updateCircuit(editing.id, form);
      else await createCircuit(form);
      setModal(false); load(); showToast(editing ? 'Circuit updated.' : 'Circuit created.');
    } catch { showToast('Save failed.', false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this circuit?')) return;
    try { await deleteCircuit(id); load(); showToast('Circuit deleted.'); }
    catch { showToast('Delete failed.', false); }
  };

  const totalMRC = data.filter(d => d.status === 'Active').reduce((s, d) => s + Number(d.contracted_rate || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>{toast.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card purple"><div className="kpi-label">Total Circuits</div><div className="kpi-value">{data.length}</div><div className="kpi-icon"><Network size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Active Circuits</div><div className="kpi-value">{data.filter(d => d.status === 'Active').length}</div></div>
        <div className="kpi-card blue"><div className="kpi-label">Monthly MRC</div><div className="kpi-value">${totalMRC.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div className="kpi-sub">Active circuits only</div></div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Circuit Inventory</span>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Circuit</button>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr>
              <th>Circuit ID</th><th>Vendor</th><th>Location</th><th>Type</th><th>Bandwidth</th><th>Monthly Cost</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/circuits/${row.id}`)}>{row.circuit_id}</span>
                  </td>
                  <td>{row.account_name}</td>
                  <td>{row.location}</td>
                  <td>{row.type}</td>
                  <td>{row.bandwidth || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{row.contracted_rate != null ? `$${Number(row.contracted_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
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

      <Modal open={modal} title={editing ? 'Edit Circuit' : 'New Circuit'} onClose={() => setModal(false)} onSave={handleSave}>
        <div className="form-row">
          <div><label className="form-label">Circuit ID *</label><input className="form-input" value={form.circuit_id} onChange={e => set('circuit_id', e.target.value)} /></div>
          <div><label className="form-label">Vendor Account *</label>
            <select className="form-input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
              <option value="">Select vendor…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div><label className="form-label">Location</label><input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} /></div>
        <div className="form-row">
          <div><label className="form-label">Circuit Type</label>
            <select className="form-input" value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="form-label">Bandwidth</label><input className="form-input" value={form.bandwidth} onChange={e => set('bandwidth', e.target.value)} placeholder="e.g. 100 Mbps" /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Contracted Rate ($)</label><input className="form-input" type="number" step="0.01" value={form.contracted_rate} onChange={e => set('contracted_rate', e.target.value)} /></div>
          <div><label className="form-label">Install Date</label><input className="form-input" type="date" value={form.install_date} onChange={e => set('install_date', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Contract (optional)</label>
            <select className="form-input" value={form.contract_id || ''} onChange={e => set('contract_id', e.target.value || null)}>
              <option value="">None</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number}</option>)}
            </select>
          </div>
          <div><label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
