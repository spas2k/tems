/**
 * @file Contract list page with CRUD modal and vendor lookup.
 * @module Contracts
 *
 * CRUD list page for vendor contracts.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { getContracts, createContract, updateContract, deleteContract, getVendors } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const STATUSES = ['Active', 'Pending', 'Expired', 'Terminated'];
const STATUS_BADGE = { Active: 'badge badge-green', Pending: 'badge badge-blue', Expired: 'badge badge-gray', Terminated: 'badge badge-red' };

const EMPTY = { vendors_id: '', name: '', contract_number: '', start_date: '', end_date: '', contracted_rate: '', rate_unit: '', term_months: '', status: 'Active', auto_renew: false };

const FILTER_CONFIG = {
  vendor_name: 'select',
  contract_number: 'text', name: 'text',
  start_date: 'date', end_date: 'date', contracted_rate: 'text',
  term_months: 'text', auto_renew: 'boolean', status: 'select',
};

export default function Contracts() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('contracts', 'create');
  const canDelete = hasPermission('contracts', 'delete');
  const table = useCrudTable({
    api: { list: getContracts, create: createContract, update: updateContract, delete: deleteContract },
    idKey: 'contracts_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { vendors: getVendors },
    defaultValues: (rel) => ({ vendors_id: rel.vendors[0]?.vendors_id || '' }),
    resourceName: 'contracts',
  });

  const vendors = table.related.vendors;

  const columns = [
    { key: 'contract_number', label: 'Contract #', copyable: true,
      render: (v, row) => (
        <span style={{ color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => navigate(`/contracts/${row.contracts_id}`)}>
          {v || row.name}
        </span>
      ) },
    { key: 'vendor_name', label: 'Vendor', filterType: 'select',
      filterOptions: vendors.map(a => a.name) },
    { key: 'name', label: 'Name', style: { color: '#64748b', fontSize: 13 } },
    { key: 'start_date', label: 'Start Date', filterType: 'date', format: 'date' },
    { key: 'end_date', label: 'End Date', filterType: 'date', format: 'date' },
    { key: 'contracted_rate', label: 'Rate', format: 'currency', summary: 'sum', style: { fontWeight: 700 } },
    { key: 'term_months', label: 'Term', render: v => v ? `${v} mo` : '—' },
    { key: 'auto_renew', label: 'Auto-Renew', filterType: 'select',
      filterOptions: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
      render: v => v ? <span className="badge badge-teal">Yes</span> : <span className="badge badge-gray">No</span> },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
    { key: 'description', label: 'Description', defaultHidden: true, style: { fontSize: 12, color: '#64748b' } },
    { key: 'created_at', label: 'Created At', filterType: 'date', format: 'date', defaultHidden: true },
    { key: 'updated_at', label: 'Updated At', filterType: 'date', format: 'date', defaultHidden: true },
  ];

  const formFields = [
    { key: 'vendors_id', label: 'Vendor *', type: 'select',
      options: vendors.map(a => ({ value: a.vendors_id, label: a.name })), placeholder: 'Select vendor…' },
    { key: 'contract_number', label: 'Contract Number', half: true },
    { key: 'name', label: 'Contract Name', half: true },
    { key: 'start_date', label: 'Start Date', type: 'date', half: true },
    { key: 'end_date', label: 'End Date', type: 'date', half: true },
    { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    { key: 'rate_unit', label: 'Rate Unit', placeholder: 'e.g. /month, /year', half: true },
    { key: 'term_months', label: 'Term (months)', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
    { key: 'auto_renew', label: 'Auto-Renew', type: 'checkbox' },
  ];

  const active = table.data.filter(d => d.status === 'Active').length;
  const now = new Date();
  const expiring30 = table.data.filter(d => { if (!d.end_date) return false; const days = (new Date(d.end_date) - now) / 86400000; return days > 0 && days <= 30; });
  const expired = table.data.filter(d => { if (!d.end_date) return false; return (new Date(d.end_date) - now) / 86400000 <= 0 && d.status !== 'Expired' && d.status !== 'Terminated'; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      {/* Expiration alert banners */}
      {expired.length > 0 && (
        <div className="expiration-banner expiration-banner-danger">
          <AlertTriangle size={18} />
          <span>{expired.length} contract{expired.length > 1 ? 's have' : ' has'} expired and may need attention</span>
        </div>
      )}
      {expiring30.length > 0 && (
        <div className="expiration-banner expiration-banner-warn">
          <AlertTriangle size={18} />
          <span>{expiring30.length} contract{expiring30.length > 1 ? 's' : ''} expiring within 30 days: {expiring30.map(c => c.contract_number || c.name).join(', ')}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card teal"><div className="kpi-label">Total Contracts</div><div className="kpi-value">{table.data.length}</div><div className="kpi-icon"><FileText size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Active</div><div className="kpi-value">{active}</div></div>
        <div className="kpi-card orange"><div className="kpi-label">Expiring Soon</div>
          <div className="kpi-value">{table.data.filter(d => { if (!d.end_date) return false; const days = (new Date(d.end_date) - new Date()) / 86400000; return days > 0 && days <= 90; }).length}</div>
          <div className="kpi-sub">Within 90 days</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="All Contracts"
        titleIcon={<FileText size={15} color="#0d9488" />}
        exportFilename="Contracts"
        bulkUpdateFields={formFields}
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.contracts_id, { skipConfirm: true })); } }
        ] : []}
        headerRight={canCreate ? <button className="btn btn-primary" onClick={() => navigate('/contracts/new')}><Plus size={15} /> New Contract</button> : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Contract"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
