/**
 * @file Spend category taxonomy list page.
 * @module SpendCategories
 *
 * CRUD list page for spend categories with parent hierarchy.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, Trash2 } from 'lucide-react';
import { getSpendCategories, createSpendCategory, updateSpendCategory, deleteSpendCategory } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const EMPTY = { name: '', code: '', description: '', parent_id: '', is_active: true };
const FILTER_CONFIG = { name: 'text', code: 'text', parent_name: 'text', is_active: 'select' };

export default function SpendCategories() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('spend_categories', 'create');
  const canDelete  = hasPermission('spend_categories', 'delete');

  const table = useCrudTable({
    api: { list: getSpendCategories, create: createSpendCategory, update: updateSpendCategory, delete: deleteSpendCategory },
    idKey: 'spend_categories_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
  });

  // Build parent options from loaded data
  const parentOptions = table.data.map(c => ({
    value: String(c.spend_categories_id), label: c.name,
  }));

  const columns = [
    { key: 'name', label: 'Category Name', copyable: true, summary: 'count', link: row => navigate(`/spend-categories/${row.spend_categories_id}`) },
    { key: 'code', label: 'Code', style: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' } },
    { key: 'parent_name', label: 'Parent Category',
      render: val => val || <span style={{ color: '#cbd5e1' }}>—</span> },
    { key: 'description', label: 'Description',
      render: val => <span style={{ fontSize: 12, color: '#64748b' }}>{val || '—'}</span> },
    { key: 'is_active', label: 'Active',
      render: val => <span className={val ? 'badge badge-green' : 'badge badge-red'}>{val ? 'Yes' : 'No'}</span> },
  ];

  const formFields = [
    { key: 'name', label: 'Category Name *' },
    { key: 'code', label: 'Code', half: true },
    { key: 'is_active', label: 'Active', type: 'select', options: ['true', 'false'], half: true },
    { key: 'parent_id', label: 'Parent Category (optional)', type: 'select',
      options: ['', ...parentOptions.map(p => p.value)],
      optionLabels: ['— None —', ...parentOptions.map(p => p.label)] },
    { key: 'description', label: 'Description', type: 'textarea' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Categories</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Layers size={40} /></div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Top-Level</div>
          <div className="kpi-value">{table.data.filter(d => !d.parent_id).length}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{table.data.filter(d => d.is_active).length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Spend Categories"
        titleIcon={<Layers size={15} color="#2563eb" />}
        exportFilename="SpendCategories"
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => { if (!(await confirm(`Delete ${rows.length} categories?`))) return; rows.forEach(r => table.handleDelete(r.spend_categories_id, { skipConfirm: true })); } },
        ] : []}
        headerRight={canCreate
          ? <button className="btn btn-primary" onClick={() => navigate('/spend-categories/new')}><Plus size={15} /> New Category</button>
          : null}
      />
    </div>
  );
}
