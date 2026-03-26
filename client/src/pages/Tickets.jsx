import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, Plus } from 'lucide-react';
import { PageTitleContext } from '../PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { getTickets } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';

const STATUSES = ['Open', 'In Progress', 'Pending Vendor', 'Pending Internal', 'On Hold', 'In Review', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = ['Enhancement', 'System Issue', 'Billing Error', 'Rate Dispute', 'Service Issue', 'Contract Problem', 'Data Quality', 'Invoice Discrepancy', 'Provisioning', 'Access & Permissions', 'Bug Report', 'Feature Request', 'Documentation', 'Other'];

function sourceLink(type, id, label) {
  if (!type || !id) return '—';
  const paths = {
    invoice:  `/invoices/${id}`,
    inventoryItem:  `/inventory/${id}`,
    contract: `/contracts/${id}`,
    order:    `/orders/${id}`,
    account:  `/accounts/${id}`,
    dispute:  `/disputes/${id}`,
  };
  return { path: paths[type] || '#', label: label || `${type} #${id}`, type };
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const FILTER_CONFIG = {
  ticket_number: 'text',
  title: 'text',
  category: 'select',
  priority: 'select',
  status: 'select',
  assigned_user_name: 'text'
};

export default function Tickets() {
  const { setTitle } = useContext(PageTitleContext) || {};
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setTitle?.('Tickets & Issues'); }, [setTitle]);

  const table = useCrudTable({
    api: { list: getTickets },
    idKey: 'tickets_id',
    filterConfig: FILTER_CONFIG,
    resourceName: 'tickets',
  });

  // KPI counts
  const open     = table.data.filter(t => t.status === 'Open').length;
  const critical = table.data.filter(t => t.priority === 'Critical' || t.priority === 'High').length;
  const inProg   = table.data.filter(t => t.status === 'In Progress').length;
  const resolved = table.data.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const columns = [
    { key: 'ticket_number', label: 'Ticket #', render: (val, row) => <span onClick={() => navigate(`/tickets/${row.tickets_id}`)} style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13, color: '#2563eb', whiteSpace: 'nowrap', cursor: 'pointer' }}>{val}</span> },
    { key: 'title', label: 'Title', render: (val, row) => (
      <div onClick={() => navigate(`/tickets/${row.tickets_id}`)} className="rc-results-count" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260, cursor: 'pointer' }}>
        {val}
      </div>
    )},
    { key: 'category', label: 'Category', filterType: 'select', filterOptions: CATEGORIES },
    { key: 'priority', label: 'Priority', filterType: 'select', filterOptions: PRIORITIES, badge: {
      Low: 'badge badge-green', Medium: 'badge badge-blue', High: 'badge badge-orange', Critical: 'badge badge-red'
    }},
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: {
      'Open': 'badge badge-blue', 'In Progress': 'badge badge-purple', 'Resolved': 'badge badge-green', 'Closed': 'badge badge-gray', 'On Hold': 'badge badge-amber', 'In Review': 'badge badge-cyan', 'Pending Vendor': 'badge badge-orange', 'Pending Internal': 'badge badge-orange'
    }},
    { key: 'source', label: 'Source', render: (val, row) => {
        const src = sourceLink(row.source_entity_type, row.source_entity_id, row.source_label);
        if (typeof src === 'object') {
          return (
            <a href={src.path} onClick={e => { e.stopPropagation(); navigate(src.path); }} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
              <span style={{ textTransform: 'capitalize' }}>{src.type}</span>: {src.label}
            </a>
          );
        }
        return <span style={{ fontSize: 12, color: '#64748b' }}>{src}</span>;
    } },
    { key: 'assigned_user_name', label: 'Assignee', filterType: 'text' },
    { key: 'created_at', label: 'Created', format: 'date' }
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LifeBuoy size={20} color="#fff" />
          </div>
          <div>
            <h1 className="rc-results-count" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Tickets &amp; Issues</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Issue tracking and resolution</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Open',        value: open,     color: '#2563eb' },
          { label: 'High / Critical', value: critical, color: '#ea580c' },
          { label: 'In Progress', value: inProg,   color: '#7c3aed' },
          { label: 'Resolved',    value: resolved,  color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '16px 20px', borderTop: '3px solid ' + color }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{table.loading ? '—' : value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Tickets"
        titleIcon={<LifeBuoy size={15} color="#475569" />}
        exportFilename="Tickets"
        headerRight={<button className="btn btn-primary" onClick={() => navigate('/tickets/new')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> New Ticket</button>}
      />
    </div>
  );
}
