/**
 * @file Full permission matrix editor for all roles.
 * @module RolePermissions
 *
 * Interactive grid showing all roles × 23 resources × 4 actions. Allows toggling permissions with save confirmation.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Building2, FileText, Network, ShoppingCart, Receipt,
  PieChart, Zap, Tag, ShieldAlert, Users, DollarSign, Save,
  RefreshCw, Check, Lock, MapPin, Layers,
  LifeBuoy, CreditCard, Megaphone, BookOpen, BarChart2,
  Database, ScanLine,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoles, getRole, getPermissions, updateRole } from '../api';
import { getRoleColor } from '../utils/roleColors';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';

// ── Section → DB resource mapping ────────────────────────
// Each section in the matrix controls one DB resource's C/R/U/D permissions.
const SECTIONS = [
  { label: 'Vendors',            icon: Building2,    resource: 'accounts' },
  { label: 'Vendor Remit',       icon: CreditCard,   resource: 'vendor_remit' },
  { label: 'Spend Categories',   icon: Layers,       resource: 'spend_categories' },
  { label: 'Locations',          icon: MapPin,       resource: 'locations' },
  { label: 'Contracts',          icon: FileText,     resource: 'contracts' },
  { label: 'USOC Codes',         icon: Tag,          resource: 'usoc_codes' },
  { label: 'Contract Rates',     icon: DollarSign,   resource: 'contract_rates' },
  { label: 'Disputes',           icon: ShieldAlert,  resource: 'disputes' },
  { label: 'Inventory',          icon: Network,      resource: 'inventory' },
  { label: 'Cost Savings',       icon: Zap,          resource: 'cost_savings' },
  { label: 'Orders',             icon: ShoppingCart,  resource: 'orders' },
  { label: 'Invoices',           icon: Receipt,      resource: 'invoices' },
  { label: 'Line Items',         icon: Receipt,      resource: 'line_items' },
  { label: 'Allocations',        icon: PieChart,     resource: 'allocations' },
  { label: 'Invoice Reader',     icon: ScanLine,     resource: 'invoice_reader_uploads' },
  { label: 'Tickets',            icon: LifeBuoy,     resource: 'tickets' },
  { label: 'Reports',            icon: BarChart2,    resource: 'reports' },
  { label: 'Field Catalog',      icon: Database,     resource: 'field_catalog' },
  { label: 'Announcements',      icon: Megaphone,    resource: 'announcements' },
  { label: 'Form Instructions',  icon: BookOpen,     resource: 'form_instructions' },
  { label: 'User Management',    icon: Users,        resource: 'users' },
  { label: 'Roles & Permissions', icon: Shield,      resource: 'roles' },
];

const ACTIONS = ['create', 'read', 'update', 'delete'];
const ACTION_LABELS = { create: 'Create', read: 'Read', update: 'Update', delete: 'Delete' };

// ── Permission key helpers ───────────────────────────────
const permKey = (resource, action) => `${resource}:${action}`;

function buildMatrix(rolePermissions) {
  // rolePermissions = array of { resource, action, ... } from role detail
  const m = {};
  for (const p of rolePermissions) {
    m[permKey(p.resource, p.action)] = true;
  }
  return m;
}

// ── Checkbox cell ────────────────────────────────────────
function PermCell({ checked, locked, onChange, action }) {
  const ACTION_COLORS = {
    create: { on: '#2563eb', light: '#eff6ff' },
    read:   { on: '#0d9488', light: '#f0fdfa' },
    update: { on: '#d97706', light: '#fffbeb' },
    delete: { on: '#ef4444', light: '#fef2f2' },
  };
  const c = ACTION_COLORS[action] || ACTION_COLORS.read;

  return (
    <td style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>
      <button
        disabled={locked}
        onClick={() => !locked && onChange(!checked)}
        title={locked ? 'Admin always has full access' : `Toggle ${action}`}
        style={{
          width: 28, height: 28, borderRadius: 8, border: 'none', cursor: locked ? 'not-allowed' : 'pointer',
          background: checked ? c.on : '#f8fafc',
          color: checked ? '#fff' : '#cbd5e1',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          outline: locked && checked ? `2px solid ${c.on}` : 'none',
          opacity: locked ? 0.75 : 1,
          boxShadow: checked && !locked ? `0 2px 8px ${c.on}44` : 'none',
        }}
        onMouseEnter={e => { if (!locked) e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {locked ? <Lock size={12} /> : checked ? <Check size={12} /> : null}
      </button>
    </td>
  );
}

export default function RolePermissions() {
  const { refreshUser } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [roles, setRoles]             = useState([]);
  const [allPerms, setAllPerms]       = useState([]);   // full permissions table
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [matrix, setMatrix]           = useState({});   // { 'accounts:read': true, ... }
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [dirty, setDirty]             = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([getRoles(), getPermissions()]);
      const loadedRoles = rolesRes.data || [];
      setRoles(loadedRoles);
      setAllPerms(permsRes.data || []);

      // Default to first non-Admin role for immediate display
      const defaultRole = loadedRoles.find(r => r.name !== 'Admin') || loadedRoles[0];
      if (defaultRole) setSelectedRoleId(defaultRole.roles_id);
    } catch {
      showToast('Failed to load roles', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  // Load the selected role's current permissions into local matrix state
  useEffect(() => {
    if (!selectedRoleId) return;
    const selectedRole = roles.find(r => r.roles_id === selectedRoleId);
    if (!selectedRole) return;

    if (selectedRole.name === 'Admin') {
      // Admin = all permissions (locked)
      const all = {};
      for (const s of SECTIONS) {
        for (const a of ACTIONS) all[permKey(s.resource, a)] = true;
      }
      setMatrix(all);
      setDirty(false);
      return;
    }

    // Fetch role detail to get its current permissions
    getRole(selectedRoleId).then(res => {
      setMatrix(buildMatrix(res.data.permissions || []));
      setDirty(false);
    }).catch(() => showToast('Failed to load role permissions', false));
  }, [selectedRoleId, roles]);

  const toggle = (resource, action) => {
    const key = permKey(resource, action);
    setMatrix(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // If disabling Read, also disable Create/Update/Delete
      if (action === 'read' && !next[key]) {
        next[permKey(resource, 'create')] = false;
        next[permKey(resource, 'update')] = false;
        next[permKey(resource, 'delete')] = false;
      }
      // If enabling Create/Update/Delete, auto-enable Read
      if (action !== 'read' && next[key]) {
        next[permKey(resource, 'read')] = true;
      }
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedRoleId || !dirty) return;
    setSaving(true);
    try {
      // Map checked matrix keys → permission IDs from allPerms
      const permissionIds = allPerms
        .filter(p => matrix[permKey(p.resource, p.action)])
        .map(p => p.permissions_id);

      const role = roles.find(r => r.roles_id === selectedRoleId);
      await updateRole(selectedRoleId, {
        name: role.name,
        description: role.description,
        permission_ids: permissionIds,
      });

      setDirty(false);
      showToast(`${role.name} permissions saved successfully.`);
      // Reload roles list so permission_count badge updates
      const rolesRes = await getRoles();
      setRoles(rolesRes.data || []);
      // Let the auth context pick up fresh permissions on next /me load
      await refreshUser();
    } catch {
      showToast('Failed to save permissions', false);
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = roles.find(r => r.roles_id === selectedRoleId);
  const isAdminRole  = selectedRole?.name === 'Admin';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8', gap: 10 }}>
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading&hellip;
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          background: toast.ok ? '#22c55e' : '#ef4444', color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Intro card ────────────────────────────────────── */}
      <div className="kpi-card blue" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <Shield size={28} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Role Permissions Matrix</div>
          <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
            Configure what each role can Create, Read, Update, and Delete across all sections.
            If a role lacks <strong>Read</strong> access to a section, those pages are hidden from that
            role&rsquo;s navigation entirely. Changes are saved to the database and take effect immediately.
          </div>
        </div>
      </div>

      {/* ── Role tabs ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {roles.map((role, idx) => {
          const rc = getRoleColor(role, idx);
          const isSelected = role.roles_id === selectedRoleId;
          return (
            <button
              key={role.roles_id}
              onClick={async () => {
                if (dirty && !(await confirm('You have unsaved changes. Switch role without saving?', { danger: false, confirmLabel: 'Switch' }))) return;
                setSelectedRoleId(role.roles_id);
              }}
              style={{
                padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                background: isSelected ? rc : '#f1f5f9',
                color: isSelected ? '#fff' : '#475569',
                boxShadow: isSelected ? `0 2px 10px ${rc}55` : 'none',
              }}
            >
              {role.name}
              {role.name === 'Admin' && (
                <Lock size={10} style={{ marginLeft: 5, verticalAlign: 'middle', opacity: 0.8 }} />
              )}
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 600, opacity: 0.8,
              }}>
                ({role.permission_count ?? '—'})
              </span>
            </button>
          );
        })}
        <button
          onClick={() => navigate('/roles')}
          style={{
            padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
            fontWeight: 600, fontSize: 12, background: '#fff', color: '#64748b',
            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
          }}
          title="Manage roles"
        >
          Manage Roles →
        </button>
      </div>

      {/* ── Matrix table ──────────────────────────────────── */}
      {selectedRole && (
        <div className="rp-matrix" style={{ borderRadius: 14, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
          }} className="rp-matrix-header">
            <div>
              <span className="rc-results-count" style={{ fontWeight: 800, fontSize: 15 }}>
                {selectedRole.name}
              </span>
              {selectedRole.description && (
                <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>
                  {selectedRole.description}
                </span>
              )}
              {isAdminRole && (
                <span style={{
                  marginLeft: 10, fontSize: 11, fontWeight: 700,
                  color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 99,
                }}>
                  Full access — locked
                </span>
              )}
              {dirty && !isAdminRole && (
                <span style={{
                  marginLeft: 10, fontSize: 11, fontWeight: 700,
                  color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 99,
                }}>
                  Unsaved changes
                </span>
              )}
            </div>
            {!isAdminRole && (
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !dirty}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                {saving
                    ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Save size={14} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
              <thead>
                <tr className="rp-thead-row">
                  <th className="rp-th" style={{ textAlign: 'left', padding: '10px 20px', width: '40%' }}>
                    Section
                  </th>
                  {ACTIONS.map(a => (
                    <th key={a} className="rp-th" style={{
                      textAlign: 'center', padding: '10px 8px',
                    }}>
                      {ACTION_LABELS[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map(section => {
                  const { label, icon: Icon, resource } = section;
                  return (
                    <tr key={resource} style={{ transition: 'background 0.1s' }}
                      className="rp-row"
                    >
                      <td className="rp-td" style={{ padding: '10px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Icon size={15} color="#64748b" />
                          <span className="rc-results-count" style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{resource}</span>
                        </div>
                      </td>
                      {ACTIONS.map(action => (
                        <PermCell
                          key={action}
                          checked={!!matrix[permKey(resource, action)]}
                          locked={isAdminRole}
                          action={action}
                          onChange={checked => toggle(resource, action)}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            {[
              { action: 'create', color: '#2563eb', note: 'Add new records' },
              { action: 'read',   color: '#0d9488', note: 'View pages & data' },
              { action: 'update', color: '#d97706', note: 'Edit existing records' },
              { action: 'delete', color: '#ef4444', note: 'Remove records' },
            ].map(({ action, color, note }) => (
              <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                <strong style={{ color }}>{ACTION_LABELS[action]}</strong> — {note}
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
              <Lock size={10} />
              Disabling Read hides the section from navigation
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
