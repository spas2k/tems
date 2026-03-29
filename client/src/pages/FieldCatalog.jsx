/**
 * @file Field catalog aggregated category list with drill-down.
 * @module FieldCatalog
 *
 * Shows field catalog categories with entry counts; navigates to FieldCatalogDetail.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database } from 'lucide-react';
import { getFieldCatalog, createFieldCatalog } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';

const EMPTY = { category: '', label: '', sort_order: 0, is_active: true, description: '' };

const formFields = [
  { key: 'category',    label: 'Category',      required: true, placeholder: 'e.g. Bandwidth, InventoryItem Type…' },
  { key: 'label',       label: 'Label',         required: true, half: true },
  { key: 'sort_order',  label: 'Sort Order',    type: 'number', half: true },
  { key: 'is_active',   label: 'Active',        type: 'select', options: ['true', 'false'], half: true },
  { key: 'description', label: 'Description',   type: 'textarea' },
];

export default function FieldCatalog() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('field_catalog', 'create');

  const table = useCrudTable({
    api: { list: getFieldCatalog, create: createFieldCatalog },
    idKey:     'field_catalog_id',
    emptyForm: EMPTY,
    beforeSave: form => ({ ...form, value: form.label, is_active: form.is_active === true || form.is_active === 'true' }),
  });

  // Aggregate raw entries into one row per category
  const categoryRows = useMemo(() => {
    const map = {};
    table.data.forEach(e => {
      const cat = e.category || '(uncategorized)';
      if (!map[cat]) map[cat] = { category: cat, total: 0, active: 0 };
      map[cat].total++;
      if (e.is_active) map[cat].active++;
    });
    return Object.values(map).sort((a, b) => a.category.localeCompare(b.category));
  }, [table.data]);

  const columns = [
    {
      key: 'category', label: 'Category',
      link: row => navigate(`/field-catalog/${encodeURIComponent(row.category)}`),
    },
    { key: 'total',  label: 'Options', style: { textAlign: 'center', width: 120 } },
    {
      key: 'active', label: 'Active', style: { textAlign: 'center', width: 120 },
      render: val => <span className="badge badge-green">{val}</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Entries</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Database size={40} /></div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Categories</div>
          <div className="kpi-value">{categoryRows.length}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active Entries</div>
          <div className="kpi-value">{table.data.filter(d => d.is_active).length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        idKey="category"
        data={categoryRows}
        allData={categoryRows}
        totalItems={categoryRows.length}
        rawTotal={categoryRows.length}
        title="Field Catalog"
        titleIcon={<Database size={15} color="#475569" />}
        headerRight={canCreate
          ? <button className="btn btn-primary" onClick={() => table.openNew()}><Plus size={15} /> New Entry</button>
          : null}
      />

      <CrudModal
        open={table.modal}
        title="New Catalog Entry"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}

