import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, getAccounts } from '../api';
import Modal from '../components/Modal';

const STATUSES = ['Open', 'Paid', 'Disputed', 'Void'];
const STATUS_BADGE = { Open: 'badge badge-blue', Paid: 'badge badge-green', Disputed: 'badge badge-orange', Void: 'badge badge-gray' };
const EMPTY = { account_id: '', invoice_number: '', invoice_date: '', due_date: '', period_start: '', period_end: '', total_amount: '', status: 'Open', notes: '' };

export default function Invoices() {
  const [data, setData]         = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [toast, setToast]       = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([getInvoices(), getAccounts()])
      .then(([inv, a]) => { setData(inv.data); setAccounts(a.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, account_id: accounts[0]?.id || '' }); setModal(true); };
  const openEdit = rec => {
    setEditing(rec);
    setForm({ ...rec, invoice_date: rec.invoice_date?.split('T')[0] || '', due_date: rec.due_date?.split('T')[0] || '', period_start: rec.period_start?.split('T')[0] || '', period_end: rec.period_end?.split('T')[0] || '' });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await updateInvoice(editing.id, form);
      else await createInvoice(form);
      setModal(false); load(); showToast(editing ? 'Invoice updated.' : 'Invoice created.');
    } catch { showToast('Save failed.', false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await deleteInvoice(id); load(); showToast('Invoice deleted.'); }
    catch { showToast('Delete failed.', false); }
  };

  const totalBilled = data.reduce((s, d) => s + Number(d.total_amount || 0), 0);
  const openCount   = data.filter(d => d.status === 'Open').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>{toast.msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card blue"><div className="kpi-label">Total Invoices</div><div className="kpi-value">{data.length}</div><div className="kpi-icon"><Receipt size={40} /></div></div>
        <div className="kpi-card orange"><div className="kpi-label">Open</div><div className="kpi-value">{openCount}</div><div className="kpi-sub">Pending review</div></div>
        <div className="kpi-card green"><div className="kpi-label">Paid</div><div className="kpi-value">{data.filter(d => d.status === 'Paid').length}</div></div>
        <div className="kpi-card purple"><div className="kpi-label">Total Billed</div><div className="kpi-value">${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>All Invoices</span>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Invoice</button>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Vendor</th><th>Invoice Date</th><th>Due Date</th><th>Amount</th><th>Variance</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.map(row => {
                const variance = Number(row.total_variance || 0);
                return (
                  <tr key={row.id}>
                    <td>
                      <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/invoices/${row.id}`)}>
                        {row.invoice_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{row.account_name}</td>
                    <td style={{ color: '#64748b' }}>{row.invoice_date?.split('T')[0] || '—'}</td>
                    <td style={{ color: '#64748b' }}>{row.due_date?.split('T')[0] || '—'}</td>
                    <td style={{ fontWeight: 700 }}>${Number(row.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ color: variance > 0 ? '#dc2626' : variance < 0 ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                      {variance !== 0 ? `$${variance.toFixed(2)}` : '—'}
                    </td>
                    <td><span className={STATUS_BADGE[row.status] || 'badge badge-gray'}>{row.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(`/invoices/${row.id}`)} title="View"><Eye size={13} /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(row)}><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(row.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} title={editing ? 'Edit Invoice' : 'New Invoice'} onClose={() => setModal(false)} onSave={handleSave}>
        <div><label className="form-label">Vendor Account *</label>
          <select className="form-input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
            <option value="">Select vendor…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div><label className="form-label">Invoice Number</label><input className="form-input" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} /></div>
          <div><label className="form-label">Total Amount ($)</label><input className="form-input" type="number" step="0.01" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Invoice Date</label><input className="form-input" type="date" value={form.invoice_date} onChange={e => set('invoice_date', e.target.value)} /></div>
          <div><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Period Start</label><input className="form-input" type="date" value={form.period_start} onChange={e => set('period_start', e.target.value)} /></div>
          <div><label className="form-label">Period End</label><input className="form-input" type="date" value={form.period_end} onChange={e => set('period_end', e.target.value)} /></div>
        </div>
        <div><label className="form-label">Status</label>
          <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
}
