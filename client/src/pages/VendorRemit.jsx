import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { getVendorRemits, createVendorRemit, updateVendorRemit, deleteVendorRemit, getVendors } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import LookupField from '../components/LookupField';
import { LOOKUP_VENDORS } from '../utils/lookupConfigs';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const PAYMENT_METHODS = ['ACH', 'Check', 'Wire', 'EFT', 'Credit Card'];

const EMPTY = {
  vendors_id: '', remit_name: '', remit_code: '', payment_method: 'ACH',
  bank_name: '', routing_number: '', bank_vendor_number: '',
  remit_address: '', remit_city: '', remit_state: '', remit_zip: '',
  status: 'Active', notes: '',
};

const FILTER_CONFIG = {
  remit_name: 'text', vendor_name: 'text', payment_method: 'select', status: 'select',
};

export default function VendorRemit() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('vendors', 'create');
  const canDelete  = hasPermission('vendors', 'delete');

  const table = useCrudTable({
    api: { list: getVendorRemits, create: createVendorRemit, update: updateVendorRemit, delete: deleteVendorRemit },
    idKey: 'vendor_remit_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { vendors: getVendors },
    resourceName: 'vendor-remit',
  });

  const vendors = table.related?.vendors || [];
  const vendorOptions = vendors.map(v => ({
    value: String(v.vendors_id), label: v.name,
  }));

  const columns = [
    { key: 'remit_name', label: 'Remit Name', copyable: true, summary: 'count',
      link: row => navigate(`/vendor-remit/${row.vendor_remit_id}`) },
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'remit_code', label: 'Remit Code', style: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' } },
    { key: 'payment_method', label: 'Method', filterType: 'select', filterOptions: PAYMENT_METHODS },
    { key: 'bank_name', label: 'Bank' },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: ['Active', 'Inactive'],
      badge: { Active: 'badge badge-green', Inactive: 'badge badge-gray' } },
  ];

  const formFields = [
    { key: 'remit_name', label: 'Remit Name *' },
    { key: 'vendors_id', label: 'Vendor', half: true,
      render: (form, setField) => (
        <LookupField
          label="Vendor"
          {...LOOKUP_VENDORS(vendors)}
          value={form.vendors_id}
          onChange={row => setField('vendors_id', row.vendors_id)}
          onClear={() => setField('vendors_id', '')}
          displayValue={vendors.find(v => v.vendors_id === Number(form.vendors_id))?.name}
        />
      ) },
    { key: 'remit_code', label: 'Remit Code', half: true },
    { key: 'payment_method', label: 'Payment Method', type: 'select', options: PAYMENT_METHODS, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], half: true },
    { key: 'bank_name', label: 'Bank Name', half: true },
    { key: 'routing_number', label: 'Routing Number', half: true },
    { key: 'bank_vendor_number', label: 'Bank Vendor Number' },
    { key: 'remit_address', label: 'Remit Address' },
    { key: 'remit_city', label: 'City', half: true },
    { key: 'remit_state', label: 'State', half: true },
    { key: 'remit_zip', label: 'ZIP', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Remit Records</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><CreditCard size={40} /></div>
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
        title="Vendor Remit"
        titleIcon={<CreditCard size={15} color="#7c3aed" />}
        exportFilename="VendorRemit"
        bulkUpdateFields={formFields}
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.vendor_remit_id, { skipConfirm: true })); } },
        ] : []}
        headerRight={canCreate
          ? <button className="btn btn-primary" onClick={() => navigate('/vendor-remit/new')}><Plus size={15} /> New Remit Record</button>
          : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Remit Record"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
