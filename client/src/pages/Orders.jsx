import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import { getOrders, createOrder, updateOrder, deleteOrder, getAccounts, getContracts, getCircuits } from '../api';
import Modal from '../components/Modal';

const STATUSES    = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const STATUS_BADGE = { Pending: 'badge badge-orange', 'In Progress': 'badge badge-blue', Completed: 'badge badge-green', Cancelled: 'badge badge-gray' };
const EMPTY = { account_id: '', contract_id: '', circuit_id: '', order_number: '', description: '', contracted_rate: '', status: 'Pending', order_date: '', due_date: '', notes: '' };

export default function Orders() {
  const navigate = useNavigate();
  const [data, setData]         = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [toast, setToast]       = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getOrders(), getAccounts(), getContracts(), getCircuits()])
      .then(([o, a, co, ci]) => { setData(o.data); setAccounts(a.data); setContracts(co.data); setCircuits(ci.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, account_id: accounts[0]?.id || '' }); setModal(true); };
  const openEdit = rec => {
    setEditing(rec);
    setForm({ ...rec, order_date: rec.order_date?.split('T')[0] || '', due_date: rec.due_date?.split('T')[0] || '' });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await updateOrder(editing.id, form);
      else await createOrder(form);
      setModal(false); load(); showToast(editing ? 'Order updated.' : 'Order created.');
    } catch { showToast('Save failed.', false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this order?')) return;
    try { await deleteOrder(id); load(); showToast('Order deleted.'); }
    catch { showToast('Delete failed.', false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>{toast.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card slate"><div className="kpi-label">Total Orders</div><div className="kpi-value">{data.length}</div><div className="kpi-icon"><ShoppingCart size={40} /></div></div>
        <div className="kpi-card orange"><div className="kpi-label">Pending</div><div className="kpi-value">{data.filter(d => d.status === 'Pending').length}</div></div>
        <div className="kpi-card blue"><div className="kpi-label">In Progress</div><div className="kpi-value">{data.filter(d => d.status === 'In Progress').length}</div></div>
        <div className="kpi-card green"><div className="kpi-label">Completed</div><div className="kpi-value">{data.filter(d => d.status === 'Completed').length}</div></div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>All Orders</span>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Order</button>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr>
              <th>Order #</th><th>Vendor</th><th>Description</th><th>Circuit</th><th>Order Date</th><th>Due Date</th><th>Rate</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/orders/${row.id}`)}>{row.order_number}</span>
                  </td>
                  <td>{row.account_name}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 13 }}>{row.description || '—'}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{row.circuit_identifier || '—'}</td>
                  <td>{row.order_date ? row.order_date.split('T')[0] : '—'}</td>
                  <td>{row.due_date ? row.due_date.split('T')[0] : '—'}</td>
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

      <Modal open={modal} title={editing ? 'Edit Order' : 'New Order'} onClose={() => setModal(false)} onSave={handleSave}>
        <div className="form-row">
          <div><label className="form-label">Order Number</label><input className="form-input" value={form.order_number} onChange={e => set('order_number', e.target.value)} /></div>
          <div><label className="form-label">Vendor Account *</label>
            <select className="form-input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
              <option value="">Select vendor…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="form-label">Contracted Rate ($)</label><input className="form-input" type="number" step="0.01" value={form.contracted_rate} onChange={e => set('contracted_rate', e.target.value)} /></div>
        </div>
        <div><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this order" /></div>
        <div><label className="form-label">Related Circuit (optional)</label>
          <select className="form-input" value={form.circuit_id || ''} onChange={e => set('circuit_id', e.target.value || null)}>
            <option value="">None</option>
            {circuits.map(c => <option key={c.id} value={c.id}>{c.circuit_id} — {c.location}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div><label className="form-label">Order Date</label><input className="form-input" type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} /></div>
          <div><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
        </div>
        <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
      </Modal>
    </div>
  );
}
