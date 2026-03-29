/**
 * @file User list page with role lookup and status toggling.
 * @module Users
 *
 * CRUD list page for user management with active/inactive status control.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users as UsersIcon, ShieldCheck, ShieldX, Trash2, KeyRound, ShieldOff } from 'lucide-react';
import { getUsers, deleteUser, getRoles, setUserStatus } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'];

const STATUS_BADGE = {
  Active:    'badge badge-green',
  Inactive:  'badge badge-red',
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
  const { isAdmin, hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');
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
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={STATUS_BADGE[val] || 'badge badge-gray'}>{val}</span>
          {canUpdate && val !== 'Suspended' && (
            <button
              title="Suspend user"
              onClick={e => { e.stopPropagation(); handleQuickStatus(row, 'Suspended'); }}
              style={{
                display: 'flex', alignItems: 'center', padding: '2px 6px', gap: 3,
                fontSize: 10, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444', lineHeight: 1.5,
              }}
            >
              <ShieldOff size={10} /> Suspend
            </button>
          )}
          {canUpdate && val === 'Suspended' && (
            <button
              title="Reactivate user"
              onClick={e => { e.stopPropagation(); handleQuickStatus(row, 'Active'); }}
              style={{
                display: 'flex', alignItems: 'center', padding: '2px 6px', gap: 3,
                fontSize: 10, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                color: '#10b981', lineHeight: 1.5,
              }}
            >
              <ShieldCheck size={10} /> Activate
            </button>
          )}
        </div>
      ),
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

  const handleQuickStatus = async (row, newStatus) => {
    try {
      const updated = await setUserStatus(row.users_id, newStatus);
      table.load();
      table.showToast(
        newStatus === 'Suspended'
          ? `${row.display_name} suspended.`
          : `${row.display_name} reactivated.`
      );
    } catch (err) {
      table.showToast(err.response?.data?.error || 'Status update failed.', false);
    }
  };

  if (!hasPermission('users', 'read')) return <div style={{ padding: 32, color: '#ef4444' }}>Access denied — insufficient permissions.</div>;

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
          ...(canUpdate ? [{
            label: 'Suspend', icon: ShieldOff, danger: false,
            onClick: async rows => {
              if (!(await confirm(`Suspend ${rows.length} user(s)?`, { danger: true, confirmLabel: 'Suspend' }))) return;
              await Promise.all(rows.map(r => setUserStatus(r.users_id, 'Suspended')));
              table.reload();
            },
          },
          {
            label: 'Activate', icon: ShieldCheck, danger: false,
            onClick: async rows => {
              if (!(await confirm(`Activate ${rows.length} user(s)?`, { danger: false, confirmLabel: 'Activate' }))) return;
              await Promise.all(rows.map(r => setUserStatus(r.users_id, 'Active')));
              table.reload();
            },
          }] : []),
          ...(canDelete ? [{
            label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => {
              if (!(await confirm(`Delete ${rows.length} user(s)?`))) return;
              rows.forEach(r => table.handleDelete(r.users_id, { skipConfirm: true }));
            },
          }] : []),
        ]}
        headerRight={canCreate &&
          <button className="btn btn-primary" onClick={() => navigate('/users/new')}>
            <Plus size={15} /> New User
          </button>
        }
      />
    </div>
  );
}
