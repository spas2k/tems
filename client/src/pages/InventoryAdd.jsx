import React from 'react';
import { Network } from 'lucide-react';
import { createInventoryItem, getAccounts, getContracts, getOrders } from '../api';
import FormPage from '../components/FormPage';

const TYPES = ['MPLS', 'Internet', 'Ethernet', 'Voice', 'SD-WAN', 'Dedicated', 'Other'];
const STATUSES = ['Active', 'Pending', 'Disconnected', 'Suspended'];

const EMPTY = {
  accounts_id: '', contracts_id: '', orders_id: '', inventory_number: '',
  location: '', type: 'Internet', bandwidth: '',
  contracted_rate: '', install_date: '', disconnect_date: '', status: 'Active',
};

const SECTIONS = [
  {
    title: 'Inventory Item Identification',
    description: 'Key identifiers and account assignment',
    fields: (rel) => [
      { key: 'inventory_number', label: 'Inventory Number *', half: true },
      { key: 'accounts_id', label: 'Account *', type: 'select',
        options: (rel.accounts || []).map(a => ({ value: a.accounts_id, label: a.name })),
        placeholder: 'Select account…', half: true },
      { key: 'location', label: 'Location', placeholder: 'e.g. 123 Main St, New York, NY' },
    ],
  },
  {
    title: 'Configuration',
    description: 'Type, bandwidth, and cost details',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: TYPES, half: true },
      { key: 'bandwidth', label: 'Bandwidth', placeholder: 'e.g. 100 Mbps', half: true },
      { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    ],
  },
  {
    title: 'Associations & Status',
    description: 'Link to contracts/orders and set valid dates',
    fields: (rel) => [
      { key: 'contracts_id', label: 'Contract *', type: 'select',
        options: (rel.contracts || []).map(c => ({ value: c.contracts_id, label: c.contract_number || c.name })),
        placeholder: 'Select contract…', half: true },
      { key: 'orders_id', label: 'Order (optional)', type: 'select',
        options: (rel.orders || []).map(o => ({ value: o.orders_id, label: o.order_number })),
        placeholder: 'None', half: true },
      { key: 'install_date', label: 'Install Date', type: 'date', half: true },
      { key: 'disconnect_date', label: 'Disconnect Date', type: 'date', half: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    ],
  },
];

export default function InventoryAdd() {
  return (
    <FormPage
      title="New Inventory Item"
      subtitle="Add a new item to the inventory"
      icon={Network}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const [acct, contr, ord] = await Promise.all([getAccounts(), getContracts(), getOrders()]);
        return { accounts: acct.data, contracts: contr.data, orders: ord.data };
      }}
      defaultValues={(rel) => ({ accounts_id: rel.accounts?.[0]?.accounts_id || '' })}
      beforeSave={form => ({
        ...form,
        orders_id: form.orders_id || null,
        contracted_rate: form.contracted_rate || null,
        install_date: form.install_date || null,
        disconnect_date: form.disconnect_date || null
      })}
      onSubmit={d => createInventoryItem(d)}
      backPath="/inventory"
      redirectOnSave={res => `/inventory/${res.data.inventory_id}`}
    />
  );
}
