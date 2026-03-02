import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Trash2 } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';

const VENDOR_TYPES = ['AT&T', 'Comcast', 'Verizon', 'Lumen', 'Spectrum', 'Other'];

const EMPTY = { name: '', account_number: '', vendor_type: 'AT&T', contact_name: '', contact_email: '', contact_phone: '', status: 'Active', notes: '' };

const FILTER_CONFIG = {
  name: 'text', account_number: 'text', vendor_type: 'select',
  contact_name: 'text', contact_email: 'text', status: 'select',
};

export default function Accounts() {
  const navigate = useNavigate();
  const table = useCrudTable({
    api: { list: getAccounts, create: createAccount, update: updateAccount, delete: deleteAccount },
    idKey: 'accounts_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
  });

  const columns = [
    { key: 'name', label: 'Vendor Name', copyable: true, summary: 'count', link: row => navigate(`/accounts/${row.accounts_id}`) },
    { key: 'account_number', label: 'Account #', style: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' } },
    { key: 'vendor_type', label: 'Type', filterType: 'select', filterOptions: VENDOR_TYPES },
    { key: 'contact_name', label: 'Contact' },
    { key: 'contact_email', label: 'Email', style: { color: '#3b82f6' } },
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
        exportFilename="Accounts"
        bulkActions={[
          { label: 'Delete', icon: Trash2, danger: true, onClick: rows => { if (window.confirm(`Delete ${rows.length} records?`)) rows.forEach(r => table.handleDelete(r.accounts_id)); } }
        ]}
        headerRight={<button className="btn btn-primary" onClick={() => navigate('/accounts/new')}><Plus size={15} /> New Account</button>}
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
