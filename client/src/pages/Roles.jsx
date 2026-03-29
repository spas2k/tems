/**
 * @file Role list page with permission/user count badges.
 * @module Roles
 *
 * CRUD list page for role management.
 */
import React from 'react';
import { Plus, Shield, Trash2, Users, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoles, updateRole, deleteRole } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import dayjs from 'dayjs';

const EMPTY = { name: '', description: '' };
const FILTER_CONFIG = { name: 'text', description: 'text' };

const ROLE_BADGES = {
  Admin:   'badge badge-blue',
  Manager: 'badge badge-green',
  Analyst: 'badge badge-orange',
  Viewer:  'badge badge-gray',
};

export default function Roles() {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const table = useCrudTable({
    api: { list: getRoles, update: updateRole, delete: deleteRole },
    idKey: 'roles_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
  });

  const columns = [
    { key: 'name', label: 'Role Name', copyable: true, summary: 'count',
      render: (val, row) => (
        <span
          className={ROLE_BADGES[val] || 'badge badge-purple'}
          style={{ fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate(`/roles/${row.roles_id}`)}
        >
          {val}
        </span>
      ),
    },
    { key: 'description', label: 'Description',
      render: val => <span style={{ fontSize: 12, color: '#64748b' }}>{val || '—'}</span> },
    { key: 'permission_count', label: 'Permissions',
      render: val => (
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
          {Number(val)}
        </span>
      ),
    },
    { key: 'user_count', label: 'Users Assigned',
      render: val => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <Users size={12} color="#64748b" />
          {Number(val)}
        </span>
      ),
    },
    { key: 'created_at', label: 'Created',
      render: val => val ? dayjs(val).format('MM/DD/YYYY') : '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Roles</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Shield size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Total Permissions</div>
          <div className="kpi-value">
            {table.data.reduce((sum, r) => sum + Number(r.permission_count || 0), 0)}
          </div>
          <div className="kpi-icon"><KeyRound size={40} /></div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Custom Roles</div>
          <div className="kpi-value">
            {table.data.filter(r => !['Admin', 'Manager', 'Analyst', 'Viewer'].includes(r.name)).length}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Roles"
        titleIcon={<Shield size={15} color="#2563eb" />}
        exportFilename="Roles"
        bulkActions={isAdmin ? [
          { label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => {
              const hasUsers = rows.some(r => Number(r.user_count) > 0);
              if (hasUsers) {
                await confirm('Some selected roles have assigned users. Reassign those users first before deleting.', { confirmLabel: 'OK', danger: false });
                return;
              }
              if (!(await confirm(`Delete ${rows.length} role(s)?`, { danger: true }))) return;
              for (const r of rows) {
                await table.handleDelete(r.roles_id, { skipConfirm: true });
              }
            },
          },
        ] : []}
        headerRight={isAdmin
          ? <button className="btn btn-primary" onClick={() => navigate('/roles/new')}><Plus size={15} /> New Role</button>
          : null}
      />

      <CrudModal
        open={table.modal}
        title={table.editing ? 'Edit Role' : 'New Role'}
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={[
          { key: 'name', label: 'Role Name *' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ]}
      />
    </div>
  );
}
