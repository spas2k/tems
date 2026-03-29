/**
 * @file User detail page with SSO config, activity, and assignments.
 * @module UserDetail
 *
 * Shows user info, role assignment, SSO fields, assigned invoices/orders, recent activity, and change history.
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Users, Receipt, ShoppingCart, Activity, SlidersHorizontal,
  MessageSquare, KeyRound, Shield, Clock, ExternalLink, Mail, User,
  ShieldOff, ShieldCheck, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUser, updateUser, setUserStatus, getRoles, getUserInvoices, getUserOrders, getUserActivity } from '../api';
import DetailHeader from '../components/DetailHeader';
import MultiStatusSlider from '../components/MultiStatusSlider';
import ChangeHistory from '../components/ChangeHistory';
import { getRoleColor, getRoleScheme, COLOR_SCHEMES } from '../utils/roleColors';
import dayjs from 'dayjs';

const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'];
const STATUS_BADGE = { Active: 'badge badge-green', Inactive: 'badge badge-red', Suspended: 'badge badge-red' };
const ROLE_BADGE   = { Admin: 'badge badge-purple', Manager: 'badge badge-blue', Analyst: 'badge badge-blue', Viewer: 'badge badge-gray' };
const INV_STATUS   = { Pending: 'badge badge-blue', Approved: 'badge badge-green', Paid: 'badge badge-green', Disputed: 'badge badge-red', Open: 'badge badge-blue' };
const ORD_STATUS   = { Pending: 'badge badge-blue', 'In Progress': 'badge badge-orange', Completed: 'badge badge-green', Cancelled: 'badge badge-red' };

const NAV_SECTIONS = [
  { key: 'details',   label: 'User Details',      Icon: SlidersHorizontal },
  { key: 'sso',       label: 'SSO Configuration',  Icon: KeyRound },
  { key: 'invoices',  label: 'Assigned Invoices',  Icon: Receipt },
  { key: 'orders',    label: 'Assigned Orders',    Icon: ShoppingCart },
  { key: 'activity',  label: 'Activity & History', Icon: MessageSquare },
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

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { isAdmin, refreshUser } = useAuth();
  const canUpdate = isAdmin;

  const [user,      setUser]      = useState(null);
  const [roles,     setRoles]     = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [activity,  setActivity]  = useState([]);
  const [form,      setForm]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [dirty,     setDirty]     = useState(false);
  const [toast,     setToast]     = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const refs = {
    details:  useRef(null), sso: useRef(null),
    invoices: useRef(null), orders: useRef(null), activity: useRef(null),
  };
  const scrollTo = key => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUser(id), getRoles(), getUserInvoices(id), getUserOrders(id), getUserActivity(id),
    ])
      .then(([u, r, inv, ord, act]) => {
        setUser(u.data);
        setPageTitle(u.data.display_name);
        setRoles(r.data);
        setInvoices(inv.data);
        setOrders(ord.data);
        setActivity(act.data);
        setForm({
          display_name: u.data.display_name || '',
          email:        u.data.email || '',
          roles_id:     String(u.data.roles_id || ''),
          status:       u.data.status || 'Active',
          avatar_url:   u.data.avatar_url || '',
          sso_subject:  u.data.sso_subject || '',
          sso_provider: u.data.sso_provider || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.display_name) {
      window.dispatchEvent(new CustomEvent('tems-recent-item', {
        detail: { path: `/users/${id}`, label: user.display_name, type: 'user' },
      }));
    }
  }, [user]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        roles_id: Number(form.roles_id),
        sso_subject:  form.sso_subject || null,
        sso_provider: form.sso_provider || null,
        avatar_url:   form.avatar_url || null,
      };
      const updated = await updateUser(id, payload);
      setUser(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('User saved successfully.');
      refreshUser();
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setSuspending(true);
    try {
      const updated = await setUserStatus(id, newStatus);
      setUser(updated.data);
      setForm(f => ({ ...f, status: updated.data.status }));
      setHistoryKey(k => k + 1);
      showToast(
        newStatus === 'Suspended'
          ? `${updated.data.display_name} has been suspended.`
          : `${updated.data.display_name} has been reactivated.`
      );
      refreshUser();
    } catch (err) {
      showToast(err.response?.data?.error || 'Status update failed.', false);
    } finally {
      setSuspending(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading user…</div>;
  if (!user) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>User not found.</div>;
  if (!isAdmin) return <div style={{ padding: 32, color: '#ef4444' }}>Access denied — Admin role required.</div>;

  const roleName = roles.find(r => r.roles_id === user.roles_id)?.name || user.role_name;
  const hasSSO   = !!(user.sso_subject || user.sso_provider);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? 'var(--bg-success)' : 'var(--bg-error)',
          color: toast.ok ? 'var(--text-success)' : 'var(--text-error)',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      {/* ── Header ─────────────────────────────────────── */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-back" onClick={() => navigate('/users')}>
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--icon-bg-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={18} color="#2563eb" />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{user.display_name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={10} /> {user.email}
              </div>
            </div>
          </div>
          <span className={ROLE_BADGE[roleName] || 'badge badge-gray'}>{roleName}</span>
          <span className={STATUS_BADGE[user.status] || 'badge badge-gray'}>{user.status}</span>
          {hasSSO && <span className="badge badge-blue" style={{ fontSize: 10 }}>SSO</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 6px' }}>
            {NAV_SECTIONS.map(({ key, label, Icon }) => (
              <NavIcon key={key} label={label} Icon={Icon} onClick={() => scrollTo(key)} />
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
          {canUpdate && (
            <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </DetailHeader>

      {/* ── KPI Cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Assigned Invoices</div>
          <div className="kpi-value">{user.assigned_invoices_count ?? invoices.length}</div>
          <div className="kpi-icon"><Receipt size={36} /></div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Assigned Orders</div>
          <div className="kpi-value">{user.assigned_orders_count ?? orders.length}</div>
          <div className="kpi-icon"><ShoppingCart size={36} /></div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Audit Actions</div>
          <div className="kpi-value">{user.audit_actions_count ?? activity.length}</div>
          <div className="kpi-icon"><Activity size={36} /></div>
        </div>
        <div className="kpi-card gray">
          <div className="kpi-label">Last Login</div>
          <div className="kpi-value" style={{ fontSize: 15 }}>
            {user.last_login ? dayjs(user.last_login).format('MM/DD/YY HH:mm') : 'Never'}
          </div>
          <div className="kpi-icon"><Clock size={36} /></div>
        </div>
      </div>

      {/* ── User Details ───────────────────────────────── */}
      <div className="page-card" ref={refs.details} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>User Details</span>
          <MultiStatusSlider value={form.status} options={STATUS_OPTS} onChange={newStatus => handleStatusChange(newStatus)} disabled={!canUpdate} />
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Display Name *">
            <input className="form-input" value={form.display_name} disabled={!canUpdate}
              onChange={e => set('display_name', e.target.value)} />
          </Field>
          <Field label="Email Address *">
            <input className="form-input" type="email" value={form.email} disabled={!canUpdate}
              onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="Role *">
            {(() => {
              const current = roles.find(r => String(r.roles_id) === String(form.roles_id));
              const { color, bg, text } = current
                ? getRoleScheme(current)
                : { color: '#64748b', bg: '#e2e8f0', text: '#1e293b' };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Current role display */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 20,
                      background: bg, color: text,
                      fontWeight: 700, fontSize: 13,
                      border: `1px solid ${color}33`,
                    }}>
                      <Shield size={12} color={color} />
                      {current?.name || '—'}
                    </span>
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => setRolePickerOpen(o => !o)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px',
                          borderRadius: 6, cursor: 'pointer',
                          background: 'transparent',
                          border: '1px solid #e2e8f0',
                          color: '#64748b',
                        }}
                      >
                        {rolePickerOpen ? 'Cancel' : 'Change'}
                      </button>
                    )}
                  </div>
                  {/* Expanded picker */}
                  {rolePickerOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {roles.map((r, idx) => {
                        const { color: rcolor, bg: rbg, text: rtext } = getRoleScheme(r, idx);
                        const active  = String(form.roles_id) === String(r.roles_id);
                        return (
                          <button
                            key={r.roles_id}
                            type="button"
                            onClick={() => { set('roles_id', String(r.roles_id)); setRolePickerOpen(false); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '7px 10px', borderRadius: 9, cursor: 'pointer',
                              border: active ? `2px solid ${rcolor}` : '2px solid #e2e8f0',
                              background: active ? rbg : '#fafafa',
                              transition: 'all 0.12s', textAlign: 'left', outline: 'none',
                            }}
                          >
                            <div style={{
                              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                              background: active ? rcolor : '#e2e8f0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Shield size={12} color={active ? '#fff' : '#94a3b8'} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: active ? rtext : '#334155' }}>
                                {r.name}
                              </div>
                              {r.description && (
                                <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {r.description}
                                </div>
                              )}
                            </div>
                            {active && (
                              <div style={{ width: 16, height: 16, borderRadius: '50%', background: rcolor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Check size={9} color="#fff" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </Field>
          <Field label="Avatar URL">
            <input className="form-input" value={form.avatar_url} disabled={!canUpdate}
              onChange={e => set('avatar_url', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Member Since">
            <input className="form-input" value={user.created_at ? dayjs(user.created_at).format('MMMM D, YYYY') : '—'} disabled />
          </Field>
        </div>
      </div>

      {/* ── SSO Configuration ──────────────────────────── */}
      <div className="page-card" ref={refs.sso} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} color="#7c3aed" /> SSO Configuration
          </span>
          {hasSSO
            ? <span className="badge badge-green">Linked</span>
            : <span className="badge badge-gray">Not linked</span>}
        </div>
        <div style={{ padding: 20 }}>
          <div style={{
            background: '#f0f9ff', borderRadius: 10, padding: '14px 18px', marginBottom: 18,
            fontSize: 12, color: '#1e40af', lineHeight: 1.6, border: '1px solid #bfdbfe',
          }}>
            <strong>SSO Integration</strong> — These fields will be automatically populated when
            Single Sign-On is configured with your identity provider (Azure AD, Okta, Auth0, etc.).
            The <strong>Subject ID</strong> is the unique identifier from the IdP, and
            the <strong>Provider</strong> identifies which IdP issued the credential.
            Until SSO is enabled, users authenticate via the dev bypass.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="SSO Subject ID">
              <input className="form-input" value={form.sso_subject} disabled={!canUpdate}
                onChange={e => set('sso_subject', e.target.value)}
                placeholder="e.g. 00u1a2b3c4d5e6f7g8h9" />
            </Field>
            <Field label="SSO Provider">
              <input className="form-input" value={form.sso_provider} disabled={!canUpdate}
                onChange={e => set('sso_provider', e.target.value)}
                placeholder="e.g. azure-ad, okta, auth0" />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Assigned Invoices ──────────────────────────── */}
      <div className="page-card" ref={refs.invoices} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count"
            style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={16} color="#dc2626" /> Assigned Invoices
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </span>
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Receipt size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No invoices assigned</div>
            <div style={{ fontSize: 11 }}>Assign invoices to this user from the Invoice detail page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.invoices_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => navigate(`/invoices/${inv.invoices_id}`)}>
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td>{inv.account_name || '—'}</td>
                  <td>{inv.invoice_date ? dayjs(inv.invoice_date).format('MM/DD/YYYY') : '—'}</td>
                  <td style={{ fontWeight: 700 }}>
                    {inv.total_amount != null
                      ? `$${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td><span className={INV_STATUS[inv.status] || 'badge badge-gray'}>{inv.status || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Assigned Orders ────────────────────────────── */}
      <div className="page-card" ref={refs.orders} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count"
            style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={16} color="#d97706" /> Assigned Orders
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <ShoppingCart size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No orders assigned</div>
            <div style={{ fontSize: 11 }}>Assign orders to this user from the Order detail page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Vendor</th>
                <th>Contract</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(ord => (
                <tr key={ord.orders_id}>
                  <td>
                    <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${ord.orders_id}`)}>
                      {ord.order_number}
                    </span>
                  </td>
                  <td>{ord.vendor_name || '—'}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{ord.contract_number || '—'}</td>
                  <td>{ord.order_date ? dayjs(ord.order_date).format('MM/DD/YYYY') : '—'}</td>
                  <td><span className={ORD_STATUS[ord.status] || 'badge badge-gray'}>{ord.status || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Recent Activity ────────────────────────────── */}
      <div className="page-card" ref={refs.activity} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count"
            style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="#0d9488" /> Recent Activity
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Last {activity.length} action{activity.length !== 1 ? 's' : ''}
          </span>
        </div>
        {activity.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Activity size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No recorded activity</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Record ID</th>
              </tr>
            </thead>
            <tbody>
              {activity.map(a => {
                const actionBadge = a.action === 'CREATE' ? 'badge badge-green'
                  : a.action === 'UPDATE' ? 'badge badge-blue'
                  : a.action === 'DELETE' ? 'badge badge-red' : 'badge badge-gray';
                return (
                  <tr key={a.audit_log_id}>
                    <td style={{ fontSize: 12, color: '#64748b' }}>
                      {dayjs(a.created_at).format('MM/DD/YY HH:mm:ss')}
                    </td>
                    <td><span className={actionBadge}>{a.action}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.resource}</td>
                    <td>{a.resource_id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Change History ─────────────────────────────── */}
      <div>
        <ChangeHistory resource="users" resourceId={id} refreshKey={historyKey} />
      </div>
    </div>
  );
}
