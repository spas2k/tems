/**
 * @file User administration page with role assignment modal.
 * @module UserManagement
 *
 * CRUD list page for user admin, including role selection and user creation.
 */
import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, getRoles } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'];

const EMPTY = { display_name: '', email: '', roles_id: '', status: 'Active' };

const FILTER_CONFIG = {
  display_name: 'text', email: 'text', role_name: 'select', status: 'select',
};

export default function UserManagement() {
  const { isAdmin, refreshUser } = useAuth();
  const confirm = useConfirm();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getRoles().then(r => setRoles(r.data)).catch(() => {});
  }, []);

  const roleOptions = roles.map(r => ({ value: String(r.roles_id), label: r.name }));

  const table = useCrudTable({
    api: { list: getUsers, create: createUser, update: updateUser, delete: deleteUser },
    idKey: 'users_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    beforeSave: (payload) => ({ ...payload, roles_id: Number(payload.roles_id) }),
  });

  const columns = [
    { key: 'display_name', label: 'Display Name', copyable: true, summary: 'count' },
    { key: 'email', label: 'Email', style: { color: '#3b82f6' } },
    { key: 'role_name', label: 'Role',
      filterType: 'select', filterOptions: roles.map(r => r.name),
      badge: { Admin: 'badge badge-purple', Manager: 'badge badge-blue', Analyst: 'badge badge-blue', Viewer: 'badge badge-gray' } },
    { key: 'status', label: 'Status',
      filterType: 'select', filterOptions: STATUS_OPTS,
      badge: { Active: 'badge badge-green', Inactive: 'badge badge-red', Suspended: 'badge badge-red' } },
    { key: 'last_login', label: 'Last Login', format: 'date',
      render: val => val ? new Date(val).toLocaleString() : '—' },
  ];

  const formFields = [
    { key: 'display_name', label: 'Display Name', required: true, half: true },
    { key: 'email', label: 'Email', type: 'email', required: true, half: true },
    { key: 'roles_id', label: 'Role', type: 'select', options: roleOptions, half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS, half: true },
  ];

  const handleSaveUser = async () => {
    await table.handleSave();
    refreshUser();
  };

  if (!isAdmin) return <div style={{ padding: 32, color: '#ef4444' }}>Access denied — Admin role required.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Users</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Users size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{table.data.filter(u => u.status === 'Active').length}</div>
          <div className="kpi-icon"><ShieldCheck size={40} /></div>
        </div>
        <div className="kpi-card gray">
          <div className="kpi-label">Roles Defined</div>
          <div className="kpi-value">{roles.length}</div>
          <div className="kpi-icon"><ShieldCheck size={40} /></div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="User Management"
        titleIcon={<Users size={15} color="#475569" />}
        exportFilename="Users"
        onRowClick={row => table.openEdit(row)}
        bulkActions={[
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm(`Delete ${rows.length} user(s)?`))) return; rows.forEach(r => table.handleDelete(r.users_id, { skipConfirm: true })); } }
        ]}
        headerRight={
          <button className="btn btn-primary" onClick={() => table.openNew()}>
            <Plus size={15} /> Add User
          </button>
        }
      />

      <CrudModal
        open={table.modal}
        title={table.editing ? 'Edit User' : 'Add User'}
        onClose={() => table.setModal(false)}
        onSave={handleSaveUser}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}

