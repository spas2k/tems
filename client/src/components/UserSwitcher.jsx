/**
 * @file Header dropdown for demo user impersonation switching.
 * @module UserSwitcher
 *
 * Shows the current user avatar/role in the header. Dropdown lists searchable demo users for impersonation. Includes link to Preferences page.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, User, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LookupModal from './LookupModal';

const ROLE_COLORS = {
  Admin:   { bg: '#2563eb', text: '#fff', badge: '#dbeafe', badgeText: '#1e40af' },
  Manager: { bg: '#0d9488', text: '#fff', badge: '#ccfbf1', badgeText: '#0f766e' },
  Analyst: { bg: '#d97706', text: '#fff', badge: '#fef3c7', badgeText: '#92400e' },
  Viewer:  { bg: '#64748b', text: '#fff', badge: '#f1f5f9', badgeText: '#475569' },
};

function Avatar({ name, role, size = 34 }) {
  const colors = ROLE_COLORS[role] || ROLE_COLORS.Viewer;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: colors.text, fontWeight: 700, fontSize: size * 0.41,
      boxShadow: `0 2px 8px ${colors.bg}66`,
    }}>
      {name ? name.charAt(0).toUpperCase() : <User size={size * 0.47} color="white" />}
    </div>
  );
}

export default function UserSwitcher() {
  const navigate = useNavigate();
  const {
    user, demoUsers, isImpersonating,
    switchDemoUser, endImpersonation,
  } = useAuth();

  const [open, setOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const roleColors = ROLE_COLORS[user.role_name] || ROLE_COLORS.Viewer;

  const handleSwitch = (demoUser) => {
    switchDemoUser(demoUser.users_id);
    setLookupOpen(false);
    setOpen(false);
  };

  const userLookupColumns = [
    { key: 'display_name', label: 'USER NAME' },
    { key: 'email', label: 'EMAIL' },
    { key: 'role_name', label: 'ROLE' },
  ];
  const userSearchKeys = ['display_name', 'email', 'role_name'];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── Trigger ────────────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 8px', borderRadius: 10,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, color: 'var(--header-text, #1e293b)' }}>
            {user.display_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
              background: roleColors.badge, color: roleColors.badgeText,
              letterSpacing: '0.3px',
            }}>
              {user.role_name}
            </span>
            {isImpersonating && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                background: '#fef3c7', color: '#92400e', letterSpacing: '0.3px',
              }}>
                DEMO
              </span>
            )}
          </div>
        </div>
        <Avatar name={user.display_name} role={user.role_name} />
        <ChevronDown size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
      </button>

      {/* ── Dropdown ───────────────────────────────────── */}
      {open && (
        <div className="us-dropdown" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          borderRadius: 14, minWidth: 240,
          zIndex: 3000, overflow: 'hidden',
        }}>
          {/* Current user summary */}
          <div className="us-dropdown-section" style={{ padding: '14px 16px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={user.display_name} role={user.role_name} size={38} />
              <div>
                <div className="rc-results-count" style={{ fontWeight: 700, fontSize: 13 }}>{user.display_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                <div style={{ marginTop: 3, display: 'flex', gap: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                    background: roleColors.badge, color: roleColors.badgeText,
                  }}>
                    {user.role_name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Impersonate any user */}
          {demoUsers.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => setLookupOpen(true)}
                  className="us-dropdown-item"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 16px', cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Users size={14} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Impersonate User</span>
                </div>
              </div>
              <LookupModal
                open={lookupOpen}
                onClose={() => setLookupOpen(false)}
                onSelect={handleSwitch}
                title="Impersonate User"
                data={demoUsers}
                columns={userLookupColumns}
                searchableKeys={userSearchKeys}
              />
            </>
          )}

          {/* End Impersonation */}
          {isImpersonating && (
            <div style={{ borderTop: '1px solid var(--border-color)' }}>
              <div
                onClick={() => { endImpersonation(); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', cursor: 'pointer', color: '#ef4444',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-error)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={14} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>End Impersonation</span>
              </div>
            </div>
          )}

          {/* Preferences link */}
          <div style={{ borderTop: '1px solid var(--border-color)' }}>
            <div
              onClick={() => { navigate('/preferences'); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px', cursor: 'pointer', color: 'var(--text-secondary)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Settings size={14} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Preferences</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
