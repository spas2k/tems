import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Trash2 } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const EMPTY = { vendors_id: '', name: '', account_number: '', subaccount_number: '', account_type: '', team: '', status: 'Active' };

const FILTER_CONFIG = {
  name: 'text', account_number: 'text', subaccount_number: 'text', account_type: 'select',
  team: 'text', status: 'select',
};

export default function Accounts() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('accounts', 'create');
  const canDelete = hasPermission('accounts', 'delete');
  const table = useCrudTable({
    api: { list: getAccounts, create: createAccount, update: updateAccount, delete: deleteAccount },
    idKey: 'accounts_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
  });

  const columns = [
    { key: 'name', label: 'Company / Account Name', copyable: true, summary: 'count', link: row => navigate(`/accounts/${row.accounts_id}`) },
    { key: 'account_number', label: 'Account #', style: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' } },
    { key: 'subaccount_number', label: 'Sub-Account', filterType: 'text' },
    { key: 'account_type', label: 'Type', filterType: 'text' },
    { key: 'team', label: 'Team', filterType: 'text' },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: ['Active', 'Inactive'],
      badge: { Active: 'badge badge-green', Inactive: 'badge badge-gray' } },
  ];

  const formFields = [
    { key: 'name', label: 'Vendor Name *' },
    { key: 'account_number', label: 'Account Number', half: true },
    { key: 'vendor_type', label: 'Vendor Type', type: 'select', options: VENDOR_TYPES, half: true },
    { key: 'contact_name', label: 'Contact Name', half: true },
    { key: 'contact_phone', label: 'Contact Phone', half: true },
    { key: 'contact_email', label: 'Contact Email', type: 'email' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Accounts</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Building2 size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{table.data.filter(d => d.status === 'Active').length}</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value">{table.data.filter(d => d.status === 'Inactive').length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="All Vendor Accounts"
        titleIcon={<Building2 size={15} color="#475569" />}
        exportFilename="Accounts"
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.accounts_id, { skipConfirm: true })); } }
        ] : []}
        headerRight={canCreate ? <button className="btn btn-primary" onClick={() => navigate('/accounts/new')}><Plus size={15} /> New Account</button> : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Account"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
