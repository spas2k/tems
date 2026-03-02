import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { getOrders, createOrder, updateOrder, deleteOrder, getAccounts, getContracts, getCircuits } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';

const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const STATUS_BADGE = { Pending: 'badge badge-orange', 'In Progress': 'badge badge-blue', Completed: 'badge badge-green', Cancelled: 'badge badge-gray' };

const EMPTY = { accounts_id: '', contracts_id: '', circuits_id: '', order_number: '', description: '', contracted_rate: '', status: 'Pending', order_date: '', due_date: '', notes: '' };

const FILTER_CONFIG = {
  order_number: 'text', account_name: 'select', description: 'text',
  circuit_identifier: 'text', order_date: 'date', due_date: 'date',
  contracted_rate: 'text', status: 'select',
};

export default function Orders() {
  const navigate = useNavigate();
  const table = useCrudTable({
    api: { list: getOrders, create: createOrder, update: updateOrder, delete: deleteOrder },
    idKey: 'orders_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { accounts: getAccounts, contracts: getContracts, circuits: getCircuits },
    defaultValues: (rel) => ({ accounts_id: rel.accounts[0]?.accounts_id || '' }),
    beforeSave: form => ({ ...form, circuits_id: form.circuits_id || null }),
  });

  const { accounts, circuits } = table.related;

  const columns = [
    { key: 'order_number', label: 'Order #', copyable: true, link: row => navigate(`/orders/${row.orders_id}`) },
    { key: 'account_name', label: 'Vendor', filterType: 'select', filterOptions: accounts.map(a => a.name) },
    { key: 'description', label: 'Description',
      style: { maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 13 } },
    { key: 'circuit_identifier', label: 'Circuit', style: { fontSize: 12, color: '#64748b' } },
    { key: 'order_date', label: 'Order Date', filterType: 'date', format: 'date' },
    { key: 'due_date', label: 'Due Date', filterType: 'date', format: 'date' },
    { key: 'contracted_rate', label: 'Rate', format: 'currency', summary: 'sum', style: { fontWeight: 700 } },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
  ];

  const formFields = [
    { key: 'order_number', label: 'Order Number', half: true },
    { key: 'accounts_id', label: 'Vendor Account *', type: 'select',
      options: accounts.map(a => ({ value: a.accounts_id, label: a.name })), placeholder: 'Select vendor…', half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
    { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    { key: 'description', label: 'Description', placeholder: 'Brief description of this order' },
    { key: 'circuits_id', label: 'Related Circuit (optional)', type: 'select',
      options: circuits.map(c => ({ value: c.circuits_id, label: `${c.circuit_number} — ${c.location}` })), placeholder: 'None' },
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
        exportFilename="Orders"
        bulkActions={[
          { label: 'Delete', icon: Trash2, danger: true, onClick: rows => { if (window.confirm(`Delete ${rows.length} records?`)) rows.forEach(r => table.handleDelete(r.orders_id)); } }
        ]}
        headerRight={<button className="btn btn-primary" onClick={() => navigate('/orders/new')}><Plus size={15} /> New Order</button>}
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
