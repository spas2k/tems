import React from 'react';
import { FileText } from 'lucide-react';
import { createContract, getAccounts } from '../api';
import FormPage from '../components/FormPage';

const STATUSES = ['Active', 'Pending', 'Expired', 'Terminated'];

const EMPTY = {
  accounts_id: '', name: '', contract_number: '',
  start_date: '', end_date: '', contracted_rate: '',
  rate_unit: '', term_months: '', status: 'Active', auto_renew: false,
};

const SECTIONS = [
  {
    title: 'Contract Identification',
    description: 'Link this contract to a vendor and provide key identifiers',
    fields: (rel) => [
      { key: 'accounts_id', label: 'Vendor Account *', type: 'select',
        options: (rel.accounts || []).map(a => ({ value: a.accounts_id, label: a.name })),
        placeholder: 'Select vendor…' },
      { key: 'contract_number', label: 'Contract Number', half: true },
      { key: 'name', label: 'Contract Name', half: true },
    ],
  },
  {
    title: 'Terms & Pricing',
    description: 'Define the contract period, rates, and terms',
    fields: [
      { key: 'start_date', label: 'Start Date', type: 'date', half: true },
      { key: 'end_date', label: 'End Date', type: 'date', half: true },
      { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
      { key: 'rate_unit', label: 'Rate Unit', placeholder: 'e.g. /month, /year', half: true },
      { key: 'term_months', label: 'Term (months)', type: 'number', half: true },
      { key: 'auto_renew', label: 'Auto-Renew', type: 'checkbox', half: true },
    ],
  },
  {
    title: 'Status',
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    ],
  },
];

export default function ContractAdd() {
  return (
    <FormPage
      title="New Contract"
      subtitle="Create a new vendor contract"
      icon={FileText}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const res = await getAccounts();
        return { accounts: res.data };
      }}
      defaultValues={(rel) => ({ accounts_id: rel.accounts?.[0]?.accounts_id || '' })}
      onSubmit={d => createContract(d)}
      backPath="/contracts"
      redirectOnSave={res => `/contracts/${res.data.contracts_id}`}
    />
  );
}
