/**
 * @file Notification Settings admin page.
 * Lists all notification types with toggle switches for in-app and email,
 * plus the ability to create custom notification types.
 * @module NotificationSettings
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, Mail, MailX, Plus, Trash2, Shield, Info, AlertTriangle, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  getNotificationSettings,
  updateNotificationSetting,
  createNotificationSetting,
  deleteNotificationSetting,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import CrudModal from '../components/CrudModal';

const CATEGORY_LABELS = {
  invoices:  'Invoices',
  tickets:   'Tickets',
  contracts: 'Contracts',
  system:    'System',
};

const CATEGORY_ORDER = ['invoices', 'contracts', 'tickets', 'system'];

const TYPE_ICON = {
  info:    { icon: Info,           color: '#3b82f6' },
  warning: { icon: AlertTriangle,  color: '#f59e0b' },
  success: { icon: CheckCircle,    color: '#10b981' },
  error:   { icon: XCircle,        color: '#ef4444' },
};

export default function NotificationSettings() {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ key: '', name: '', description: '', category: 'system', default_type: 'info' });

  const load = useCallback(async () => {
    try {
      const { data } = await getNotificationSettings();
      setTypes(data);
    } catch { setToast({ type: 'error', msg: 'Failed to load notification settings' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  const toggle = async (id, field, current) => {
    try {
      await updateNotificationSetting(id, { [field]: !current });
      setTypes(prev => prev.map(t => t.notification_types_id === id ? { ...t, [field]: !current } : t));
      setToast({ type: 'success', msg: `Setting updated` });
    } catch { setToast({ type: 'error', msg: 'Failed to update' }); }
  };

  const handleCreate = async () => {
    try {
      await createNotificationSetting(form);
      setModal(false);
      setForm({ key: '', name: '', description: '', category: 'system', default_type: 'info' });
      load();
      setToast({ type: 'success', msg: 'Notification type created' });
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.error || 'Failed to create' });
    }
  };

  const handleDelete = async (row) => {
    if (row.is_system) return;
    if (!(await confirm(`Delete "${row.name}"?`, { danger: true }))) return;
    try {
      await deleteNotificationSetting(row.notification_types_id);
      load();
      setToast({ type: 'success', msg: 'Notification type deleted' });
    } catch { setToast({ type: 'error', msg: 'Failed to delete' }); }
  };

  // Group by category
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || cat,
    items: types.filter(t => t.category === cat),
  })).filter(g => g.items.length > 0);

  // KPIs
  const total = types.length;
  const inAppActive = types.filter(t => t.in_app_enabled).length;
  const emailActive = types.filter(t => t.email_enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-err' : 'toast-ok'}`}>
          {toast.msg}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Types</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-icon"><Bell size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">In-App Active</div>
          <div className="kpi-value">{inAppActive}</div>
          <div className="kpi-icon"><BellRing size={40} /></div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-label">Email Active</div>
          <div className="kpi-value">{emailActive}</div>
          <div className="kpi-icon"><Mail size={40} /></div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} color="#2563eb" /> Notification Types
        </h3>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={15} /> New Type
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div>
      ) : (
        grouped.map(group => (
          <div key={group.category} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px',
              background: 'var(--bg-secondary, #f8fafc)',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
            }}>
              {group.label}
            </div>
            {group.items.map(row => {
              const T = TYPE_ICON[row.default_type] || TYPE_ICON.info;
              return (
                <div key={row.notification_types_id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                }}>
                  <T.icon size={18} color={T.color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {row.name}
                      {row.is_system && (
                        <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px' }}>System</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {row.description || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>
                      {row.key}
                    </div>
                  </div>

                  {/* In-App Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>In-App</span>
                    <button
                      onClick={() => isAdmin && toggle(row.notification_types_id, 'in_app_enabled', row.in_app_enabled)}
                      disabled={!isAdmin}
                      title={row.in_app_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: isAdmin ? 'pointer' : 'default',
                        background: row.in_app_enabled ? '#2563eb' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                        opacity: isAdmin ? 1 : 0.5,
                      }}
                    >
                      <span className="toggle-knob" style={{
                        position: 'absolute', top: 3, left: row.in_app_enabled ? 23 : 3,
                        width: 18, height: 18, borderRadius: '50%',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s',
                      }} />
                    </button>
                  </div>

                  {/* Email Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Email</span>
                    <button
                      onClick={() => isAdmin && toggle(row.notification_types_id, 'email_enabled', row.email_enabled)}
                      disabled={!isAdmin}
                      title={row.email_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: isAdmin ? 'pointer' : 'default',
                        background: row.email_enabled ? '#2563eb' : '#cbd5e1',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                        opacity: isAdmin ? 1 : 0.5,
                      }}
                    >
                      <span className="toggle-knob" style={{
                        position: 'absolute', top: 3, left: row.email_enabled ? 23 : 3,
                        width: 18, height: 18, borderRadius: '50%',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s',
                      }} />
                    </button>
                  </div>

                  {/* Delete (custom only) */}
                  {isAdmin && !row.is_system && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444', padding: '4px 8px' }}
                      onClick={() => handleDelete(row)}
                      title="Delete custom type"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {/* Spacer for system rows without delete */}
                  {(row.is_system || !isAdmin) && <div style={{ width: 38 }} />}
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Create Modal */}
      <CrudModal
        open={modal}
        title="New Notification Type"
        onClose={() => setModal(false)}
        onSave={handleCreate}
        form={form}
        setField={(k, v) => setForm(prev => ({ ...prev, [k]: v }))}
        fields={[
          { key: 'key', label: 'Key *', placeholder: 'e.g. budget_exceeded' },
          { key: 'name', label: 'Name *', placeholder: 'e.g. Budget Exceeded' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'category', label: 'Category', type: 'select',
            options: CATEGORY_ORDER.map(c => ({ value: c, label: CATEGORY_LABELS[c] })) },
          { key: 'default_type', label: 'Severity', type: 'select',
            options: [
              { value: 'info', label: 'Info' },
              { value: 'warning', label: 'Warning' },
              { value: 'success', label: 'Success' },
              { value: 'error', label: 'Error' },
            ] },
        ]}
      />
    </div>
  );
}
