import React from 'react';
import { FileText } from 'lucide-react';

export default function CreateReport() {
  return (
    <div className="page-card" style={{ padding: 40, textAlign: 'center' }}>
      <FileText size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Create Report</h2>
      <p style={{ color: '#64748b', fontSize: 15 }}>Custom report builder coming soon.</p>
    </div>
  );
}
