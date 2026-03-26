import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAuditLog } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AuditLog() {
  const { isAdmin, user } = useAuth();
  const pageSize = user?.preferences?.rows_per_page || 26;
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAuditLog({ page, limit: pageSize });
      setRows(data.rows ?? data);
      setTotal(data.total ?? data.length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!isAdmin) return <div style={{ padding: 32, color: '#ef4444' }}>Access denied — Admin role required.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Entries</div>
          <div className="kpi-value">{total.toLocaleString()}</div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Creates</div>
          <div className="kpi-value">{rows.filter(r => r.action === 'CREATE').length}</div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">Deletes</div>
          <div className="kpi-value">{rows.filter(r => r.action === 'DELETE').length}</div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
        </span>
        <button className="btn" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* table */}
      <div className="card" style={{ overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                {['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'IP Address'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.audit_log_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{r.display_name || r.users_id || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${actionBadge(r.action)}`}>{r.action}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.resource}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{r.resource_id ?? '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{r.ip_address || '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 10px' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 12, color: '#475569' }}>Page {page} of {totalPages}</span>
          <button className="btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 10px' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function actionBadge(a) {
  if (a === 'CREATE') return 'badge-green';
  if (a === 'UPDATE') return 'badge-blue';
  if (a === 'DELETE') return 'badge-red';
  return 'badge-gray';
}
