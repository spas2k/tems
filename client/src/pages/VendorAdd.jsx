import React from 'react';
import { Landmark } from 'lucide-react';
import { createVendor } from '../api';
import FormPage from '../components/FormPage';

const VENDOR_TIERS = ['Tier 1', 'Tier 2', 'Tier 3', 'Unclassified'];

const EMPTY = {
  name: '', vendor_number: '', vendor_type: 'Telecom',
  contact_name: '', contact_email: '', contact_phone: '',
  country: 'USA', tier: 'Tier 1', fourth_party_vendor: false,
  website: '', status: 'Active'
};

const SECTIONS = [
  {
    title: 'Vendor Details',
    description: 'Core organizational details',
    fields: [
      { key: 'name', label: 'Vendor Name *' },
      { key: 'vendor_number', label: 'Vendor Number', half: true },
      { key: 'vendor_type', label: 'Vendor Type', half: true },
      { key: 'tier', label: 'Tier', type: 'select', options: VENDOR_TIERS, half: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], half: true },
      { key: 'website', label: 'Website' },
      { key: 'fourth_party_vendor', label: 'Fourth Party Vendor?', type: 'select', options: [{label: 'Yes', value: true}, {label: 'No', value: false}] },
    ],
  },
  {
    title: 'Contact Information',
    description: 'Primary contact and location',
    fields: [
      { key: 'contact_name', label: 'Contact Name', half: true },
      { key: 'contact_phone', label: 'Phone', half: true },
      { key: 'contact_email', label: 'Email Address', type: 'email', half: true },
      { key: 'country', label: 'Country', half: true },
    ],
  }
];

export default function VendorAdd() {
  return (
    <FormPage
      title="New Vendor"
      subtitle="Register a new provider"
      icon={Landmark}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createVendor(d)}
      backPath="/vendors"
      redirectOnSave={res => `/vendors/${res.data.vendors_id}`}
    />
  );
}
