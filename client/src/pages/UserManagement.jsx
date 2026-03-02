import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, ShieldCheck, Plus, Pencil, Trash2, ChevronDown, Check, X } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, getRoles } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'];

export default function UserManagement() {
  const { isAdmin, refreshUser } = useAuth();
  const [users, setUsers]   = useState([]);
  const [roles, setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [toast, setToast]   = useState(null);
  const toastTimer = useRef();

  /* ── modal state ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);      // null = create
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);

  const flash = (msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([getUsers(), getRoles()]);
      setUsers(u.data);
      setRoles(r.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── open / close ── */
  const openCreate = () => {
    setEditing(null);
    setForm({ email: '', display_name: '', roles_id: roles[0]?.roles_id || '', status: 'Active' });
    setModalOpen(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ email: u.email, display_name: u.display_name, roles_id: u.roles_id, status: u.status });
    setModalOpen(true);
  };
  const close = () => { setModalOpen(false); setEditing(null); };

  /* ── save ── */
  const handleSave = async () => {
    if (!form.email || !form.display_name) return flash('Email and display name are required.', 'error');
    setSaving(true);
    try {
      if (editing) {
        await updateUser(editing.users_id, form);
        flash('User updated');
      } else {
        await createUser(form);
        flash('User created');
      }
      close();
      await load();
      refreshUser();
    } catch (e) {
      flash(e.response?.data?.error || e.message, 'error');
    } finally { setSaving(false); }
  };

  /* ── delete ── */
  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.display_name}"?`)) return;
    try {
      await deleteUser(u.users_id);
      flash('User deleted');
      load();
    } catch (e) {
      flash(e.response?.data?.error || e.message, 'error');
    }
  };

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>Loading users…</div>;
  if (error)   return <div style={{ padding: 32, color: '#ef4444' }}>Error: {error}</div>;
  if (!isAdmin) return <div style={{ padding: 32, color: '#ef4444' }}>Access denied — Admin role required.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 8,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: toast.type === 'error' ? '#b91c1c' : '#15803d',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          fontWeight: 600, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Users</div>
          <div className="kpi-value">{users.length}</div>
          <div className="kpi-icon"><Users size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{users.filter(u => u.status === 'Active').length}</div>
          <div className="kpi-icon"><ShieldCheck size={40} /></div>
        </div>
        <div className="kpi-card gray">
          <div className="kpi-label">Roles Defined</div>
          <div className="kpi-value">{roles.length}</div>
          <div className="kpi-icon"><ShieldCheck size={40} /></div>
        </div>
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* table */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              {['Display Name', 'Email', 'Role', 'Status', 'Last Login', ''].map(h => (
                <th key={h} style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.users_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.display_name}</td>
                <td style={{ padding: '10px 12px', color: '#3b82f6' }}>{u.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="badge badge-blue">{u.role_name}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`badge ${u.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{u.status}</span>
                </td>
                <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>
                  {u.last_login ? new Date(u.last_login).toLocaleString() : '—'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openEdit(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 4 }} title="Edit"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(u)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }} title="Delete"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={close}>
          <div style={{
            background: '#fff', borderRadius: 12, width: 460, padding: 28,
            boxShadow: '0 20px 60px rgba(0,0,0,.25)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 20, fontSize: 16 }}>{editing ? 'Edit User' : 'Add User'}</h3>

            <label style={lbl}>Display Name *</label>
            <input style={inp} value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />

            <label style={lbl}>Email *</label>
            <input style={inp} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

            <label style={lbl}>Role</label>
            <select style={inp} value={form.roles_id} onChange={e => setForm({ ...form, roles_id: Number(e.target.value) })}>
              {roles.map(r => <option key={r.roles_id} value={r.roles_id}>{r.name}</option>)}
            </select>

            <label style={lbl}>Status</label>
            <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, marginTop: 12 };
const inp = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
