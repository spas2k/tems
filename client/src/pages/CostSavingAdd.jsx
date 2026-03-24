import React from 'react';
import { Zap } from 'lucide-react';
import { createCostSaving, getAccounts, getInventory } from '../api';
import FormPage from '../components/FormPage';

const CATEGORIES = ['Billing Error', 'Contract Optimization', 'Disconnect', 'Rate Negotiation', 'Duplicate', 'Other'];
const STATUSES = ['Identified', 'In Progress', 'Resolved'];

const EMPTY = {
  accounts_id: '', cir_id: '', category: 'Billing Error',
  description: '', projected_savings: '', realized_savings: '',
  status: 'Identified', identified_date: '', resolved_date: '', notes: '',
};

const SECTIONS = [
  {
    title: 'Identification',
    description: 'Vendor, category, and current status',
    fields: (rel) => [
      { key: 'accounts_id', label: 'Vendor Account *', type: 'select',
        options: (rel.accounts || []).map(a => ({ value: a.accounts_id, label: a.name })),
        placeholder: 'Select vendor…' },
      { key: 'category', label: 'Category', type: 'select', options: CATEGORIES, half: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
    ],
  },
  {
    title: 'Savings Details',
    description: 'Description and financial impact',
    fields: [
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the savings opportunity…' },
      { key: 'projected_savings', label: 'Projected Savings ($)', type: 'number', step: '0.01', half: true },
      { key: 'realized_savings', label: 'Realized Savings ($)', type: 'number', step: '0.01', half: true },
    ],
  },
  {
    title: 'Dates & Associations',
    fields: (rel) => [
      { key: 'identified_date', label: 'Identified Date', type: 'date', half: true },
      { key: 'resolved_date', label: 'Resolved Date', type: 'date', half: true },
      { key: 'cir_id', label: 'Related InventoryItem (optional)', type: 'select',
        options: (rel.inventory || []).map(c => ({ value: c.cir_id, label: `${c.inventory_number} — ${c.location || ''}` })),
        placeholder: 'None' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes…' },
    ],
  },
];

export default function CostSavingAdd() {
  return (
    <FormPage
      title="New Savings Opportunity"
      subtitle="Record a new cost savings opportunity"
      icon={Zap}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const [acct, circ] = await Promise.all([getAccounts(), getInventory()]);
        return { accounts: acct.data, inventory: circ.data };
      }}
      defaultValues={(rel) => ({ accounts_id: rel.accounts?.[0]?.accounts_id || '' })}
      beforeSave={form => ({ ...form, cir_id: form.cir_id || null })}
      onSubmit={d => createCostSaving(d)}
      backPath="/cost-savings"
    />
  );
}
