import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor as MonitorIcon, Bell, Palette, Globe, Monitor, Clock, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ── Theme helper ────────────────────────── */
const THEME_KEY = 'tems-theme';            // localStorage key
const MODES = [
  { value: 'light',  label: 'Light',  icon: Sun,         desc: 'Classic light interface' },
  { value: 'dark',   label: 'Dark',   icon: Moon,        desc: 'Easy on the eyes in low light' },
  { value: 'auto',   label: 'Auto',   icon: MonitorIcon,  desc: 'Follow your OS preference' },
];

function resolveTheme(mode) {
  if (mode === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return mode;
}

function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/* ── Coming-soon sections ────────────────── */
const SECTIONS = [
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Email alerts, in‑app notifications, and digest frequency',
    status: 'Coming Soon',
  },
  {
    icon: Monitor,
    title: 'Dashboard Layout',
    description: 'Choose which KPI cards and charts appear on the dashboard',
    status: 'Coming Soon',
  },
  {
    icon: Globe,
    title: 'Regional & Locale',
    description: 'Date format, currency display, number formatting, and timezone',
    status: 'Coming Soon',
  },
  {
    icon: Clock,
    title: 'Session & Security',
    description: 'Session timeout, two‑factor authentication, and login history',
    status: 'Coming Soon',
  },
];

export default function Preferences() {
  const { user } = useAuth();
  const [mode, setMode] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [virtualMobile, setVirtualMobileState] = useState(
    () => localStorage.getItem('tems-virtual-mobile') === 'true'
  );

  const toggleVirtualMobile = () => {
    const next = !virtualMobile;
    setVirtualMobileState(next);
    localStorage.setItem('tems-virtual-mobile', String(next));
    window.dispatchEvent(new CustomEvent('tems-virtual-mobile-change'));
  };

  /* apply on mount + whenever mode changes */
  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(THEME_KEY, mode);

    /* if auto, listen to OS changes */
    if (mode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('auto');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
      {/* Profile card */}
      <div className="card" style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 22,
          boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
          flexShrink: 0,
        }}>
          {user?.display_name ? user.display_name.charAt(0).toUpperCase() : '?'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }} className="pref-title">{user?.display_name ?? '—'}</div>
          <div style={{ fontSize: 13, marginTop: 2 }} className="pref-sub">{user?.email ?? '—'}</div>
          <span className="badge badge-blue" style={{ marginTop: 6, display: 'inline-block' }}>{user?.role_name ?? '—'}</span>
        </div>
      </div>

      {/* ── Appearance — Dark mode toggle ── */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Palette size={18} className="pref-icon" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }} className="pref-title">Appearance</div>
            <div style={{ fontSize: 12, marginTop: 1 }} className="pref-sub">Choose your interface theme</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {MODES.map(({ value, label, icon: Icon, desc }) => {
            const active = mode === value;
            return (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`theme-card${active ? ' theme-card-active' : ''}`}
              >
                <Icon size={22} style={{ marginBottom: 6 }} />
                <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Virtual Mobile Mode ── */}
      <div className="card" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div className="pref-icon-box" style={{
          width: 42, height: 42, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: virtualMobile ? '#dbeafe' : undefined,
        }}>
          <Smartphone size={20} color={virtualMobile ? '#2563eb' : undefined} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }} className="pref-title">Virtual Mobile Mode</div>
          <div style={{ fontSize: 12, marginTop: 2 }} className="pref-sub">
            Simulate the mobile layout on desktop — hamburger menu, drawer nav, compact header
          </div>
        </div>
        <button
          onClick={toggleVirtualMobile}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: virtualMobile ? '#2563eb' : '#cbd5e1',
            position: 'relative', transition: 'background 0.2s',
          }}
          title={virtualMobile ? 'Disable virtual mobile mode' : 'Enable virtual mobile mode'}
        >
          <span className="toggle-knob" style={{
            position: 'absolute', top: 3, left: virtualMobile ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Coming-soon sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {SECTIONS.map(({ icon: Icon, title, description, status }) => (
          <div key={title} className="card" style={{
            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18,
            opacity: 0.55, cursor: 'default',
          }}>
            <div className="pref-icon-box" style={{
              width: 42, height: 42, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }} className="pref-title">{title}</div>
              <div style={{ fontSize: 12, marginTop: 2 }} className="pref-sub">{description}</div>
            </div>
            <span className="badge badge-gray" style={{ fontSize: 11 }}>{status}</span>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ fontSize: 12, textAlign: 'center', paddingTop: 8 }} className="pref-sub">
        Preferences will be persisted per‑user once SSO is enabled.
      </div>
    </div>
  );
}
