import React from 'react';
import { Network } from 'lucide-react';
import { createInventoryItem, getAccounts, getContracts } from '../api';
import FormPage from '../components/FormPage';

const TYPES = ['MPLS', 'Internet', 'Ethernet', 'Voice', 'SD-WAN', 'Dedicated', 'Other'];
const STATUSES = ['Active', 'Pending', 'Disconnected', 'Suspended'];

const EMPTY = {
  accounts_id: '', contracts_id: '', inventory_number: '',
  location: '', type: 'Internet', bandwidth: '',
  contracted_rate: '', install_date: '', status: 'Active',
};

const SECTIONS = [
  {
    title: 'InventoryItem Identification',
    description: 'Key identifiers and vendor assignment',
    fields: (rel) => [
      { key: 'inventory_number', label: 'InventoryItem ID *', half: true },
      { key: 'accounts_id', label: 'Vendor Account *', type: 'select',
        options: (rel.accounts || []).map(a => ({ value: a.accounts_id, label: a.name })),
        placeholder: 'Select vendor…', half: true },
      { key: 'location', label: 'Location', placeholder: 'e.g. 123 Main St, New York, NY' },
    ],
  },
  {
    title: 'Configuration',
    description: 'InventoryItem type, bandwidth, and cost details',
    fields: [
      { key: 'type', label: 'InventoryItem Type', type: 'select', options: TYPES, half: true },
      { key: 'bandwidth', label: 'Bandwidth', placeholder: 'e.g. 100 Mbps', half: true },
      { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
      { key: 'install_date', label: 'Install Date', type: 'date', half: true },
    ],
  },
  {
    title: 'Associations & Status',
    description: 'Link to an existing contract and set status',
    fields: (rel) => [
      { key: 'contracts_id', label: 'Contract (optional)', type: 'select',
        options: (rel.contracts || []).map(c => ({ value: c.contracts_id, label: c.contract_number || c.name })),
        placeholder: 'None' },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    ],
  },
];

export default function InventoryItemAdd() {
  return (
    <FormPage
      title="New InventoryItem"
      subtitle="Add a inventoryItem to the inventory"
      icon={Network}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const [acct, contr] = await Promise.all([getAccounts(), getContracts()]);
        return { accounts: acct.data, contracts: contr.data };
      }}
      defaultValues={(rel) => ({ accounts_id: rel.accounts?.[0]?.accounts_id || '' })}
      onSubmit={d => createInventoryItem(d)}
      backPath="/inventory"
      redirectOnSave={res => `/inventory/${res.data.cir_id}`}
    />
  );
}
