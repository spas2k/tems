/**
 * @file SMTP configuration and email management page.
 * @module EmailConfig
 *
 * Admin page for SMTP settings, notification toggles, test email sending, and email send log viewer.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Server, Shield, Send, CheckCircle, XCircle, Clock,
  Eye, EyeOff, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, Save,
} from 'lucide-react';
import { getEmailConfig, updateEmailConfig, sendTestEmail, getEmailLog } from '../api';
import dayjs from 'dayjs';

const STATUS_BADGE = {
  sent:    { cls: 'badge badge-green',  icon: CheckCircle },
  failed:  { cls: 'badge badge-red',    icon: XCircle },
  pending: { cls: 'badge badge-orange', icon: Clock },
  skipped: { cls: 'badge badge-gray',   icon: ToggleLeft },
};

const TOGGLE_CATEGORIES = [
  { key: 'notify_invoice_assigned', label: 'Invoice Assigned',    desc: 'When an invoice is assigned to a user' },
  { key: 'notify_approval_needed',  label: 'Approval Needed',     desc: 'When an invoice needs approval' },
  { key: 'notify_status_changed',   label: 'Status Changed',      desc: 'When an invoice or order status changes' },
  { key: 'notify_user_created',     label: 'User Created',        desc: 'Welcome email when a user account is created' },
  { key: 'notify_user_suspended',   label: 'User Suspended',      desc: 'When a user account is suspended or reactivated' },
  { key: 'notify_role_changed',     label: 'Role Changed',        desc: 'When a user\'s role assignment changes' },
  { key: 'notify_announcements',    label: 'Announcements',       desc: 'System-wide announcement broadcasts' },
  { key: 'notify_digest',           label: 'Daily Digest',        desc: 'Scheduled summary emails (coming soon)' },
];

export default function EmailConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [log, setLog] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const flash = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load config
  useEffect(() => {
    (async () => {
      try {
        const res = await getEmailConfig();
        setConfig(res.data || {
          enabled: false, smtp_host: '', smtp_port: 587, smtp_secure: false,
          smtp_user: '', smtp_pass: '', from_address: 'tems-noreply@example.com',
          from_name: 'TEMS', reply_to: '', require_tls: true, reject_unauthorized: true,
          notify_invoice_assigned: true, notify_approval_needed: true,
          notify_status_changed: true, notify_user_created: true,
          notify_user_suspended: true, notify_role_changed: true,
          notify_announcements: true, notify_digest: false,
        });
      } catch { flash('Failed to load email config', 'error'); }
      setLoading(false);
    })();
  }, [flash]);

  // Load log
  const loadLog = useCallback(async (page = 1) => {
    try {
      const res = await getEmailLog({ page, limit: 20 });
      setLog(res.data.data);
      setLogTotal(res.data.pagination.total);
      setLogPage(page);
    } catch {}
  }, []);

  useEffect(() => { if (logOpen) loadLog(1); }, [logOpen, loadLog]);

  const update = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateEmailConfig(config);
      setConfig(res.data);
      setDirty(false);
      flash('Email configuration saved');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testEmail) return flash('Enter a test email address', 'error');
    setTesting(true);
    try {
      const res = await sendTestEmail({ to: testEmail });
      if (res.data.status === 'sent') {
        flash('Test email sent successfully');
      } else {
        flash(`Test email ${res.data.status}: ${res.data.error_message || ''}`, 'error');
      }
      if (logOpen) loadLog(1);
    } catch (err) {
      flash(err.response?.data?.error || 'Test failed', 'error');
    }
    setTesting(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Loader2 size={28} className="spin" style={{ color: '#94a3b8' }} />
    </div>
  );

  if (!config) return null;

  const isConfigured = config.smtp_host && config.smtp_port;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-err' : 'toast-ok'}`}>
          {toast.msg}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className={`kpi-card ${config.enabled ? 'green' : 'slate'}`}>
          <div className="kpi-label">Email Status</div>
          <div className="kpi-value">{config.enabled ? 'Enabled' : 'Disabled'}</div>
          <div className="kpi-icon"><Mail size={40} /></div>
        </div>
        <div className={`kpi-card ${isConfigured ? 'blue' : 'orange'}`}>
          <div className="kpi-label">SMTP Server</div>
          <div className="kpi-value" style={{ fontSize: 16, wordBreak: 'break-all' }}>
            {isConfigured ? `${config.smtp_host}:${config.smtp_port}` : 'Not Configured'}
          </div>
          <div className="kpi-icon"><Server size={40} /></div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Active Notifications</div>
          <div className="kpi-value">
            {TOGGLE_CATEGORIES.filter(c => config[c.key]).length} / {TOGGLE_CATEGORIES.length}
          </div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
      </div>

      {/* Connection Status Warning */}
      {!isConfigured && config.enabled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
          background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, fontSize: 13, color: '#92400e',
        }}>
          <AlertTriangle size={16} />
          Email is enabled but SMTP is not configured. Emails will be logged but not delivered.
        </div>
      )}

      {/* Master Toggle */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Email Notifications</span>
          <button
            onClick={() => update('enabled', !config.enabled)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            title={config.enabled ? 'Disable email' : 'Enable email'}
          >
            {config.enabled
              ? <ToggleRight size={32} color="#10b981" />
              : <ToggleLeft size={32} color="#94a3b8" />}
          </button>
        </div>
        <div style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>
          {config.enabled
            ? 'Emails will be sent for enabled notification categories below.'
            : 'All email notifications are currently disabled. Toggle on to enable.'}
        </div>
      </div>

      {/* SMTP Connection */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>SMTP Connection</span>
          {dirty && (
            <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} /> Unsaved changes</span>
          )}
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label className="form-label" style={{ gridColumn: '1 / -1' }}>
            SMTP Host
            <input className="form-input" placeholder="smtp.example.com" value={config.smtp_host || ''}
              onChange={e => update('smtp_host', e.target.value)} />
          </label>
          <label className="form-label">
            Port
            <input className="form-input" type="number" placeholder="587" value={config.smtp_port || ''}
              onChange={e => update('smtp_port', parseInt(e.target.value) || '')} />
          </label>
          <label className="form-label">
            Security
            <select className="form-input" value={config.smtp_secure ? 'true' : 'false'}
              onChange={e => update('smtp_secure', e.target.value === 'true')}>
              <option value="false">STARTTLS (port 587)</option>
              <option value="true">Implicit TLS (port 465)</option>
            </select>
          </label>
          <label className="form-label">
            Username
            <input className="form-input" placeholder="user@example.com" value={config.smtp_user || ''}
              onChange={e => update('smtp_user', e.target.value)} />
          </label>
          <label className="form-label">
            Password
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPass ? 'text' : 'password'}
                placeholder="••••••••" value={config.smtp_pass || ''}
                onChange={e => update('smtp_pass', e.target.value)}
                style={{ paddingRight: 38 }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.require_tls !== false}
                onChange={e => update('require_tls', e.target.checked)} />
              Require TLS
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.reject_unauthorized !== false}
                onChange={e => update('reject_unauthorized', e.target.checked)} />
              Reject self-signed certs
            </label>
          </div>
        </div>
      </div>

      {/* Sender Info */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Sender Information</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label className="form-label">
            From Address
            <input className="form-input" placeholder="tems-noreply@example.com" value={config.from_address || ''}
              onChange={e => update('from_address', e.target.value)} />
          </label>
          <label className="form-label">
            From Name
            <input className="form-input" placeholder="TEMS" value={config.from_name || ''}
              onChange={e => update('from_name', e.target.value)} />
          </label>
          <label className="form-label" style={{ gridColumn: '1 / -1' }}>
            Reply-To Address (optional)
            <input className="form-input" placeholder="support@example.com" value={config.reply_to || ''}
              onChange={e => update('reply_to', e.target.value)} />
          </label>
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Notification Categories</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            {TOGGLE_CATEGORIES.filter(c => config[c.key]).length} of {TOGGLE_CATEGORIES.length} enabled
          </span>
        </div>
        <div style={{ padding: '4px 20px 8px' }}>
          <div style={{ fontSize: 12, color: '#64748b', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
            Control which event types trigger email notifications. Users can also opt-out individually from their preferences.
          </div>
          {TOGGLE_CATEGORIES.map((cat, i) => (
            <div key={cat.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: i < TOGGLE_CATEGORIES.length - 1 ? '1px solid #e2e8f0' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{cat.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{cat.desc}</div>
              </div>
              <button
                onClick={() => update(cat.key, !config[cat.key])}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
              >
                {config[cat.key]
                  ? <ToggleRight size={28} color="#10b981" />
                  : <ToggleLeft size={28} color="#94a3b8" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save + Test */}
      <div className="page-card">
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="form-input" placeholder="test@example.com" value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              style={{ width: 220, fontSize: 13 }} />
            <button className="btn btn-ghost" onClick={handleTest} disabled={testing || !config.enabled}
              title={!config.enabled ? 'Enable email first' : 'Send a test email'}>
              {testing ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              Send Test
            </button>
          </div>
        </div>
      </div>

      {/* Email Log */}
      <div className="page-card">
        <div className="page-card-header" style={{ cursor: 'pointer' }} onClick={() => setLogOpen(p => !p)}>
          <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            Email Log
            {logTotal > 0 && <span className="badge badge-gray" style={{ fontSize: 10 }}>{logTotal}</span>}
          </span>
          {logOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {logOpen && (
          <>
            {log.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No emails sent yet
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>To</th>
                        <th>Subject</th>
                        <th>User</th>
                        <th>Sent</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.map(row => {
                        const badge = STATUS_BADGE[row.status] || STATUS_BADGE.pending;
                        const Icon = badge.icon;
                        return (
                          <tr key={row.email_log_id}>
                            <td>
                              <span className={badge.cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon size={12} /> {row.status}
                              </span>
                            </td>
                            <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.to_address}
                            </td>
                            <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.subject}
                            </td>
                            <td>{row.display_name || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {row.sent_at ? dayjs(row.sent_at).format('MM/DD HH:mm') : row.created_at ? dayjs(row.created_at).format('MM/DD HH:mm') : '—'}
                            </td>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: row.error_message ? '#dc2626' : undefined }}>
                              {row.error_message || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {logTotal > 20 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
                    <button className="btn btn-ghost btn-sm" disabled={logPage <= 1}
                      onClick={() => loadLog(logPage - 1)}>Prev</button>
                    <span className="pagination-page-indicator">
                      Page {logPage} of {Math.ceil(logTotal / 20)}
                    </span>
                    <button className="btn btn-ghost btn-sm" disabled={logPage >= Math.ceil(logTotal / 20)}
                      onClick={() => loadLog(logPage + 1)}>Next</button>
                  </div>
                )}

                <div style={{ padding: '8px 16px', textAlign: 'right', borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => loadLog(logPage)}>
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
