import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, LifeBuoy, Save, Send, Trash2, Clock, ChevronDown, ChevronRight, Terminal, Bug, MoreHorizontal } from 'lucide-react';
import { PageTitleContext } from '../PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { getTicket, updateTicket, deleteTicket, addTicketComment, deleteTicketComment, getUsers } from '../api';
import { useConfirm } from '../context/ConfirmContext';
import LookupField from '../components/LookupField';
import { LOOKUP_USERS } from '../utils/lookupConfigs';
import DetailHeader from '../components/DetailHeader';
import ChangeHistory from '../components/ChangeHistory';

const CATEGORIES = [
  'Enhancement', 'System Issue',
  'Billing Error', 'Rate Dispute', 'Service Issue', 'Contract Problem',
  'Data Quality', 'Invoice Discrepancy', 'Provisioning', 'Access & Permissions',
  'Bug Report', 'Feature Request', 'Documentation', 'Other',
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES   = ['Open', 'In Progress', 'Pending Vendor', 'Pending Internal', 'On Hold', 'In Review', 'Resolved', 'Closed'];

const SOURCE_PATHS = {
  invoice:  id => `/invoices/${id}`,
  inventoryItem:  id => `/inventory/${id}`,
  contract: id => `/contracts/${id}`,
  order:    id => `/orders/${id}`,
  account:  id => `/accounts/${id}`,
  dispute:  id => `/disputes/${id}`,
};

function priorityBadgeClass(p) {
  if (p === 'Critical') return 'badge badge-red';
  if (p === 'High')     return 'badge badge-orange';
  if (p === 'Low')      return 'badge badge-green';
  return 'badge badge-blue';
}

function statusBadgeClass(s) {
  if (s === 'Open')        return 'badge badge-blue';
  if (s === 'In Progress') return 'badge badge-purple';
  if (s === 'Resolved')    return 'badge badge-green';
  if (s === 'Closed')      return 'badge badge-gray';
  if (s === 'On Hold')     return 'badge badge-amber';
  if (s === 'In Review')   return 'badge badge-cyan';
  return 'badge badge-orange';
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return fmt(dateStr);
}

function parseBold(text) {
  if (!text) return null;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, system = false, size = 34 }) {
  const bg = system ? '#e0f2fe' : '#eff6ff';
  const color = system ? '#0284c7' : '#2563eb';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 700, color, flexShrink: 0 }}>
      {system ? <Clock size={size * 0.42} color={color} /> : initials(name)}
    </div>
  );
}

const NAV_BTN = {
  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', border: 'none',
};

function MenuItem({ label, onClick, color = '#f8fafc', stub }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent',
        border: 'none', color, fontSize: 13, textAlign: 'left', cursor: stub ? 'not-allowed' : 'pointer',
        opacity: stub ? 0.5 : 1
      }}
      onMouseOver={e => !stub && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseOut={e => !stub && (e.currentTarget.style.background = 'transparent')}
      disabled={stub}
    >
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />;
}

