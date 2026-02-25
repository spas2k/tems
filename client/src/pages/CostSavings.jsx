import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { getCostSavings, createCostSaving, updateCostSaving, deleteCostSaving, getAccounts, getCircuits } from '../api';
import Modal from '../components/Modal';

const CATEGORIES = ['Billing Error', 'Contract Optimization', 'Disconnect', 'Rate Negotiation', 'Duplicate', 'Other'];
const STATUSES   = ['Identified', 'In Progress', 'Resolved'];
const STATUS_BADGE = { Identified: 'badge badge-orange', 'In Progress': 'badge badge-blue', Resolved: 'badge badge-green' };
const EMPTY = { account_id: '', circuit_id: '', category: 'Billing Error', description: '', projected_savings: '', realized_savings: '', status: 'Identified', identified_date: '', resolved_date: '', notes: '' };

export default function CostSavings() {
  const [data, setData]         = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [toast, setToast]       = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getCostSavings(), getAccounts(), getCircuits()])
      .then(([s, a, ci]) => { setData(s.data); setAccounts(a.data); setCircuits(ci.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, account_id: accounts[0]?.id || '' }); setModal(true); };
  const openEdit = rec => {
    setEditing(rec);
    setForm({ ...rec, identified_date: rec.identified_date?.split('T')[0] || '', resolved_date: rec.resolved_date?.split('T')[0] || '' });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await updateCostSaving(editing.id, form);
      else await createCostSaving(form);
      setModal(false); load(); showToast(editing ? 'Record updated.' : 'Opportunity created.');
    } catch { showToast('Save failed.', false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this record?')) return;
    try { await deleteCostSaving(id); load(); showToast('Record deleted.'); }
    catch { showToast('Delete failed.', false); }
  };

  const openCount      = data.filter(d => d.status === 'Identified').length;
  const totalProjected = data.reduce((s, d) => s + Number(d.projected_savings || 0), 0);
  const totalRealized  = data.reduce((s, d) => s + Number(d.realized_savings || 0), 0);
  const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>{toast.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card orange"><div className="kpi-label">Open Opportunities</div><div className="kpi-value">{openCount}</div><div className="kpi-icon"><Zap size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Projected Savings</div><div className="kpi-value">${fmt(totalProjected)}</div></div>
        <div className="kpi-card teal"><div className="kpi-label">Realized Savings</div><div className="kpi-value">${fmt(totalRealized)}</div></div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Savings Pipeline</span>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Opportunity</button>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr>
              <th>Vendor</th><th>Category</th><th>Description</th><th>Projected</th><th>Realized</th><th>Identified</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.account_name}</td>
                  <td><span className="badge badge-blue">{row.category}</span></td>
                  <td style={{ maxWidth: 200 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</span></td>
                  <td style={{ color: '#16a34a', fontWeight: 700 }}>${Number(row.projected_savings || 0).toLocaleString()}</td>
                  <td style={{ color: '#0d9488', fontWeight: 700 }}>{row.realized_savings != null ? `$${Number(row.realized_savings).toLocaleString()}` : '—'}</td>
                  <td style={{ color: '#64748b' }}>{row.identified_date?.split('T')[0] || '—'}</td>
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

      <Modal open={modal} title={editing ? 'Edit Record' : 'New Savings Opportunity'} onClose={() => setModal(false)} onSave={handleSave}>
        <div><label className="form-label">Vendor Account *</label>
          <select className="form-input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
            <option value="">Select vendor…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div><label className="form-label">Category</label>
            <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <div className="form-row">
          <div><label className="form-label">Projected Savings ($)</label><input className="form-input" type="number" step="0.01" value={form.projected_savings} onChange={e => set('projected_savings', e.target.value)} /></div>
          <div><label className="form-label">Realized Savings ($)</label><input className="form-input" type="number" step="0.01" value={form.realized_savings} onChange={e => set('realized_savings', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Identified Date</label><input className="form-input" type="date" value={form.identified_date} onChange={e => set('identified_date', e.target.value)} /></div>
          <div><label className="form-label">Resolved Date</label><input className="form-input" type="date" value={form.resolved_date} onChange={e => set('resolved_date', e.target.value)} /></div>
        </div>
        <div><label className="form-label">Related Circuit (optional)</label>
          <select className="form-input" value={form.circuit_id || ''} onChange={e => set('circuit_id', e.target.value || null)}>
            <option value="">None</option>
            {circuits.map(c => <option key={c.id} value={c.id}>{c.circuit_id} — {c.location}</option>)}
          </select>
        </div>
        <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </Modal>
    </div>
  );
}
