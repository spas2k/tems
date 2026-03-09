import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users as UsersIcon, ShieldCheck, ShieldX, Trash2, KeyRound } from 'lucide-react';
import { getUsers, deleteUser, getRoles } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'];

const STATUS_BADGE = {
  Active:    'badge badge-green',
  Inactive:  'badge badge-gray',
  Suspended: 'badge badge-red',
};

const ROLE_BADGE = {
  Admin:   'badge badge-purple',
  Manager: 'badge badge-blue',
  Analyst: 'badge badge-blue',
  Viewer:  'badge badge-gray',
};

const FILTER_CONFIG = {
  display_name: 'text', email: 'text', role_name: 'select', status: 'select',
};

export default function Users() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getRoles().then(r => setRoles(r.data)).catch(() => {});
  }, []);

  const table = useCrudTable({
    api: { list: getUsers, delete: deleteUser },
    idKey: 'users_id',
    emptyForm: {},
    filterConfig: FILTER_CONFIG,
  });

  const columns = [
    {
      key: 'display_name', label: 'Name', copyable: true, summary: 'count',
      link: row => navigate(`/users/${row.users_id}`),
    },
    { key: 'email', label: 'Email', style: { color: '#3b82f6' } },
    {
      key: 'role_name', label: 'Role',
      filterType: 'select', filterOptions: roles.map(r => r.name),
      badge: ROLE_BADGE,
    },
    {
      key: 'status', label: 'Status',
      filterType: 'select', filterOptions: STATUS_OPTS,
      badge: STATUS_BADGE,
    },
    {
      key: 'sso_provider', label: 'SSO Provider',
      render: val => val || <span style={{ color: '#94a3b8', fontSize: 12 }}>Local</span>,
    },
    {
      key: 'last_login', label: 'Last Login', format: 'date',
      render: val => val ? new Date(val).toLocaleString() : <span style={{ color: '#94a3b8' }}>Never</span>,
    },
    {
      key: 'created_at', label: 'Created', format: 'date',
      render: val => val ? new Date(val).toLocaleDateString() : '—',
    },
  ];

  const activeCount    = table.data.filter(u => u.status === 'Active').length;
  const inactiveCount  = table.data.filter(u => u.status === 'Inactive' || u.status === 'Suspended').length;
  const ssoCount       = table.data.filter(u => u.sso_provider).length;

  if (!isAdmin) return <div style={{ padding: 32, color: '#ef4444' }}>Access denied — Admin role required.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Users</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><UsersIcon size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-icon"><ShieldCheck size={40} /></div>
        </div>
        <div className="kpi-card gray">
          <div className="kpi-label">Inactive / Suspended</div>
          <div className="kpi-value">{inactiveCount}</div>
          <div className="kpi-icon"><ShieldX size={40} /></div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">SSO Linked</div>
          <div className="kpi-value">{ssoCount}</div>
          <div className="kpi-icon"><KeyRound size={40} /></div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="All Users"
        titleIcon={<UsersIcon size={15} color="#475569" />}
        exportFilename="Users"
        onRowClick={row => navigate(`/users/${row.users_id}`)}
        bulkActions={[
          {
            label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => {
              if (!(await confirm(`Delete ${rows.length} user(s)?`))) return;
              rows.forEach(r => table.handleDelete(r.users_id, { skipConfirm: true }));
            },
          },
        ]}
        headerRight={
          <button className="btn btn-primary" onClick={() => navigate('/users/new')}>
            <Plus size={15} /> New User
          </button>
        }
      />
    </div>
  );
}
