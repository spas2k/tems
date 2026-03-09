import React from 'react';
import { Landmark } from 'lucide-react';
import { createVendor } from '../api';
import FormPage from '../components/FormPage';

const SERVICE_TYPES = ['Telecom', 'ISP', 'Wireless', 'Fiber/Colocation', 'Fiber/Small Cell', 'SD-WAN/Carrier', 'ISP/Cable', 'Other'];

const EMPTY = {
  name: '', account_number: '', vendor_type: 'Telecom',
  contact_name: '', contact_email: '', contact_phone: '',
  status: 'Active', notes: '',
};

const SECTIONS = [
  {
    title: 'Vendor Details',
    description: 'Core information about this vendor',
    fields: [
      { key: 'name', label: 'Vendor Name *' },
      { key: 'account_number', label: 'Account Number', half: true },
      { key: 'vendor_type', label: 'Service Type', type: 'select', options: SERVICE_TYPES, half: true },
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

export default function VendorAdd() {
  return (
    <FormPage
      title="New Vendor"
      subtitle="Add a new vendor to the system"
      icon={Landmark}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createVendor(d)}
      backPath="/vendors"
      redirectOnSave={res => `/vendors/${res.data.accounts_id}`}
    />
  );
}
