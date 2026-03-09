import React from 'react';
import { BookOpen } from 'lucide-react';

export default function GLCodes() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="page-card-header" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BookOpen size={22} />
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 17 }}>GL Codes</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <BookOpen size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>General Ledger Codes</h3>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420, margin: '0 auto 24px' }}>
            Manage GL codes used for financial mapping and cost allocation across
            vendor accounts, departments, and cost centers.
          </p>
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Coming Soon</div>
        </div>
      </div>
    </div>
  );
}
