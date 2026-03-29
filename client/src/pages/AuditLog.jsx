/**
 * @file Read-only audit log viewer with action/resource filtering.
 * @module AuditLog
 *
 * Displays system audit log entries using useCrudTable (read-only mode).
 */
import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { getAuditLog } from '../api';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import useCrudTable from '../hooks/useCrudTable';

const FILTER_CONFIG = { display_name: 'text', action: 'select', resource: 'text', ip_address: 'text' };

const listAuditLog = () => getAuditLog({ page: 1, limit: 500 }).then(r => ({ data: r.data.data ?? [] }));

function actionBadge(a) {
  if (a === 'CREATE') return 'badge-green';
  if (a === 'UPDATE') return 'badge-blue';
  if (a === 'DELETE') return 'badge-red';
  return 'badge-gray';
}

const columns = [
  { key: 'created_at', label: 'Timestamp',
    render: val => <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(val).toLocaleString()}</span> },
  { key: 'display_name', label: 'User',
    render: (val, row) => val || row.users_id || '—' },
  { key: 'action', label: 'Action',
    render: val => <span className={`badge ${actionBadge(val)}`}>{val}</span> },
  { key: 'resource', label: 'Resource' },
  { key: 'resource_id', label: 'Resource ID',
    style: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' } },
  { key: 'ip_address', label: 'IP Address',
    style: { fontSize: 12, color: '#64748b' },
    render: val => val || '—' },
];

export default function AuditLog() {
  const { isAdmin } = useAuth();
  const table = useCrudTable({
    api: { list: listAuditLog },
    idKey: 'audit_log_id',
    filterConfig: FILTER_CONFIG,
  });

  if (!isAdmin) return <div style={{ padding: 32, color: '#ef4444' }}>Access denied — Admin role required.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Entries</div>
          <div className="kpi-value">{table.data.length.toLocaleString()}</div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Creates</div>
          <div className="kpi-value">{table.data.filter(r => r.action === 'CREATE').length}</div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">Deletes</div>
          <div className="kpi-value">{table.data.filter(r => r.action === 'DELETE').length}</div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Audit Log"
        titleIcon={<Shield size={15} color="#2563eb" />}
        exportFilename="AuditLog"
        headerRight={
          <button className="btn" onClick={table.load} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />
    </div>
  );
}
