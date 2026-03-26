import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Landmark, Trash2 } from 'lucide-react';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const SERVICE_TYPES = ['Telecom', 'ISP', 'Wireless', 'Fiber/Colocation', 'Fiber/Small Cell', 'SD-WAN/Carrier', 'ISP/Cable', 'Other'];

const EMPTY = { name: '', vendor_number: '', vendor_type: 'Telecom', contact_name: '', contact_email: '', contact_phone: '', status: 'Active' };

const FILTER_CONFIG = {
  name: 'text', vendor_number: 'text', vendor_type: 'select',
  contact_name: 'text', contact_email: 'text', status: 'select',
};

export default function Vendors() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('vendors', 'create');
  const canDelete = hasPermission('vendors', 'delete');
  const table = useCrudTable({
    api: { list: getVendors, create: createVendor, update: updateVendor, delete: deleteVendor },
    idKey: 'vendors_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    resourceName: 'vendors',
  });

  const columns = [
    { key: 'name', label: 'Vendor Name', copyable: true, summary: 'count', link: row => navigate(`/vendors/${row.vendors_id}`) },
    { key: 'vendor_number', label: 'Vendor #', style: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' } },
    { key: 'vendor_type', label: 'Service Type', filterType: 'select', filterOptions: SERVICE_TYPES },
    { key: 'contact_name', label: 'Contact' },
    { key: 'contact_email', label: 'Email', style: { color: '#3b82f6' } },
    { key: 'contact_phone', label: 'Phone' },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: ['Active', 'Inactive'],
      badge: { Active: 'badge badge-green', Inactive: 'badge badge-gray' } },
  ];

  const formFields = [
    { key: 'name', label: 'Vendor Name *' },
    { key: 'account_number', label: 'Account Number', half: true },
    { key: 'vendor_type', label: 'Service Type', type: 'select', options: SERVICE_TYPES, half: true },
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
          <div className="kpi-label">Total Vendors</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Landmark size={40} /></div>
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
        title="All Vendors"
        titleIcon={<Landmark size={15} color="#2563eb" />}
        exportFilename="Vendors"
        bulkUpdateFields={formFields}
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.vendors_id, { skipConfirm: true })); } }
        ] : []}
        headerRight={canCreate ? <button className="btn btn-primary" onClick={() => navigate('/vendors/new')}><Plus size={15} /> New Vendor</button> : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Vendor"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
