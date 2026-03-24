import React from 'react';
import { Building2 } from 'lucide-react';
import { createAccount, getVendors, getAccounts } from '../api';
import FormPage from '../components/FormPage';
import { LOOKUP_VENDORS, LOOKUP_ACCOUNTS, LOOKUP_CURRENCIES } from '../utils/lookupConfigs';

const EMPTY = {
  vendors_id: '', name: '', account_number: '', subaccount_number: '',
  account_type: '', account_subtype: '', team: '', status: 'Active',
  assigned_user_id: '', account_hierarchy: '', parent_account_id: '', currency_id: '',
  company_code_id: '', ship_to_location_id: '', asset_location_id: '', tax_analyst_id: '',
  payment_info: '', allocation_settings: '', contact_details: ''
};

const SECTIONS = [
  {
    title: 'Account Information',
    description: 'Core details for this billing account',
    fields: (rel) => [
      { key: 'vendors_id', label: 'Vendor *', type: 'lookup', ...LOOKUP_VENDORS(rel.vendors), half: true },
      { key: 'name', label: 'Account Profile Name', half: true },
      { key: 'account_number', label: 'Account Number *', half: true },
      { key: 'subaccount_number', label: 'Sub-Account Number', half: true },    
      { key: 'account_type', label: 'Account Type', half: true },
      { key: 'account_subtype', label: 'Account Sub-type', half: true },        
      { key: 'team', label: 'Responsible Team', half: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], half: true },
      { key: 'assigned_user_id', label: 'Assigned User Id', half: true },       
      { key: 'account_hierarchy', label: 'Account Hierarchy', half: true },     
      { key: 'parent_account_id', label: 'Parent Account Id', type: 'lookup', ...LOOKUP_ACCOUNTS(rel.accounts), half: true },     
      { key: 'currency_id', label: 'Currency', type: 'lookup', ...LOOKUP_CURRENCIES(rel.currencies), half: true },
      { key: 'company_code_id', label: 'Company Code Id', half: true },
      { key: 'ship_to_location_id', label: 'Ship To Location Id', half: true }, 
      { key: 'asset_location_id', label: 'Asset Location Id', half: true },     
      { key: 'tax_analyst_id', label: 'Tax Analyst Id', half: true },
      { key: 'payment_info', label: 'Payment Info', half: true },
      { key: 'allocation_settings', label: 'Allocation Settings', half: true }, 
      { key: 'contact_details', label: 'Contact Details', half: true }
    ],
  }
];

export default function AccountAdd() {
  return (
    <FormPage
      title="New Account"
      subtitle="Create a new vendor account"
      icon={Building2}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const [venRes, accRes] = await Promise.all([getVendors(), getAccounts()]);
        return { vendors: venRes.data, accounts: accRes.data, currencies: [] };
      }}
      defaultValues={(rel) => ({ vendors_id: rel.vendors?.[0]?.vendors_id || '' })}
      onSubmit={d => createAccount(d)}
      backPath="/accounts"
      redirectOnSave={res => `/accounts/${res.data.accounts_id}`}
    />
  );
}

