import React from 'react';
import { UserCheck } from 'lucide-react';

export default function InvoiceApprovers() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="page-card-header" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserCheck size={22} />
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 17 }}>Invoice Approvers</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <UserCheck size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Invoice Approval Workflow</h3>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420, margin: '0 auto 24px' }}>
            Define and manage invoice approvers, set approval thresholds,
            and configure multi-level approval workflows for vendor invoices.
          </p>
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Coming Soon</div>
        </div>
      </div>
    </div>
  );
}
