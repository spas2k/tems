import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, DollarSign, Receipt, SlidersHorizontal, List, Layers, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInvoice, getCircuits, createLineItem, updateLineItem, deleteLineItem, getAllocations, createAllocation, deleteAllocation, getUsocCodes, updateInvoice, getUsers } from '../api';
import Modal from '../components/Modal';
import DetailHeader from '../components/DetailHeader';
import NoteTimeline from '../components/NoteTimeline';
import ChangeHistory from '../components/ChangeHistory';
import CreateTicketModal from '../components/CreateTicketModal';
import { useConfirm } from '../context/ConfirmContext';

const CHARGE_TYPES = ['MRC', 'NRC', 'Usage', 'Tax/Surcharge', 'Credit', 'Other'];
const STATUS_BADGE = { Paid: 'badge badge-green', Open: 'badge badge-blue', Disputed: 'badge badge-orange', Void: 'badge badge-gray', Closed: 'badge badge-gray' };

const EMPTY_LI    = { description: '', circuits_id: '', usoc_codes_id: '', charge_type: 'MRC', amount: '', mrc_amount: '', nrc_amount: '', contracted_rate: '', period_start: '', period_end: '' };
const EMPTY_ALLOC = { cost_center: '', department: '', percentage: '', notes: '' };

const NAV_SECTIONS = [
  { key: 'info',        label: 'Invoice Info',   Icon: SlidersHorizontal },
  { key: 'lineItems',   label: 'Line Items',      Icon: List              },
  { key: 'allocations', label: 'Allocations',     Icon: Layers            },
  { key: 'notes',       label: 'Notes & History', Icon: MessageSquare     },
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

function MenuDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />;
}
function MenuItem({ label, onClick, stub = false }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '9px 16px', border: 'none',
        background: hover ? 'rgba(255,255,255,0.08)' : 'transparent',
        cursor: stub ? 'default' : 'pointer',
        color: stub ? '#64748b' : '#e2e8f0',
        fontSize: 13, fontWeight: 500,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >{label}</button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>{label}</span>
      <span className="rc-results-count" style={{ fontSize: 14, fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('invoices', 'update');
  const [invoice, setInvoice]       = useState(null);
  const [lineItems, setLineItems]   = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [circuits, setCircuits]     = useState([]);
  const [usocCodes, setUsocCodes]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const refs = { info: useRef(null), lineItems: useRef(null), allocations: useRef(null), notes: useRef(null) };
  const scrollTo = key => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const [liModal, setLiModal]       = useState(false);
  const [editingLi, setEditingLi]   = useState(null);
  const [liForm, setLiForm]         = useState(EMPTY_LI);

  const [allocModal, setAllocModal] = useState(false);
  const [allocLiId, setAllocLiId]   = useState(null);
  const [allocForm, setAllocForm]   = useState(EMPTY_ALLOC);

  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [assignModal, setAssignModal]   = useState(false);
  const [allUsers, setAllUsers]         = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [ticketModal, setTicketModal]   = useState(false);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const handleToggleStatus = async () => {
    setMenuOpen(false);
    const newStatus = invoice.status === 'Closed' ? 'Open' : 'Closed';
    try {
      const updated = await updateInvoice(id, { ...invoice, status: newStatus });
      setInvoice(updated.data);
      showToast(`Invoice ${newStatus === 'Closed' ? 'closed' : 'reopened'}.`);
    } catch { showToast('Status update failed.', false); }
  };

  const openAssignModal = async () => {
    setMenuOpen(false);
    if (allUsers.length === 0) {
      try {
        const res = await getUsers();
        setAllUsers(res.data);
      } catch { showToast('Could not load users.', false); return; }
    }
    setAssignUserId(invoice.assigned_users_id ? String(invoice.assigned_users_id) : '');
    setAssignModal(true);
  };

  const handleAssign = async () => {
    try {
      const updated = await updateInvoice(id, { ...invoice, assigned_users_id: assignUserId ? Number(assignUserId) : null });
      setInvoice(updated.data);
      setAssignModal(false);
      showToast('Invoice assigned.');
    } catch { showToast('Assignment failed.', false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [inv, ci, allocs, uc] = await Promise.all([getInvoice(id), getCircuits(), getAllocations({ invoices_id: id }), getUsocCodes()]);
      setInvoice(inv.data);
      setPageTitle(inv.data.invoice_number);
      setLineItems(inv.data.line_items || []);
      setCircuits(ci.data);
      setAllocations(allocs.data);
      setUsocCodes(uc.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (invoice?.invoice_number) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/invoices/${id}`, label: invoice.invoice_number, type: 'invoice' }
      }));
    }
  }, [invoice]);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const setLi = (k, v) => setLiForm(p => ({ ...p, [k]: v }));
  const setAl = (k, v) => setAllocForm(p => ({ ...p, [k]: v }));

  const openNewLi  = () => { setEditingLi(null); setLiForm(EMPTY_LI); setLiModal(true); };
  const openEditLi = rec => { setEditingLi(rec); setLiForm({ ...rec, usoc_codes_id: rec.usoc_codes_id || '', mrc_amount: rec.mrc_amount ?? '', nrc_amount: rec.nrc_amount ?? '', period_start: rec.period_start?.split('T')[0] || '', period_end: rec.period_end?.split('T')[0] || '' }); setLiModal(true); };

  const saveLi = async () => {
    try {
      const payload = { ...liForm, invoices_id: id };
      if (editingLi) await updateLineItem(editingLi.line_items_id, payload);
      else await createLineItem(payload);
      setLiModal(false); load(); showToast(editingLi ? 'Line item updated.' : 'Line item added.');
    } catch { showToast('Save failed.', false); }
  };

  const deleteLi = async liId => {
    if (!(await confirm('Delete this line item?'))) return;
    await deleteLineItem(liId); load(); showToast('Line item deleted.');
  };

  const openAllocModal = liId => { setAllocLiId(liId); setAllocForm(EMPTY_ALLOC); setAllocModal(true); };

  const saveAlloc = async () => {
    try {
      await createAllocation({ ...allocForm, line_items_id: allocLiId });
      setAllocModal(false); load(); showToast('Allocation saved.');
    } catch { showToast('Save failed.', false); }
  };

  const deleteAlloc = async allocId => {
    if (!(await confirm('Remove this allocation?', { confirmLabel: 'Remove' }))) return;
    await deleteAllocation(allocId); load(); showToast('Allocation removed.');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#94a3b8' }}>Loading…</div>;
  if (!invoice) return <div style={{ background: '#fee2e2', color: '#dc2626', padding: '16px 20px', borderRadius: 12 }}>Invoice not found.</div>;

  const totalVariance  = lineItems.reduce((s, l) => s + (Number(l.variance) || 0), 0);
  const totalAllocated = allocations.reduce((s, a) => s + Number(a.allocated_amount || 0), 0);
  const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#dcfce7' : '#fee2e2', color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>{toast.msg}</div>}

      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={18} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{invoice.invoice_number}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{invoice.account_name}</div>
            </div>
          </div>
          <span className={STATUS_BADGE[invoice.status] || 'badge badge-gray'} style={{ fontSize: 13, padding: '6px 14px' }}>{invoice.status}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 6px' }}>
            {NAV_SECTIONS.map(({ key, label, Icon }) => (
              <NavIcon key={key} label={label} Icon={Icon} onClick={() => scrollTo(key)} />
            ))}
          </div>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              title="Invoice options"
              onClick={() => setMenuOpen(v => !v)}
              style={{ ...NAV_BTN, background: menuOpen ? 'rgba(255,255,255,0.15)' : 'transparent', color: menuOpen ? '#f8fafc' : '#cbd5e1' }}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 224, zIndex: 9000, padding: '6px 0' }}>
                <MenuItem label="Assign to User" onClick={openAssignModal} />
                <MenuItem label="Analyze" onClick={() => setMenuOpen(false)} stub />
                <MenuDivider />
                <MenuItem label={invoice.status === 'Closed' ? 'Reopen Invoice' : 'Close Invoice'} onClick={handleToggleStatus} />
                <MenuDivider />
                <MenuItem label="Create Contract Mappings" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Create Issue" onClick={() => { setMenuOpen(false); setTicketModal(true); }} />
                <MenuItem label="Preview Feed" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Recategorize" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Reidentify" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Rematch" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Reset Feed" onClick={() => setMenuOpen(false)} stub />
                <MenuItem label="Send Invoice Email" onClick={() => setMenuOpen(false)} stub />
              </div>
            )}
          </div>
        </div>
      </DetailHeader>

      {/* Invoice Info */}
      <div className="page-card" ref={refs.info} style={{ padding: 24, scrollMarginTop: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20 }}>
          <InfoRow label="Invoice Date"   value={invoice.invoice_date?.split('T')[0]} />
          <InfoRow label="Due Date"       value={invoice.due_date?.split('T')[0]} />
          <InfoRow label="Period Start"   value={invoice.period_start?.split('T')[0]} />
          <InfoRow label="Period End"     value={invoice.period_end?.split('T')[0]} />
          <InfoRow label="Payment Date"   value={invoice.payment_date?.split('T')[0]} />
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card slate">
          <div className="kpi-label">Invoice Total</div>
          <div className="kpi-value">${fmt(invoice.total_amount)}</div>
          <div className="kpi-icon"><DollarSign size={40} /></div>
        </div>
        <div className={`kpi-card ${totalVariance > 0 ? 'red' : 'green'}`}>
          <div className="kpi-label">Billing Variance</div>
          <div className="kpi-value">${fmt(totalVariance)}</div>
          <div className="kpi-sub">{totalVariance > 0 ? 'Overbilled' : totalVariance < 0 ? 'Underbilled' : 'No variance'}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Allocated</div>
          <div className="kpi-value">${fmt(totalAllocated)}</div>
        </div>
      </div>

      {/* Line Items */}
      <div className="page-card" ref={refs.lineItems} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Line Items</span>
          {canUpdate && <button className="btn btn-primary" onClick={openNewLi}><Plus size={15} /> Add Line Item</button>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 1000 }}>
            <thead><tr>
              <th>Description</th><th>Circuit</th><th>USOC</th><th>Type</th><th>Billed</th><th>MRC</th><th>NRC</th><th>Contracted</th><th>Variance</th><th>Audit</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {lineItems.map(li => {
                const v = Number(li.variance);
                const AUDIT_BADGE = { Validated: 'badge badge-green', Variance: 'badge badge-red', Pending: 'badge badge-orange' };
                return (
                  <tr key={li.line_items_id}>
                    <td style={{ maxWidth: 180 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{li.description}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {li.circuits_id
                        ? <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/circuits/${li.circuits_id}`)}>{li.circuit_identifier}</span>
                        : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {li.usoc_code
                        ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>{li.usoc_code}</span>
                        : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td>{li.charge_type}</td>
                    <td style={{ fontWeight: 700 }}>${fmt(li.amount)}</td>
                    <td style={{ fontWeight: 600, color: '#0d9488' }}>{li.mrc_amount != null ? `$${fmt(li.mrc_amount)}` : '—'}</td>
                    <td style={{ fontWeight: 600, color: '#d97706' }}>{li.nrc_amount != null ? `$${fmt(li.nrc_amount)}` : '—'}</td>
                    <td>{li.contracted_rate != null ? `$${fmt(li.contracted_rate)}` : '—'}</td>
                    <td style={{ fontWeight: 600, color: v > 0 ? '#dc2626' : v < 0 ? '#16a34a' : '#94a3b8' }}>
                      {li.variance != null ? (v === 0 ? '$0.00' : `$${v.toFixed(2)}`) : 'N/A'}
                    </td>
                    <td>{li.audit_status ? <span className={AUDIT_BADGE[li.audit_status] || 'badge badge-gray'}>{li.audit_status}</span> : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openAllocModal(li.line_items_id)} style={{ fontSize: 11 }}><DollarSign size={12} /> Allocate</button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEditLi(li)}><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteLi(li.line_items_id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {lineItems.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No line items yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocations */}
      <div className="page-card" ref={refs.allocations} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Allocations</span>
        </div>
        <table className="data-table">
          <thead><tr>
            <th>Line Item</th><th>Cost Center</th><th>Department</th><th>%</th><th>Allocated</th><th>Notes</th><th></th>
          </tr></thead>
          <tbody>
            {allocations.map(a => (
              <tr key={a.allocations_id}>
                <td style={{ color: '#64748b', fontSize: 12 }}>{a.line_item_description}</td>
                <td><span className="badge badge-purple">{a.cost_center}</span></td>
                <td>{a.department}</td>
                <td style={{ fontWeight: 700 }}>{a.percentage}%</td>
                <td style={{ fontWeight: 700 }}>${Number(a.allocated_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ color: '#94a3b8', fontSize: 12 }}>{a.notes || '—'}</td>
                <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteAlloc(a.allocations_id)}><Trash2 size={13} /></button></td>
              </tr>
            ))}
            {allocations.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No allocations yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Line Item Modal */}
      <Modal open={liModal} title={editingLi ? 'Edit Line Item' : 'Add Line Item'} onClose={() => setLiModal(false)} onSave={saveLi}>
        <div><label className="form-label">Description *</label><input className="form-input" value={liForm.description} onChange={e => setLi('description', e.target.value)} /></div>
        <div className="form-row">
          <div><label className="form-label">Circuit (optional)</label>
            <select className="form-input" value={liForm.circuits_id || ''} onChange={e => setLi('circuits_id', e.target.value || null)}>
              <option value="">None</option>
              {circuits.map(c => <option key={c.circuits_id} value={c.circuits_id}>{c.circuit_number} — {c.location}</option>)}
            </select>
          </div>
          <div><label className="form-label">USOC Code (optional)</label>
            <select className="form-input" value={liForm.usoc_codes_id || ''} onChange={e => setLi('usoc_codes_id', e.target.value || null)}>
              <option value="">None</option>
              {usocCodes.map(u => <option key={u.usoc_codes_id} value={u.usoc_codes_id}>{u.usoc_code} — {u.description}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Charge Type</label>
            <select className="form-input" value={liForm.charge_type} onChange={e => setLi('charge_type', e.target.value)}>
              {CHARGE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="form-label">Billed Amount ($) *</label><input className="form-input" type="number" step="0.01" value={liForm.amount} onChange={e => setLi('amount', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">MRC Amount ($)</label><input className="form-input" type="number" step="0.01" value={liForm.mrc_amount} onChange={e => setLi('mrc_amount', e.target.value)} placeholder="Auto-set for MRC type" /></div>
          <div><label className="form-label">NRC Amount ($)</label><input className="form-input" type="number" step="0.01" value={liForm.nrc_amount} onChange={e => setLi('nrc_amount', e.target.value)} placeholder="Auto-set for NRC type" /></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Contracted Rate ($)</label><input className="form-input" type="number" step="0.01" value={liForm.contracted_rate} onChange={e => setLi('contracted_rate', e.target.value)} /></div>
          <div></div>
        </div>
        <div className="form-row">
          <div><label className="form-label">Period Start</label><input className="form-input" type="date" value={liForm.period_start} onChange={e => setLi('period_start', e.target.value)} /></div>
          <div><label className="form-label">Period End</label><input className="form-input" type="date" value={liForm.period_end} onChange={e => setLi('period_end', e.target.value)} /></div>
        </div>
      </Modal>

      {/* Allocation Modal */}
      <Modal open={allocModal} title="Allocate Line Item" onClose={() => setAllocModal(false)} onSave={saveAlloc}>
        <div className="form-row">
          <div><label className="form-label">Cost Center *</label><input className="form-input" value={allocForm.cost_center} onChange={e => setAl('cost_center', e.target.value)} /></div>
          <div><label className="form-label">Department</label><input className="form-input" value={allocForm.department} onChange={e => setAl('department', e.target.value)} /></div>
        </div>
        <div><label className="form-label">Percentage (%) *</label><input className="form-input" type="number" min="0" max="100" step="0.01" value={allocForm.percentage} onChange={e => setAl('percentage', e.target.value)} /></div>
        <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={allocForm.notes} onChange={e => setAl('notes', e.target.value)} /></div>
      </Modal>

      {/* Assign to User Modal */}
      <Modal open={assignModal} title="Assign to User" onClose={() => setAssignModal(false)} onSave={handleAssign} saveLabel="Assign" width={380}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="form-label">Select User</label>
          <select className="form-input" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {allUsers.map(u => (
              <option key={u.users_id} value={u.users_id}>{u.display_name} ({u.email})</option>
            ))}
          </select>
          {invoice.assigned_user_name && (
            <div style={{ fontSize: 12, color: '#64748b' }}>Currently assigned to: <strong>{invoice.assigned_user_name}</strong></div>
          )}
        </div>
      </Modal>

      <div ref={refs.notes} style={{ scrollMarginTop: 80 }}>
        <NoteTimeline entityType="invoice" entityId={id} />
        <ChangeHistory resource="invoices" resourceId={id} />
      </div>

      <CreateTicketModal
        open={ticketModal}
        onClose={() => setTicketModal(false)}
        onCreated={t => showToast(`Ticket ${t.ticket_number} created.`)}
        sourceEntityType="invoice"
        sourceEntityId={Number(id)}
        sourceLabel={invoice.invoice_number}
        defaultCategory="Invoice Discrepancy"
        defaultTitle={`Issue with Invoice ${invoice.invoice_number}`}
        contextInfo={{ accountName: invoice.account_name }}
      />
    </div>
  );
}
