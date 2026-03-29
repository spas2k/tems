/**
 * @file New spend category creation form.
 * @module SpendCategoryAdd
 *
 * Uses FormPage with parent-category lookup for creating a new spend category.
 */
import React from 'react';
import { Layers } from 'lucide-react';
import { createSpendCategory, getSpendCategories } from '../api';
import FormPage from '../components/FormPage';

const EMPTY = { name: '', code: '', description: '', parent_id: '', is_active: 'true' };

const SECTIONS = [
  {
    title: 'Category Details',
    description: 'Define the spend category name, code, and hierarchy',
    fields: (rel) => {
      const parentOptions = rel.categories.map(c => ({
        value: String(c.spend_categories_id), label: c.name,
      }));
      return [
        { key: 'name', label: 'Category Name *', half: true },
        { key: 'code', label: 'Code', half: true },
        { key: 'is_active', label: 'Active', type: 'select', options: ['true', 'false'], half: true },
        { key: 'parent_id', label: 'Parent Category (optional)', type: 'select',
          options: ['', ...parentOptions.map(p => p.value)],
          optionLabels: ['— None —', ...parentOptions.map(p => p.label)], half: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ];
    },
  },
];

export default function SpendCategoryAdd() {
  return (
    <FormPage
      title="New Category"
      subtitle="Create a new spend category"
      icon={Layers}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const res = await getSpendCategories();
        return { categories: res.data };
      }}
      onSubmit={d => createSpendCategory(d)}
      backPath="/spend-categories"
      redirectOnSave={() => '/spend-categories'}
    />
  );
}
