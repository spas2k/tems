import React from 'react';
import { BarChart2 } from 'lucide-react';

export default function CreateGraph() {
  return (
    <div className="page-card" style={{ padding: 40, textAlign: 'center' }}>
      <BarChart2 size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
      <h2 className="rc-results-count" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Create Graph</h2>
      <p style={{ color: '#64748b', fontSize: 15 }}>Custom graph builder coming soon.</p>
    </div>
  );
}
