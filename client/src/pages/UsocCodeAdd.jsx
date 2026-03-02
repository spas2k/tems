import React from 'react';
import { Tag } from 'lucide-react';
import { createUsocCode } from '../api';
import FormPage from '../components/FormPage';

const CATEGORIES = ['Access', 'Transport', 'Wireless', 'Feature', 'Surcharge'];
const STATUSES = ['Active', 'Inactive'];

const EMPTY = {
  usoc_code: '', description: '', category: 'Access',
  sub_category: '', default_mrc: '', default_nrc: '',
  unit: 'Each', status: 'Active',
};

const SECTIONS = [
  {
    title: 'Code Details',
    description: 'USOC code identifier and categorization',
    fields: [
      { key: 'usoc_code', label: 'USOC Code *', placeholder: 'e.g. CLF00', half: true },
      { key: 'category', label: 'Category', type: 'select', options: CATEGORIES, half: true },
      { key: 'description', label: 'Description', placeholder: 'What this USOC code represents' },
      { key: 'sub_category', label: 'Sub-Category', half: true },
      { key: 'unit', label: 'Unit', placeholder: 'Each', half: true },
    ],
  },
  {
    title: 'Default Rates',
    description: 'Standard recurring and non-recurring charges',
    fields: [
      { key: 'default_mrc', label: 'Default MRC ($)', type: 'number', step: '0.01', half: true },
      { key: 'default_nrc', label: 'Default NRC ($)', type: 'number', step: '0.01', half: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    ],
  },
];

export default function UsocCodeAdd() {
  return (
    <FormPage
      title="New USOC Code"
      subtitle="Add a new Universal Service Order Code"
      icon={Tag}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createUsocCode(d)}
      backPath="/usoc-codes"
      redirectOnSave={res => `/usoc-codes/${res.data.usoc_codes_id}`}
    />
  );
}
