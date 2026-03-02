import React from 'react';
import { Flag } from 'lucide-react';

export default function Milestones() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="page-card-header" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Flag size={22} />
          <span style={{ fontWeight: 700, fontSize: 17, color: '#0f172a' }}>Milestones</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Flag size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Order Milestones</h3>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420, margin: '0 auto 24px' }}>
            Track key milestones for circuit orders — design completion, FOC dates,
            installation, testing, and turn-up across the provisioning lifecycle.
          </p>
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Coming Soon</div>
        </div>
      </div>
    </div>
  );
}
