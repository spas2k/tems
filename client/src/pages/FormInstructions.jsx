/**
 * @file Form instruction management list page.
 * @module FormInstructions
 *
 * CRUD list page for form-level help instruction entries.
 */
import React, { useState } from 'react';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { getFormInstructions, createFormInstruction, updateFormInstruction, deleteFormInstruction } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import dayjs from 'dayjs';

const EMPTY = {
  form_id: '', instruction: '', is_active: true
};

const FILTER_CONFIG = { form_id: 'text', is_active: 'select' };

export default function FormInstructions() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canManage = hasPermission('form_instructions', 'create');

  const table = useCrudTable({
    api: { list: getFormInstructions, create: createFormInstruction, update: updateFormInstruction, delete: deleteFormInstruction },
    idKey: 'id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    beforeSave: form => ({ ...form, is_active: form.is_active === true || form.is_active === 'true' }),
  });

  const columns = [
    { key: 'form_id', label: 'Form Identifier', summary: 'count', copyable: true },
    { key: 'instruction', label: 'Instruction',
      render: val => <span style={{ fontSize: 12, color: '#64748b', maxWidth: 400, overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span> },
    { key: 'is_active', label: 'Active', filterType: 'select', filterOptions: ['true','false'],
      render: val => <span className={val ? 'badge badge-green' : 'badge badge-red'}>{val ? 'Yes' : 'No'}</span> },
    { key: 'created_at', label: 'Created', render: val => val ? dayjs(val).format('MM/DD/YYYY') : '—' },
  ];

  /* 
   We could allow free-text or a specific list of form identifiers.
   For now, we will offer a selection of common forms but user can type to search if it was a combo,
   Wait, a standard select might be best. Or a plain text if there's many.
  */
  const FORM_OPTIONS = [
    'accounts', 'contracts', 'cost-savings', 'disputes', 'field-catalog',
    'inventory', 'invoices', 'locations', 'orders', 'reports', 'tickets', 'users', 'vendors', 'vendor-remit'
  ];

  const formFields = [
    { key: 'form_id', label: 'Form Identifier *', type: 'select', options: FORM_OPTIONS, half: true },
    { key: 'is_active', label: 'Active', type: 'select', options: ['true','false'], half: true },
    { key: 'instruction', label: 'Instruction Text *', type: 'textarea' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Instructions</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><BookOpen size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active Instructions</div>
          <div className="kpi-value">{table.data.filter(d => d.is_active).length}</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Inactive Instructions</div>
          <div className="kpi-value">{table.data.filter(d => !d.is_active).length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Form Instructions"
        titleIcon={<BookOpen size={15} color="#3b82f6" />}
        exportFilename="FormInstructions"
        bulkActions={canManage ? [
          { label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => { if (!(await confirm(`Delete ${rows.length} instructions?`))) return; rows.forEach(r => table.handleDelete(r.id, { skipConfirm: true })); } },
        ] : []}
        headerRight={canManage
          ? <button className="btn btn-primary" onClick={() => table.openNew()}><Plus size={15} /> New Instruction</button>
          : null}
      />

      <CrudModal
        open={table.modal}
        title={table.editing ? 'Edit Instruction' : 'New Instruction'}
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
