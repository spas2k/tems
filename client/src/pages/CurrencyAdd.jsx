import React from 'react';
import { DollarSign } from 'lucide-react';
import { createCurrency } from '../api';
import FormPage from '../components/FormPage';

const EMPTY = { currency_code: '', name: '', symbol: '', exchange_rate: 1, status: 'Active' };

const SECTIONS = [
  {
    title: 'Currency Details',
    description: 'Define the currency code, name, symbol, and exchange rate',
    fields: () => [
      { key: 'currency_code', label: 'Currency Code *', half: true },
      { key: 'name', label: 'Currency Name *', half: true },
      { key: 'symbol', label: 'Symbol *', half: true },
      { key: 'exchange_rate', label: 'Exchange Rate', type: 'number', half: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], half: true },
    ],
  },
];

export default function CurrencyAdd() {
  return (
    <FormPage
      title="New Currency"
      subtitle="Create a new currency"
      icon={DollarSign}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createCurrency(d)}
      backPath="/currencies"
      redirectOnSave={() => '/currencies'}
    />
  );
}
