import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { createDispute, getVendors, getInvoices } from '../api';
import FormPage from '../components/FormPage';

const STATUSES = ['Open', 'Under Review', 'Credited', 'Denied', 'Closed'];
const TYPES = ['Overcharge', 'Duplicate Charge', 'Wrong Rate', 'Missing Credit', 'Service Not Delivered', 'Other'];

const EMPTY = {
  invoices_id: '', vendors_id: '', line_items_id: '', dispute_type: 'Overcharge',
  amount: '', status: 'Open', filed_date: '', resolved_date: '',
  resolution_notes: '', credit_amount: '', reference_number: '', notes: '',
};

const SECTIONS = [
  {
    title: 'Dispute Details',
    description: 'Vendor, invoice, and dispute classification',
    fields: (rel) => [
      { key: 'vendors_id', label: 'Vendor Account *', type: 'select',
        options: (rel.vendors || []).map(a => ({ value: a.vendors_id, label: a.name })),
        placeholder: 'Select vendor…' },
      { key: 'invoices_id', label: 'Invoice', type: 'select',
        options: (rel.invoices || []).map(i => ({ value: i.invoices_id, label: `${i.invoice_number} — ${i.vendor_name || ''}` })),
        placeholder: 'Select invoice…', half: true },
      { key: 'dispute_type', label: 'Dispute Type', type: 'select', options: TYPES, half: true },
      { key: 'reference_number', label: 'Reference #', half: true },
      { key: 'amount', label: 'Disputed Amount ($)', type: 'number', step: '0.01', half: true },
    ],
  },
  {
    title: 'Status & Resolution',
    description: 'Current status, dates, and credit information',
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
      { key: 'credit_amount', label: 'Credit Amount ($)', type: 'number', step: '0.01', half: true },
      { key: 'filed_date', label: 'Filed Date', type: 'date', half: true },
      { key: 'resolved_date', label: 'Resolved Date', type: 'date', half: true },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'resolution_notes', label: 'Resolution Notes', type: 'textarea', placeholder: 'Details about resolution…' },
      { key: 'notes', label: 'General Notes', type: 'textarea', placeholder: 'Additional notes…' },
    ],
  },
];

export default function DisputeAdd() {
  return (
    <FormPage
      title="New Dispute"
      subtitle="File a new billing dispute"
      icon={ShieldAlert}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const [acct, inv] = await Promise.all([getVendors(), getInvoices()]);
        return { vendors: acct.data, invoices: inv.data };
      }}
      defaultValues={(rel) => ({
        vendors_id: rel.vendors?.[0]?.vendors_id || '',
        invoices_id: rel.invoices?.[0]?.invoices_id || '',
        filed_date: new Date().toISOString().slice(0, 10),
      })}
      beforeSave={form => ({
        ...form,
        resolved_date: form.resolved_date || null,
        credit_amount: form.credit_amount || null,
        line_items_id: form.line_items_id || null,
      })}
      onSubmit={d => createDispute(d)}
      backPath="/disputes"
      redirectOnSave={res => `/disputes/${res.data.disputes_id}`}
    />
  );
}
