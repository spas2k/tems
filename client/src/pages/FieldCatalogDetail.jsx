import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Database, ArrowLeft, Trash2 } from 'lucide-react';
import { getFieldCatalog, createFieldCatalog, updateFieldCatalog, deleteFieldCatalog } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

export default function FieldCatalogDetail() {
  const { category } = useParams();
  const navigate     = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('accounts', 'create');
  const canDelete  = hasPermission('accounts', 'delete');

  const categoryName = decodeURIComponent(category);

  const table = useCrudTable({
    api: {
      list:   () => getFieldCatalog({ category: categoryName }),
      create: d  => createFieldCatalog(d),
      update: updateFieldCatalog,
      delete: deleteFieldCatalog,
    },
    idKey:        'field_catalog_id',
    emptyForm:    { category: categoryName, label: '', sort_order: 0, is_active: true, description: '' },
    filterConfig: { label: 'text', is_active: 'select' },
    beforeSave: form => ({ ...form, value: form.label, is_active: form.is_active === true || form.is_active === 'true' }),
  });

  const columns = [
    { key: 'label',       label: 'Label', summary: 'count', link: row => table.openEdit(row) },
    { key: 'sort_order',  label: 'Order',         style: { textAlign: 'center', width: 80 } },
    { key: 'description', label: 'Description' },
    {
      key: 'is_active', label: 'Active',
      render: val => (
        <span className={val ? 'badge badge-green' : 'badge badge-gray'}>
          {val ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  const formFields = [
    { key: 'category', label: 'Category', disabled: true },
    { key: 'label',       label: 'Label', required: true, half: true },
    { key: 'sort_order',  label: 'Sort Order', type: 'number', half: true },
    { key: 'is_active',   label: 'Active', type: 'select', options: ['true', 'false'], half: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ];

  const handleOpenNew = () => {
    table.openNew({ category: categoryName });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      {/* Back nav */}
      <div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/field-catalog')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b' }}
        >
          <ArrowLeft size={14} /> Back to Field Catalog
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Options</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Database size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{table.data.filter(d => d.is_active).length}</div>
        </div>
        <div className="kpi-card gray">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value">{table.data.filter(d => !d.is_active).length}</div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        {...table.tableProps}
        title={categoryName}
        titleIcon={<Database size={15} color="#475569" />}
        exportFilename={`FieldCatalog_${categoryName}`}
        bulkActions={canDelete ? [
          {
            label: 'Delete',
            icon: Trash2,
            danger: true,
            onClick: async rows => {
              if (!(await confirm(`Delete ${rows.length} option${rows.length !== 1 ? 's' : ''}?`))) return;
              rows.forEach(r => table.handleDelete(r.field_catalog_id, { skipConfirm: true }));
            },
          },
        ] : []}
        headerRight={canCreate
          ? <button className="btn btn-primary" onClick={handleOpenNew}><Plus size={15} /> Add Option</button>
          : null}
      />

      <CrudModal
        open={table.modal}
        title={table.editing ? `Edit Option — ${categoryName}` : `New Option — ${categoryName}`}
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
