/**
 * @file New invoice creation form.
 * @module InvoiceAdd
 *
 * Uses FormPage with account lookup for creating a new invoice.
 */
import React from 'react';
import { Receipt } from 'lucide-react';
import { createInvoice, getAccounts } from '../api';
import FormPage from '../components/FormPage';
import { LOOKUP_ACCOUNTS } from '../utils/lookupConfigs';

const STATUSES = ['Open', 'Paid', 'Disputed', 'Void'];

const EMPTY = {
  accounts_id: '', invoice_number: '', invoice_date: '',
  due_date: '', period_start: '', period_end: '',
  total_amount: '', status: 'Open', notes: '',
};

const SECTIONS = [
  {
    title: 'Invoice Details',
    description: 'Vendor, invoice number, and amount',
    fields: (rel) => [
      { key: 'accounts_id', label: 'Vendor Account *', type: 'lookup', ...LOOKUP_ACCOUNTS(rel.accounts) },
      { key: 'invoice_number', label: 'Invoice Number', half: true },
      { key: 'total_amount', label: 'Total Amount ($)', type: 'number', step: '0.01', half: true },
    ],
  },
  {
    title: 'Dates',
    description: 'Invoice dates and billing period',
    fields: [
      { key: 'invoice_date', label: 'Invoice Date', type: 'date', half: true },
      { key: 'due_date', label: 'Due Date', type: 'date', half: true },
      { key: 'period_start', label: 'Period Start', type: 'date', half: true },
      { key: 'period_end', label: 'Period End', type: 'date', half: true },
    ],
  },
  {
    title: 'Status',
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    ],
  },
];

export default function InvoiceAdd() {
  return (
    <FormPage
      title="New Invoice"
      subtitle="Record a new vendor invoice"
      icon={Receipt}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const res = await getAccounts();
        return { accounts: res.data };
      }}
      defaultValues={(rel) => ({ accounts_id: rel.accounts?.[0]?.accounts_id || '' })}
      onSubmit={d => createInvoice(d)}
      backPath="/invoices"
      redirectOnSave={res => `/invoices/${res.data.invoices_id}`}
    />
  );
}
