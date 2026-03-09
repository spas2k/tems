import React, { useState } from 'react';
import { LifeBuoy, Link2 } from 'lucide-react';
import { createTicket } from '../api';

const CATEGORIES = [
  'Billing Error',
  'Rate Dispute',
  'Service Issue',
  'Contract Problem',
  'Data Quality',
  'Invoice Discrepancy',
  'Provisioning',
  'Access & Permissions',
  'Other',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const OVERLAY = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: 16,
};

const PANEL = {
  borderRadius: 14,
  boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
  width: '100%',
  maxWidth: 560,
  maxHeight: '92vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export default function CreateTicketModal({
  open,
  onClose,
  onCreated,
  sourceEntityType = null,
  sourceEntityId   = null,
  sourceLabel      = null,
  defaultCategory  = 'Other',
  defaultTitle     = '',
  contextInfo      = null,
}) {
  const [form, setForm] = useState({
    title:       defaultTitle,
    description: '',
    category:    defaultCategory,
    priority:    'Medium',
    due_date:    '',
    tags:        '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setForm({
        title:       defaultTitle,
        description: '',
        category:    defaultCategory,
        priority:    'Medium',
        due_date:    '',
        tags:        '',
      });
      setError('');
    }
  }, [open, defaultTitle, defaultCategory]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        source_entity_type: sourceEntityType || undefined,
        source_entity_id:   sourceEntityId   || undefined,
        source_label:       sourceLabel       || undefined,
      };
      const res = await createTicket(payload);
      onCreated && onCreated(res.data);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to create ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ctm-panel" style={PANEL}>
        {/* Header */}
        <div className="ctm-header" style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LifeBuoy size={18} color="#2563eb" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Create Ticket</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Submit an issue for tracking and resolution</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Context banner */}
        {sourceLabel && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={14} color="#0284c7" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: '#0369a1' }}>
              <span style={{ fontWeight: 600 }}>Linked to:</span>{' '}
              {sourceEntityType && <span style={{ textTransform: 'capitalize' }}>{sourceEntityType} </span>}
              <span style={{ fontWeight: 600 }}>{sourceLabel}</span>
              {contextInfo?.accountName && <span> — {contextInfo.accountName}</span>}
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 8px' }}>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
              Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Brief summary of the issue"
              style={{ width: '100%' }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Description</label>
            <textarea
              className="form-input"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the issue in detail — what's wrong, what you expected, any relevant amounts or dates..."
              rows={4}
              style={{ width: '100%', resize: 'vertical', minHeight: 90 }}
            />
          </div>

          {/* Category + Priority row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Category</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Priority</label>
              <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)} style={{ width: '100%' }}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Due date + Tags row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Due Date</label>
              <input
                type="date"
                className="form-input"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Tags</label>
              <input
                className="form-input"
                value={form.tags}
                onChange={e => set('tags', e.target.value)}
                placeholder="billing, q2, vendor-x"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
