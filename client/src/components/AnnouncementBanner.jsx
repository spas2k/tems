import React, { useEffect, useState } from 'react';
import { X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { getAnnouncements } from '../api';

const STORAGE_KEY = 'tems-dismissed-announcements';

const TYPE_CONFIG = {
  info:    { bg: '#2563eb', icon: Info,          },
  warning: { bg: '#d97706', icon: AlertTriangle, },
  danger:  { bg: '#dc2626', icon: AlertCircle,   },
  success: { bg: '#16a34a', icon: CheckCircle,   },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    getAnnouncements({ active: 'true' })
      .then(res => setAnnouncements(res.data || []))
      .catch(() => {});
  }, []);

  const dismiss = id => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const visible = announcements.filter(a => !dismissed.includes(a.announcements_id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
      {visible.map(a => {
        const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div key={a.announcements_id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: cfg.bg,
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            <Icon size={18} color="#fff" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{a.title}</div>
              {a.message && (
                <div style={{ fontSize: 12, color: '#fff', marginTop: 2, opacity: 0.88 }}>{a.message}</div>
              )}
            </div>
            <button
              onClick={() => dismiss(a.announcements_id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#fff', opacity: 0.7, padding: 2, flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