export default function TicketDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const confirm     = useConfirm();
  const { setTitle } = useContext(PageTitleContext) || {};
  const { user }    = useAuth();

  const menuRef = useRef(null);

  const [ticket,   setTicket]   = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [form,     setForm]     = useState({});
  const [dirty,    setDirty]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [newComment, setNewComment] = useState('');
  const [sending,    setSending]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [devOpen,    setDevOpen]    = useState(false);
  const [showAll,    setShowAll]    = useState(false);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketRes, usersRes] = await Promise.all([
        getTicket(id),
        getUsers(),
      ]);
      const t = ticketRes.data;
      setTicket(t);
      setComments([...(t.comments || [])].reverse());
      setForm({
        title:              t.title || '',
        description:        t.description || '',
        category:           t.category || 'Other',
        priority:           t.priority || 'Medium',
        status:             t.status || 'Open',
        assigned_users_id:  t.assigned_users_id || '',
        due_date:           t.due_date ? t.due_date.split('T')[0] : '',
        tags:               t.tags || '',
        resolution:         t.resolution || '',
        steps_to_reproduce: t.steps_to_reproduce || '',
        expected_behavior:  t.expected_behavior || '',
        actual_behavior:    t.actual_behavior || '',
        console_errors:     t.console_errors || '',
      });
      setUsers(usersRes.data || []);
      setDirty(false);
      setTitle?.(`Ticket ${t.ticket_number}`);
      // Auto-expand dev section if any dev fields have content
      if (t.steps_to_reproduce || t.expected_behavior || t.actual_behavior || t.console_errors) {
        setDevOpen(true);
      }
    } catch {
      setError('Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [id, setTitle]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // no auto-scroll — newest comments are shown at top
  }, [comments]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTicket(id, form);
      showToast('Ticket updated.');
      setRefreshKey(k => k + 1);
      load();
    } catch (e) {
      setError(e?.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm(`Delete ticket ${ticket.ticket_number}? This cannot be undone.`))) return;
    try {
      await deleteTicket(id);
      navigate('/tickets');
    } catch {
      setError('Failed to delete ticket.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await addTicketComment(id, {
        content:      newComment.trim(),
        comment_type: 'comment',
      });
      setNewComment('');
      load();
    } catch {
      setError('Failed to add comment.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (cid) => {
    if (!(await confirm('Delete this comment?'))) return;
    try {
      await deleteTicketComment(id, cid);
      load();
    } catch {
      setError('Failed to delete comment.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#94a3b8' }}>
        Loading ticket…
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>
    );
  }

  const isResolved = form.status === 'Resolved' || form.status === 'Closed';
  const sourceVisible = ticket?.source_entity_type && ticket?.source_entity_id;
  const sourcePath = sourceVisible
    ? (SOURCE_PATHS[ticket.source_entity_type] || (() => '#'))(ticket.source_entity_id)
    : null;

  const hasDevContent = form.environment || form.steps_to_reproduce || form.expected_behavior || form.actual_behavior || form.console_errors || form.browser_info;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, padding: '10px 20px', background: '#0f172a', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}

      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/tickets')}
            className="btn btn-ghost btn-sm"
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
              <LifeBuoy size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>
                {ticket?.ticket_number}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Created {fmt(ticket?.created_at)} by {ticket?.created_by}
              </div>
            </div>
          </div>
          <span className={statusBadgeClass(form.status)}>{form.status}</span>
          <span className={priorityBadgeClass(form.priority)}>{form.priority}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              title="Ticket options"
              onClick={() => setMenuOpen(v => !v)}
              style={{ ...NAV_BTN, background: menuOpen ? 'rgba(255,255,255,0.15)' : 'transparent', color: menuOpen ? '#f8fafc' : '#cbd5e1' }}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 200, zIndex: 9000, padding: '6px 0' }}>
                <MenuItem 
                  label={<><Trash2 size={14} style={{ marginRight: 6 }} /> Delete</>} 
                  onClick={handleDelete} 
                  color="#ef4444" 
                />
              </div>
            )}
          </div>
        </div>
      </DetailHeader>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{error}</div>
      )}

      {/* Two-column layout — activity panel is larger now */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 580px', gap: 24, alignItems: 'start' }}>

        {/* ── Left: form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Source record link */}
          {sourceVisible && (
            <div className="page-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ fontWeight: 600 }}>Source record:</span>{' '}
                <span style={{ textTransform: 'capitalize' }}>{ticket.source_entity_type}</span> —{' '}
                <a
                  href={sourcePath}
                  onClick={e => { e.preventDefault(); navigate(sourcePath); }}
                  style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                >
                  {ticket.source_label || `#${ticket.source_entity_id}`}
                </a>
              </div>
            </div>
          )}

          {/* Main details card */}
          <div className="page-card">
            <div className="page-card-header">
              <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Ticket Details</span>
              {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
                {[
                  { label: 'Ticket #',   value: ticket?.ticket_number },
                  { label: 'Created By', value: ticket?.created_by },
                  { label: 'Created',    value: fmt(ticket?.created_at) },
                  { label: 'Updated',    value: fmt(ticket?.updated_at) },
                  { label: 'Resolved',   value: fmt(ticket?.resolved_date) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#374151', marginTop: 3, fontWeight: 500 }}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} style={{ width: '100%' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={5}
                  style={{ width: '100%', resize: 'vertical', minHeight: 100 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%' }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)} style={{ width: '100%' }}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%' }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="form-label">Assigned To</label>
                  <LookupField
                    {...LOOKUP_USERS(users)}
                    value={form.assigned_users_id}
                    onChange={row => set('assigned_users_id', row.users_id)}
                    onClear={() => set('assigned_users_id', '')}
                    displayValue={users.find(u => u.users_id === Number(form.assigned_users_id))?.display_name}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ marginBottom: isResolved ? 14 : 0 }}>
                <label className="form-label">Tags</label>
                <input className="form-input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="billing, q2, vendor-x" style={{ width: '100%' }} />
              </div>

              {isResolved && (
                <div>
                  <label className="form-label">Resolution Notes</label>
                  <textarea
                    className="form-input"
                    value={form.resolution}
                    onChange={e => set('resolution', e.target.value)}
                    rows={3}
                    placeholder="Describe how this was resolved…"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Development Details — collapsible */}
          <div className="page-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              onClick={() => setDevOpen(o => !o)}
              className="page-card-header"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bug size={15} color="#bfdbfe" />
                <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Development Details</span>
                {hasDevContent && <span className="badge badge-purple" style={{ marginLeft: 4, transform: 'scale(0.85)', transformOrigin: 'left center' }}>has content</span>}
              </div>
              <div style={{ color: '#94a3b8' }}>
                {devOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>
            {devOpen && (
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Steps to Reproduce</label>
                  <textarea
                    className="form-input"
                    value={form.steps_to_reproduce}
                    onChange={e => set('steps_to_reproduce', e.target.value)}
                    rows={3}
                    placeholder="1. Go to…&#10;2. Click on…&#10;3. See error"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Expected Behavior</label>
                    <textarea
                      className="form-input"
                      value={form.expected_behavior}
                      onChange={e => set('expected_behavior', e.target.value)}
                      rows={2}
                      placeholder="What should have happened?"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label className="form-label">Actual Behavior</label>
                    <textarea
                      className="form-input"
                      value={form.actual_behavior}
                      onChange={e => set('actual_behavior', e.target.value)}
                      rows={2}
                      placeholder="What actually happened?"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Terminal size={13} color="#ea580c" /> Console Errors
                  </label>
                  <textarea
                    className="form-input"
                    value={form.console_errors}
                    onChange={e => set('console_errors', e.target.value)}
                    rows={4}
                    placeholder="Paste console errors or stack traces here…"
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Change History */}
          <ChangeHistory resource="tickets" resourceId={id} refreshKey={refreshKey} />
        </div>

        {/* ── Right: activity feed ── */}
        <div className="page-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Feed header */}
          <div className="page-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={14} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#bfdbfe' }}>Activity & Comments</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{comments.length} entries</div>
              </div>
            </div>
          </div>

          {/* New comment input — pinned above feed */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <textarea
              className="form-input"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
              placeholder="Add a comment… (Ctrl+Enter to send)"
              rows={3}
              style={{ width: '100%', resize: 'none', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleAddComment}
                disabled={sending || !newComment.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Send size={14} /> {sending ? 'Sending…' : 'Comment'}
              </button>
            </div>
          </div>

          {/* Comments feed — newest first, 10 at a time */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '32px 0' }}>
                <LifeBuoy size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>No activity yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Comments and status changes will appear here.</div>
              </div>
            )}
            {(showAll ? comments : comments.slice(0, 5)).map(c => {
              const isSystem = c.comment_type !== 'comment' && c.comment_type !== 'note';
              return (
                <div key={c.ticket_comments_id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Avatar name={c.author} system={isSystem} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isSystem ? '#0284c7' : '#1e293b' }}>
                        {isSystem ? 'System' : c.author}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{relativeTime(c.created_at)}</span>
                      {c.comment_type === 'note' && (
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>NOTE</span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: isSystem ? '#475569' : '#1e293b',
                      marginTop: 4,
                      padding: isSystem ? '8px 12px' : '10px 14px',
                      background: isSystem ? '#f0f9ff' : '#f8fafc',
                      borderRadius: 10,
                      border: `1px solid ${isSystem ? '#bae6fd' : '#e2e8f0'}`,
                      fontStyle: isSystem ? 'italic' : 'normal',
                      lineHeight: 1.65,
                      wordBreak: 'break-word',
                    }}>
                      {isSystem ? parseBold(c.content) : c.content}
                    </div>
                    {!isSystem && c.author === user?.display_name && (
                      <button
                        onClick={() => handleDeleteComment(c.ticket_comments_id)}
                        style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {comments.length > 5 && (
              <button
                onClick={() => setShowAll(s => !s)}
                style={{
                  margin: '4px auto 0', background: 'none', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: '6px 18px', cursor: 'pointer',
                  fontSize: 12, color: '#2563eb', fontWeight: 600,
                }}
              >
                {showAll ? `Show less` : `See all ${comments.length} entries`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
