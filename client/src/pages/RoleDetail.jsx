/**
 * @file Role detail page with permissions matrix and assigned users.
 * @module RoleDetail
 *
 * Shows role info, full permissions grid (23 resources × 4 actions), assigned user list, and change history.
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Shield, Users, KeyRound, Clock, Activity,
  User, Mail, Check, X, SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRole, updateRole, getRoleUsers } from '../api';
import DetailHeader from '../components/DetailHeader';
import ChangeHistory from '../components/ChangeHistory';
import { COLOR_SCHEMES, getRoleColor } from '../utils/roleColors';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const STATUS_BADGE = {
  Active:    'badge badge-green',
  Inactive:  'badge badge-red',
  Suspended: 'badge badge-red',
};

const NAV_SECTIONS = [
  { key: 'details',     label: 'Role Details',    Icon: SlidersHorizontal },
  { key: 'permissions', label: 'Permissions',     Icon: KeyRound },
  { key: 'users',       label: 'Assigned Users',  Icon: Users },
  { key: 'history',     label: 'Change History',  Icon: Activity },
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

// Group permissions by resource for the matrix display
function groupPermissions(permissions) {
  const map = {};
  for (const p of permissions) {
    if (!map[p.resource]) map[p.resource] = new Set();
    map[p.resource].add(p.action);
  }
  return map;
}

const ACTIONS = ['create', 'read', 'update', 'delete'];
const ACTION_COLORS = {
  create: '#2563eb',
  read:   '#0d9488',
  update: '#d97706',
  delete: '#ef4444',
};

export default function RoleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { isAdmin } = useAuth();

  const [role,       setRole]       = useState(null);
  const [users,      setUsers]      = useState([]);
  const [form,       setForm]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [dirty,      setDirty]      = useState(false);
  const [toast,      setToast]      = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const refs = {
    details:     useRef(null),
    permissions: useRef(null),
    users:       useRef(null),
    history:     useRef(null),
  };
  const scrollTo = key => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getRole(id), getRoleUsers(id)])
      .then(([roleRes, usersRes]) => {
        const r = roleRes.data;
        setRole(r);
        setPageTitle(r.name);
        setUsers(usersRes.data || []);
        setForm({ name: r.name || '', description: r.description || '', color: r.color || '' });
      })
      .catch(() => showToast('Failed to load role', false))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Role name is required', false); return; }
    setSaving(true);
    try {
      const updated = await updateRole(id, { name: form.name.trim(), description: form.description.trim(), color: form.color || null });
      setRole(r => ({ ...r, ...updated.data }));
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Role saved successfully.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8', fontSize: 14 }}>
      Loading…
    </div>
  );
  if (!role) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Role not found.</div>
  );

  const isAdminRole  = role.name === 'Admin';
  const permMap      = groupPermissions(role.permissions || []);
  const roleColor    = getRoleColor(role);
  const activeUsers  = users.filter(u => u.status === 'Active').length;

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

      {/* ── Sticky Header ──────────────────────────────── */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-back" onClick={() => navigate('/roles')}>
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${roleColor}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color={roleColor} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{role.name}</div>
            {role.description && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{role.description}</div>
            )}
          </div>
          {isAdminRole && (
            <span className="badge badge-blue" style={{ fontSize: 10 }}>System Role</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 6px' }}>
            {NAV_SECTIONS.map(({ key, label, Icon }) => (
              <NavIcon key={key} label={label} Icon={Icon} onClick={() => scrollTo(key)} />
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <button
            className="btn"
            onClick={() => navigate('/role-permissions')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontWeight: 600 }}
          >
            <KeyRound size={13} /> Edit Permissions
          </button>
          {dirty && !isAdminRole && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
          {isAdmin && !isAdminRole && (
            <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </DetailHeader>

      {/* ── KPI Cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Permissions</div>
          <div className="kpi-value">{(role.permissions || []).length}</div>
          <div className="kpi-icon"><KeyRound size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Assigned Users</div>
          <div className="kpi-value">{users.length}</div>
          <div className="kpi-icon"><Users size={40} /></div>
        </div>
        <div className="kpi-card teal">
          <div className="kpi-label">Active Users</div>
          <div className="kpi-value">{activeUsers}</div>
          <div className="kpi-icon"><User size={40} /></div>
        </div>
      </div>

      {/* ── Role Details ───────────────────────────────── */}
      <div className="page-card" ref={refs.details} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Role Details</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Role Name *">
            <input
              className="form-input"
              value={form?.name ?? ''}
              disabled={!isAdmin || isAdminRole}
              onChange={e => set('name', e.target.value)}
            />
          </Field>
          <Field label="Created">
            <input className="form-input"
              value={role.created_at ? dayjs(role.created_at).format('MMMM D, YYYY') : '—'}
              disabled />
          </Field>
          <Field label="Description">
            <textarea
              className="form-input"
              rows={3}
              value={form?.description ?? ''}
              disabled={!isAdmin || isAdminRole}
              onChange={e => set('description', e.target.value)}
            />
          </Field>
          <Field label="Last Updated">
            <input className="form-input"
              value={role.updated_at ? dayjs(role.updated_at).format('MMMM D, YYYY HH:mm') : '—'}
              disabled />
          </Field>
        </div>

        {/* Color Theme picker — admins only, non-system roles */}
        {isAdmin && !isAdminRole && (
          <div style={{ padding: '0 20px 20px' }}>
            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Color Theme</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
              {COLOR_SCHEMES.map(scheme => {
                const active = (form?.color || roleColor) === scheme.id;
                return (
                  <button
                    key={scheme.id}
                    type="button"
                    title={scheme.label}
                    onClick={() => set('color', scheme.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                      border: active ? `2px solid ${scheme.color}` : '2px solid #e2e8f0',
                      background: active ? scheme.bg : '#fafafa',
                      transition: 'all 0.15s', outline: 'none',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: scheme.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: active ? `0 0 0 2px ${scheme.bg}, 0 0 0 4px ${scheme.color}` : '0 1px 4px rgba(0,0,0,0.15)',
                      transition: 'box-shadow 0.15s',
                    }}>
                      {active && <Check size={13} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? scheme.text : '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>
                      {scheme.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Permission Matrix (read-only) ──────────────── */}
      <div className="page-card" ref={refs.permissions} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} color="#7c3aed" /> Permissions
          </span>
          <button
            onClick={() => navigate('/role-permissions')}
            style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Edit permissions →
          </button>
        </div>

        {Object.keys(permMap).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <KeyRound size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No permissions assigned</div>
            <div style={{ fontSize: 11 }}>
              Use the <span style={{ color: '#2563eb', cursor: 'pointer' }}
                onClick={() => navigate('/role-permissions')}>Role Permissions</span> page to assign access.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', width: '40%' }}>Resource</th>
                  {ACTIONS.map(a => (
                    <th key={a} style={{ textAlign: 'center', padding: '10px 8px', fontSize: 12, fontWeight: 700, color: ACTION_COLORS[a] }}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(permMap)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([resource, actions]) => (
                    <tr key={resource} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 20px', fontFamily: 'monospace', fontSize: 12, color: '#334155', fontWeight: 600 }}>
                        {resource}
                      </td>
                      {ACTIONS.map(action => (
                        <td key={action} style={{ textAlign: 'center', padding: '8px' }}>
                          {actions.has(action) ? (
                            <div style={{
                              width: 22, height: 22, borderRadius: 6, margin: '0 auto',
                              background: ACTION_COLORS[action],
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Check size={11} color="#fff" strokeWidth={3} />
                            </div>
                          ) : (
                            <div style={{
                              width: 22, height: 22, borderRadius: 6, margin: '0 auto',
                              background: '#f1f5f9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <X size={11} color="#cbd5e1" strokeWidth={2} />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Assigned Users ─────────────────────────────── */}
      <div className="page-card" ref={refs.users} style={{ scrollMarginTop: 80 }}>
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#0d9488" /> Assigned Users
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {users.length} user{users.length !== 1 ? 's' : ''}
          </span>
        </div>

        {users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Users size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No users assigned</div>
            <div style={{ fontSize: 11 }}>Assign this role to users from the Users management page.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Last Activity</th>
                <th>Member Since</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.users_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <User size={14} color="#0284c7" />
                        </div>
                      )}
                      <span
                        style={{ fontWeight: 700, fontSize: 13, color: '#2563eb', cursor: 'pointer' }}
                        onClick={() => navigate(`/users/${u.users_id}`)}
                      >
                        {u.display_name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                      <Mail size={11} />
                      {u.email}
                    </span>
                  </td>
                  <td>
                    <span className={STATUS_BADGE[u.status] || 'badge badge-gray'}>{u.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {u.last_login ? (
                      <span title={dayjs(u.last_login).format('MM/DD/YYYY HH:mm')}>
                        {dayjs(u.last_login).fromNow()}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>Never</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {u.last_action_at ? (
                      <span title={dayjs(u.last_action_at).format('MM/DD/YYYY HH:mm')}>
                        {dayjs(u.last_action_at).fromNow()}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>No activity</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>
                    {u.created_at ? dayjs(u.created_at).format('MM/DD/YYYY') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Change History ─────────────────────────────── */}
      <div ref={refs.history} style={{ scrollMarginTop: 80 }}>
        <ChangeHistory resource="roles" resourceId={id} refreshKey={historyKey} />
      </div>

    </div>
  );
}
