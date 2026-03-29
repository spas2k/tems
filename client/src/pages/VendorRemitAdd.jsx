/**
 * @file New vendor remittance creation form.
 * @module VendorRemitAdd
 *
 * Manual form with vendor fetch for creating a new remittance record.
 */
import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { createVendorRemit, getVendors } from '../api';
import FormPage from '../components/FormPage';

const PAYMENT_METHODS = ['ACH', 'Check', 'Wire', 'EFT', 'Credit Card'];

const EMPTY = {
  vendors_id: '', remit_name: '', remit_code: '', payment_method: 'ACH',
  bank_name: '', routing_number: '', bank_account_number: '',
  remit_address: '', remit_city: '', remit_state: '', remit_zip: '',
  status: 'Active', notes: '',
};

export default function VendorRemitAdd() {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    getVendors().then(res => setVendors(res.data || [])).catch(() => {});
  }, []);

  const vendorValues  = vendors.map(v => String(v.vendors_id));
  const vendorLabels  = vendors.map(v => v.name);

  const SECTIONS = [
    {
      title: 'Remittance Details',
      description: 'Core remittance information',
      fields: [
        { key: 'remit_name', label: 'Remit Name *' },
        { key: 'vendors_id', label: 'Vendor', type: 'select',
          options: vendorValues, optionLabels: vendorLabels, half: true },
        { key: 'remit_code', label: 'Remit Code', half: true },
        { key: 'payment_method', label: 'Payment Method', type: 'select', options: PAYMENT_METHODS, half: true },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], half: true },
      ],
    },
    {
      title: 'Bank Information',
      description: 'Banking details for electronic payments',
      fields: [
        { key: 'bank_name', label: 'Bank Name', half: true },
        { key: 'routing_number', label: 'Routing Number (ABA)', half: true },
        { key: 'bank_account_number', label: 'Vendor Number' },
      ],
    },
    {
      title: 'Remit Address',
      description: 'Mailing address for check payments',
      fields: [
        { key: 'remit_address', label: 'Street Address' },
        { key: 'remit_city', label: 'City', half: true },
        { key: 'remit_state', label: 'State', half: true },
        { key: 'remit_zip', label: 'ZIP Code', half: true },
      ],
    },
    {
      title: 'Notes',
      fields: [
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional remittance notes…' },
      ],
    },
  ];

  return (
    <FormPage
      title="New Vendor Remit"
      subtitle="Add a new vendor remittance record"
      icon={CreditCard}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createVendorRemit(d)}
      backPath="/vendor-remit"
      redirectOnSave={res => `/vendor-remit/${res.data.vendor_remit_id}`}
    />
  );
}
