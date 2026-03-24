import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { createAccount, getVendors } from '../api';
import FormPage from '../components/FormPage';

const EMPTY = {
  vendors_id: '', name: '', account_number: '', subaccount_number: '',
  account_type: '', account_subtype: '', team: '', status: 'Active'
};

export default function AccountAdd() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVendors().then(r => {
      setVendors(r.data.map(v => ({ value: v.vendors_id, label: v.name })));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  const SECTIONS = [
    {
      title: 'Account Information',
      description: 'Core details for this billing account',
      fields: [
        { key: 'vendors_id', label: 'Vendor *', type: 'select', options: vendors, half: true },
        { key: 'name', label: 'Account Profile Name', half: true },
        { key: 'account_number', label: 'Account Number *', half: true },
        { key: 'subaccount_number', label: 'Sub-Account Number', half: true },
        { key: 'account_type', label: 'Account Type', half: true },
        { key: 'account_subtype', label: 'Account Sub-type', half: true },
        { key: 'team', label: 'Responsible Team', half: true },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], half: true },
      ],
    }
  ];

  return (
    <FormPage
      title="New Account"
      subtitle="Add a new billing account to a vendor"
      icon={Building2}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createAccount(d)}
      backPath="/accounts"
      redirectOnSave={res => `/accounts/${res.data.accounts_id}`}
    />
  );
}
