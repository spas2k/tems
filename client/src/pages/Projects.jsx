/**
 * @file Placeholder page for project management (coming soon).
 * @module Projects
 *
 * Renders a "Coming Soon" placeholder.
 */
import React from 'react';
import { FolderKanban } from 'lucide-react';

export default function Projects() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div className="page-card-header" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FolderKanban size={22} />
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 17 }}>Projects</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <FolderKanban size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Project Management</h3>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420, margin: '0 auto 24px' }}>
            Create and manage telecom projects to track installations, migrations, disconnects,
            and other multi-step initiatives across your inventoryItem and contract portfolio.
          </p>
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Coming Soon</div>
        </div>
      </div>
    </div>
  );
}
