import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { getOrders, createOrder, updateOrder, deleteOrder, getVendors, getContracts, getInventory } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import LookupField from '../components/LookupField';
import { LOOKUP_VENDORS, LOOKUP_CONTRACTS, LOOKUP_INVENTORY } from '../utils/lookupConfigs';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const STATUS_BADGE = { Pending: 'badge badge-orange', 'In Progress': 'badge badge-blue', Completed: 'badge badge-green', Cancelled: 'badge badge-gray' };

const EMPTY = { vendors_id: '', contracts_id: '', inventory_id: '', order_number: '', description: '', contracted_rate: '', status: 'Pending', order_date: '', due_date: '', notes: '', assigned_users_id: '' };

const FILTER_CONFIG = {
  order_number: 'text', vendor_name: 'select', description: 'text',
  inventory_number: 'text', order_date: 'date', due_date: 'date',
  contracted_rate: 'text', status: 'select',
};

export default function Orders() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('orders', 'create');
  const canDelete = hasPermission('orders', 'delete');
  const table = useCrudTable({
    api: { list: getOrders, create: createOrder, update: updateOrder, delete: deleteOrder },
    idKey: 'orders_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { vendors: getVendors, contracts: getContracts, inventory: getInventory },
    defaultValues: (rel) => ({ vendors_id: rel.vendors[0]?.vendors_id || '' }),
    beforeSave: form => ({ ...form, inventory_id: form.inventory_id || null }),
    resourceName: 'orders',
  });

  const { vendors, contracts, inventory } = table.related;

  const columns = [
    { key: 'order_number', label: 'Order #', copyable: true, link: row => navigate(/orders/ + row.orders_id) },
    { key: 'vendor_name', label: 'Vendor', filterType: 'select', filterOptions: vendors.map(v => v.name) },
    { key: 'contract_number', label: 'Contract', filterType: 'select', filterOptions: contracts.map(c => c.contract_number) },
    { key: 'description', label: 'Description',
      style: { maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 13 } },
    { key: 'inventory_number', label: 'Inventory Item', style: { fontSize: 12, color: '#64748b' } },
    { key: 'order_date', label: 'Order Date', filterType: 'date', format: 'date' },
    { key: 'due_date', label: 'Due Date', filterType: 'date', format: 'date' },
    { key: 'contracted_rate', label: 'Rate', format: 'currency', summary: 'sum', style: { fontWeight: 700 } },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
  ];

  const formFields = [
    { key: 'order_number', label: 'Order Number', half: true },
    { key: 'vendors_id', label: 'Vendor *', half: true,
      render: (form, setField) => (
        <LookupField
          label="Vendor *"
          {...LOOKUP_VENDORS(vendors)}
          value={form.vendors_id}
          onChange={row => setField('vendors_id', row.vendors_id)}
          onClear={() => setField('vendors_id', '')}
          displayValue={vendors.find(v => v.vendors_id === Number(form.vendors_id))?.name}
        />
      ) },
    { key: 'contracts_id', label: 'Contract *', half: true,
      render: (form, setField) => (
        <LookupField
          label="Contract *"
          {...LOOKUP_CONTRACTS(contracts)}
          value={form.contracts_id}
          onChange={row => setField('contracts_id', row.contracts_id)}
          onClear={() => setField('contracts_id', '')}
          displayValue={contracts.find(c => c.contracts_id === Number(form.contracts_id))?.contract_number}
        />
      ) },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
    { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    { key: 'description', label: 'Description', placeholder: 'Brief description of this order' },
    { key: 'inventory_id', label: 'Inventory Item (optional)',
      render: (form, setField) => (
        <LookupField
          label="Inventory Item (optional)"
          {...LOOKUP_INVENTORY(inventory)}
          value={form.inventory_id}
          onChange={row => setField('inventory_id', row.inventory_id)}
          onClear={() => setField('inventory_id', '')}
          displayValue={inventory.find(i => i.inventory_id === Number(form.inventory_id))?.inventory_number}
        />
      ) },
    { key: 'order_date', label: 'Order Date', type: 'date', half: true },
    { key: 'due_date', label: 'Due Date', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card slate"><div className="kpi-label">Total Orders</div><div className="kpi-value">{table.data.length}</div><div className="kpi-icon"><ShoppingCart size={40} /></div></div>
        <div className="kpi-card orange"><div className="kpi-label">Pending</div><div className="kpi-value">{table.data.filter(d => d.status === 'Pending').length}</div></div>
        <div className="kpi-card blue"><div className="kpi-label">In Progress</div><div className="kpi-value">{table.data.filter(d => d.status === 'In Progress').length}</div></div>
        <div className="kpi-card green"><div className="kpi-label">Completed</div><div className="kpi-value">{table.data.filter(d => d.status === 'Completed').length}</div></div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="All Orders"
        titleIcon={<ShoppingCart size={15} color="#16a34a" />}
        exportFilename="Orders"
        bulkUpdateFields={formFields}
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm('Delete ' + rows.length + ' records?'))) return; rows.forEach(r => table.handleDelete(r.orders_id, { skipConfirm: true })); } }
        ] : []}
        headerRight={canCreate ? <button className="btn btn-primary" onClick={() => navigate('/orders/new')}><Plus size={15} /> New Order</button> : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Order"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
