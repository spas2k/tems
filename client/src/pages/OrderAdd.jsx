import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { createOrder, getVendors, getContracts, getInventory } from '../api';
import FormPage from '../components/FormPage';

const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const EMPTY = {
  vendors_id: '', contracts_id: '', inventory_id: '', order_number: '',
  description: '', contracted_rate: '', status: 'Pending',
  order_date: '', due_date: '', notes: '', assigned_users_id: ''
};

const SECTIONS = [
  {
    title: 'Order Details',
    description: 'Core order information and vendor assignment',
    fields: (rel) => [
      { key: 'order_number', label: 'Order Number', half: true },
      { key: 'vendors_id', label: 'Vendor *', type: 'select',
        options: (rel.vendors || []).map(v => ({ value: v.vendors_id, label: v.name })),
        placeholder: 'Select vendor…', half: true },
      { key: 'contracts_id', label: 'Contract *', type: 'select',
        options: (rel.contracts || []).map(c => ({ value: c.contracts_id, label: c.contract_number })),
        placeholder: 'Select contract…', half: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
      { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    ],
  },
  {
    title: 'Description & Associations',
    description: 'What this order is for and related records',
    fields: (rel) => [
      { key: 'description', label: 'Description', placeholder: 'Brief description of this order' },
      { key: 'inventory_id', label: 'Related Inventory Item (optional)', type: 'select',
        options: (rel.inventory || []).map(i => ({ value: i.inventory_id, label: i.inventory_number + (i.location ? ' � ' + i.location : '') })),
        placeholder: 'None' },
    ],
  },
  {
    title: 'Dates',
    fields: [
      { key: 'order_date', label: 'Order Date', type: 'date', half: true },
      { key: 'due_date', label: 'Due Date', type: 'date', half: true },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes…' },
    ],
  },
];

export default function OrderAdd() {
  return (
    <FormPage
      title="New Order"
      subtitle="Create a new inventory item order"
      icon={ShoppingCart}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const [vends, conts, invs] = await Promise.all([getVendors(), getContracts(), getInventory()]);
        return { vendors: vends.data, contracts: conts.data, inventory: invs.data };
      }}
      defaultValues={(rel) => ({ vendors_id: rel.vendors?.[0]?.vendors_id || '' })}
      beforeSave={form => ({ ...form, inventory_id: form.inventory_id || null })}
      onSubmit={d => createOrder(d)}
      backPath="/orders"
      redirectOnSave={res => /orders/ + res.data.orders_id}
    />
  );
}
