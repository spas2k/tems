/**
 * @file Invoice Approvers management page.
 * @module InvoiceApprovers
 *
 * Manages approval level thresholds and per-user primary/alternate approver
 * assignments across 3 approval tiers with searchable user lookup popups.
 */
import React, { useContext, useEffect, useState, useMemo } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck, Shield, Save, Pencil, Search, ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  getApprovalLevels, updateApprovalLevel,
  getInvoiceApprovers, saveInvoiceApprovers,
  getUsers,
} from '../api';
import LookupField from '../components/LookupField';
import { LOOKUP_USERS } from '../utils/lookupConfigs';

const LEVEL_COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];

const fmt = n => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '∞';

export default function InvoiceApprovers() {
  const { setPageTitle } = useContext(PageTitleContext) || {};
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('invoices', 'update');

  const [levels, setLevels]         = useState([]);
  const [approvers, setApprovers]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);

  // Level editing
  const [editLevel, setEditLevel]   = useState(null);
  const [levelForm, setLevelForm]   = useState({});

  // User assignment editing
  const [editUserId, setEditUserId] = useState(null);
  const [userForm, setUserForm]     = useState({});
  const [saving, setSaving]         = useState(false);

  // Search / filter
  const [search, setSearch]         = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { setPageTitle?.('Invoice Approvers'); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [lv, ap, us] = await Promise.all([getApprovalLevels(), getInvoiceApprovers(), getUsers()]);
      setLevels(lv.data);
      setApprovers(ap.data);
      setUsers(us.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* Group approvers by user */
  const approverMap = useMemo(() => {
    const map = {};
    for (const a of approvers) {
      if (!map[a.users_id]) map[a.users_id] = {};
      map[a.users_id][a.level] = a;
    }
    return map;
  }, [approvers]);

  /* Filtered active users */
  const filteredUsers = useMemo(() => {
    const all = users.filter(u => u.status === 'Active');
    if (!search) return all;
    const lower = search.toLowerCase();
    return all.filter(u =>
      u.display_name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    );
  }, [users, search]);

  /* ── Level threshold editing ── */
  const startEditLevel = (lv) => {
    setEditLevel(lv.approval_levels_id);
    setLevelForm({ name: lv.name, min_amount: lv.min_amount ?? '', max_amount: lv.max_amount ?? '' });
  };

  const saveLevel = async (lvId) => {
    try {
      await updateApprovalLevel(lvId, {
        name: levelForm.name,
        min_amount: levelForm.min_amount === '' ? 0 : Number(levelForm.min_amount),
        max_amount: levelForm.max_amount === '' ? null : Number(levelForm.max_amount),
      });
      setEditLevel(null);
      await load();
      showToast('Approval level updated.');
    } catch { showToast('Failed to save level.', false); }
  };

  /* ── User approver editing ── */
  const startEditUser = (userId) => {
    const existing = approverMap[userId] || {};
    const form = {};
    for (const lv of [1, 2, 3]) {
      form[lv] = {
        primary_approver_id: existing[lv]?.primary_approver_id || '',
        alternate_approver_id: existing[lv]?.alternate_approver_id || '',
      };
    }
    setEditUserId(userId);
    setUserForm(form);
  };

  const saveUser = async () => {
    if (!editUserId) return;
    setSaving(true);
    try {
      const levelsPayload = [1, 2, 3].map(lv => ({
        level: lv,
        primary_approver_id: userForm[lv]?.primary_approver_id || null,
        alternate_approver_id: userForm[lv]?.alternate_approver_id || null,
      }));
      await saveInvoiceApprovers(editUserId, levelsPayload);
      setEditUserId(null);
      await load();
      showToast('Approver assignments saved.');
    } catch { showToast('Failed to save assignments.', false); }
    finally { setSaving(false); }
  };

  const hasAssignment = (userId) => {
    const a = approverMap[userId];
    if (!a) return false;
    return Object.values(a).some(v => v.primary_approver_id || v.alternate_approver_id);
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>;

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

      {/* ── Approval Level Thresholds ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {levels.map((lv, i) => (
          <div key={lv.approval_levels_id} className="page-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${LEVEL_COLORS[i]}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={16} color={LEVEL_COLORS[i]} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Level {lv.level}</span>
              </div>
              {canEdit && editLevel !== lv.approval_levels_id && (
                <button className="btn btn-ghost btn-sm" onClick={() => startEditLevel(lv)}
                  style={{ padding: '4px 8px' }}>
                  <Pencil size={13} />
                </button>
              )}
            </div>

            {editLevel === lv.approval_levels_id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="form-input" placeholder="Level name"
                  value={levelForm.name} onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input className="form-input" type="number" step="0.01" placeholder="Min $"
                    value={levelForm.min_amount} onChange={e => setLevelForm(f => ({ ...f, min_amount: e.target.value }))} />
                  <input className="form-input" type="number" step="0.01" placeholder="Max $ (blank = no limit)"
                    value={levelForm.max_amount} onChange={e => setLevelForm(f => ({ ...f, max_amount: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditLevel(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={() => saveLevel(lv.approval_levels_id)}>
                    <Save size={13} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>{lv.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: LEVEL_COLORS[i] }}>
                  ${fmt(lv.min_amount)} – ${fmt(lv.max_amount)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── User Approver Assignments ── */}
      <div className="page-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="page-card-header" style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={18} />
            <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>User Approver Assignments</span>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              {Object.keys(approverMap).length} users configured
            </span>
          </div>
          <div style={{ position: 'relative', width: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" placeholder="Search users…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13 }} />
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
          padding: '10px 24px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: '#94a3b8',
          borderBottom: '1px solid var(--border)',
        }}>
          <span>User</span>
          <span>Level 1</span>
          <span>Level 2</span>
          <span>Level 3</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
          {filteredUsers.map(u => {
            const ua = approverMap[u.users_id] || {};
            const configured = hasAssignment(u.users_id);
            const isExpanded = expandedUser === u.users_id;
            const isEditing = editUserId === u.users_id;

            return (
              <div key={u.users_id} style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Summary row */}
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                    padding: '12px 24px', alignItems: 'center', fontSize: 13,
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-card-alt)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setExpandedUser(isExpanded ? null : u.users_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.display_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                    </div>
                    {configured && (
                      <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 8px' }}>Configured</span>
                    )}
                  </div>
                  {[1, 2, 3].map(lv => (
                    <div key={lv} style={{ fontSize: 12, color: ua[lv]?.primary_approver_name ? 'var(--text-primary)' : '#64748b' }}>
                      {ua[lv]?.primary_approver_name || '—'}
                    </div>
                  ))}
                  <div style={{ textAlign: 'right' }}>
                    {canEdit && (
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); startEditUser(u.users_id); setExpandedUser(u.users_id); }}
                        style={{ padding: '4px 10px', fontSize: 12 }}>
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail / edit */}
                {isExpanded && (
                  <div style={{ padding: '16px 24px 20px 48px', background: 'var(--bg-card-alt)' }}>
                    {isEditing ? (
                      /* ── Edit Mode ── */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[1, 2, 3].map(lv => {
                          const lvData = levels.find(l => l.level === lv);
                          return (
                            <div key={lv} style={{
                              padding: 16, borderRadius: 10,
                              border: `1px solid ${LEVEL_COLORS[lv - 1]}30`,
                              background: `${LEVEL_COLORS[lv - 1]}08`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <Shield size={14} color={LEVEL_COLORS[lv - 1]} />
                                <span style={{ fontWeight: 700, fontSize: 13 }}>
                                  Level {lv} — {lvData?.name}
                                </span>
                                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                                  ${fmt(lvData?.min_amount)} – ${fmt(lvData?.max_amount)}
                                </span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <LookupField
                                  label="Primary Approver"
                                  {...LOOKUP_USERS(users)}
                                  value={userForm[lv]?.primary_approver_id}
                                  onChange={row => setUserForm(f => ({
                                    ...f, [lv]: { ...f[lv], primary_approver_id: row.users_id }
                                  }))}
                                  onClear={() => setUserForm(f => ({
                                    ...f, [lv]: { ...f[lv], primary_approver_id: '' }
                                  }))}
                                  displayValue={users.find(u2 => u2.users_id === Number(userForm[lv]?.primary_approver_id))?.display_name}
                                />
                                <LookupField
                                  label="Alternate Approver"
                                  {...LOOKUP_USERS(users)}
                                  value={userForm[lv]?.alternate_approver_id}
                                  onChange={row => setUserForm(f => ({
                                    ...f, [lv]: { ...f[lv], alternate_approver_id: row.users_id }
                                  }))}
                                  onClear={() => setUserForm(f => ({
                                    ...f, [lv]: { ...f[lv], alternate_approver_id: '' }
                                  }))}
                                  displayValue={users.find(u2 => u2.users_id === Number(userForm[lv]?.alternate_approver_id))?.display_name}
                                />
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" onClick={() => setEditUserId(null)}>Cancel</button>
                          <button className="btn btn-primary" onClick={saveUser} disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Save size={14} /> {saving ? 'Saving…' : 'Save Assignments'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Read-only detail ── */
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                        {[1, 2, 3].map(lv => {
                          const a = ua[lv];
                          const lvData = levels.find(l => l.level === lv);
                          return (
                            <div key={lv} style={{
                              padding: 14, borderRadius: 10,
                              border: `1px solid ${LEVEL_COLORS[lv - 1]}30`,
                              background: `${LEVEL_COLORS[lv - 1]}08`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <Shield size={13} color={LEVEL_COLORS[lv - 1]} />
                                <span style={{ fontWeight: 700, fontSize: 12 }}>Level {lv}</span>
                                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                                  ${fmt(lvData?.min_amount)} – ${fmt(lvData?.max_amount)}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Primary: </span>
                                <span style={{ fontWeight: 500 }}>{a?.primary_approver_name || '—'}</span>
                              </div>
                              <div style={{ fontSize: 12 }}>
                                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Alternate: </span>
                                <span style={{ fontWeight: 500 }}>{a?.alternate_approver_name || '—'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              {search ? 'No users match your search.' : 'No active users found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
