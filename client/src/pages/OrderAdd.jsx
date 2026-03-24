import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { createOrder, getAccounts, getInventory } from '../api';
import FormPage from '../components/FormPage';

const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const EMPTY = {
  accounts_id: '', contracts_id: '', cir_id: '', order_number: '',
  description: '', contracted_rate: '', status: 'Pending',
  order_date: '', due_date: '', notes: '',
};

const SECTIONS = [
  {
    title: 'Order Details',
    description: 'Core order information and vendor assignment',
    fields: (rel) => [
      { key: 'order_number', label: 'Order Number', half: true },
      { key: 'accounts_id', label: 'Vendor Account *', type: 'select',
        options: (rel.accounts || []).map(a => ({ value: a.accounts_id, label: a.name })),
        placeholder: 'Select vendor…', half: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
      { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    ],
  },
  {
    title: 'Description & Associations',
    description: 'What this order is for and related records',
    fields: (rel) => [
      { key: 'description', label: 'Description', placeholder: 'Brief description of this order' },
      { key: 'cir_id', label: 'Related InventoryItem (optional)', type: 'select',
        options: (rel.inventory || []).map(c => ({ value: c.cir_id, label: `${c.inventory_number} — ${c.location || ''}` })),
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
      subtitle="Create a new inventoryItem order"
      icon={ShoppingCart}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const [acct, circ] = await Promise.all([getAccounts(), getInventory()]);
        return { accounts: acct.data, inventory: circ.data };
      }}
      defaultValues={(rel) => ({ accounts_id: rel.accounts?.[0]?.accounts_id || '' })}
      beforeSave={form => ({ ...form, cir_id: form.cir_id || null })}
      onSubmit={d => createOrder(d)}
      backPath="/orders"
      redirectOnSave={res => `/orders/${res.data.orders_id}`}
    />
  );
}
