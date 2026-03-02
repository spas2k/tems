import React from 'react';
import { Building2 } from 'lucide-react';
import { createAccount } from '../api';
import FormPage from '../components/FormPage';

const VENDOR_TYPES = ['AT&T', 'Comcast', 'Verizon', 'Lumen', 'Spectrum', 'Other'];

const EMPTY = {
  name: '', account_number: '', vendor_type: 'AT&T',
  contact_name: '', contact_email: '', contact_phone: '',
  status: 'Active', notes: '',
};

const SECTIONS = [
  {
    title: 'Vendor Details',
    description: 'Core information about this vendor account',
    fields: [
      { key: 'name', label: 'Vendor Name *' },
      { key: 'account_number', label: 'Account Number', half: true },
      { key: 'vendor_type', label: 'Vendor Type', type: 'select', options: VENDOR_TYPES, half: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
  },
  {
    title: 'Contact Information',
    description: 'Primary contact for this vendor',
    fields: [
      { key: 'contact_name', label: 'Contact Name', half: true },
      { key: 'contact_phone', label: 'Phone', half: true },
      { key: 'contact_email', label: 'Email Address', type: 'email' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes about this vendor…' },
    ],
  },
];

export default function AccountAdd() {
  return (
    <FormPage
      title="New Vendor Account"
      subtitle="Add a new vendor to the system"
      icon={Building2}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createAccount(d)}
      backPath="/accounts"
      redirectOnSave={res => `/accounts/${res.data.accounts_id}`}
    />
  );
}
