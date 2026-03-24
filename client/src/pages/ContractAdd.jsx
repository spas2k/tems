import React from 'react';
import { FileText } from 'lucide-react';
import { createContract, getVendors, getContracts } from '../api';
import FormPage from '../components/FormPage';
import { LOOKUP_VENDORS, LOOKUP_CONTRACTS, LOOKUP_CURRENCIES } from '../utils/lookupConfigs';

const STATUSES = ['Active', 'Pending', 'Expired', 'Terminated'];

const EMPTY = {
  vendors_id: '', name: '', contract_number: '',
  start_date: '', end_date: '', contracted_rate: '',
  rate_unit: '', term_months: '', status: 'Active', auto_renew: false, contract_name: '', type: '', subtype: '', parent_contract_id: '', currency_id: '', contract_record_url: '', expiration_date: '', term_type: '', renew_date: '', minimum_spend: '', etf_amount: '', commitment_type: '', contract_value: '', tax_assessed: '', product_service_types: '', business_line: ''
};

const SECTIONS = [
  {
    title: 'Contract Identification',
    description: 'Link this contract to a vendor and provide key identifiers',  
    fields: (rel) => [
      { key: 'vendors_id', label: 'Vendor *', type: 'lookup', ...LOOKUP_VENDORS(rel.vendors), half: true },
      { key: 'contract_number', label: 'Contract Number', half: true },
      { key: 'name', label: 'Contract Name', half: true },
    ],
  },
  {
    title: 'Terms & Pricing',
    description: 'Define the contract period, rates, and terms',
    fields: (rel) => [{ key: 'start_date', label: 'Start Date', type: 'date', half: true },
      { key: 'end_date', label: 'End Date', type: 'date', half: true },
      { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
      { key: 'rate_unit', label: 'Rate Unit', placeholder: 'e.g. /month, /year', half: true },
      { key: 'term_months', label: 'Term (months)', type: 'number', half: true },
      { key: 'auto_renew', label: 'Auto-Renew', type: 'checkbox', half: true }, 
        { key: 'type', label: 'Type', half: true },
        { key: 'subtype', label: 'Subtype', half: true },
        { key: 'parent_contract_id', label: 'Parent Contract Id', type: 'lookup', ...LOOKUP_CONTRACTS(rel.contracts), half: true },
        { key: 'currency_id', label: 'Currency', type: 'lookup', ...LOOKUP_CURRENCIES(rel.currencies), half: true },
        { key: 'contract_record_url', label: 'Contract Record Url', half: true },
        { key: 'expiration_date', label: 'Expiration Date', type: 'date', half: true },
        { key: 'term_type', label: 'Term Type', half: true },
        { key: 'renew_date', label: 'Renew Date', type: 'date', half: true },   
        { key: 'minimum_spend', label: 'Minimum Spend', type: 'number', half: true },
        { key: 'etf_amount', label: 'Etf Amount', type: 'number', half: true }, 
        { key: 'commitment_type', label: 'Commitment Type', half: true },       
        { key: 'contract_value', label: 'Contract Value', type: 'number', half: true },
        { key: 'tax_assessed', label: 'Tax Assessed', half: true },
        { key: 'product_service_types', label: 'Product Service Types', half: true },
        { key: 'business_line', label: 'Business Line', half: true }
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
        const [venRes, conRes] = await Promise.all([getVendors(), getContracts()]);
        return { vendors: venRes.data, contracts: conRes.data, currencies: [] };
      }}
      defaultValues={(rel) => ({ vendors_id: rel.vendors?.[0]?.vendors_id || '' })}
      onSubmit={d => createContract(d)}
      backPath="/contracts"
      redirectOnSave={res => `/contracts/${res.data.contracts_id}`}
    />
  );
}
