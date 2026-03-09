import React from 'react';
import { Landmark } from 'lucide-react';

export default function ServiceProviders() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="page-card-header" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Landmark size={22} />
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 17 }}>Service Providers</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Landmark size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Service Provider Directory</h3>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420, margin: '0 auto 24px' }}>
            Manage your telecom service providers, track contact details, rate plans,
            and service-level agreements across your vendor portfolio.
          </p>
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Coming Soon</div>
        </div>
      </div>
    </div>
  );
}
