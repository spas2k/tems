import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Tag } from 'lucide-react';
import { getUsocCodes, createUsocCode, updateUsocCode, deleteUsocCode } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';

const CATEGORIES = ['Access', 'Transport', 'Wireless', 'Feature', 'Surcharge'];
const STATUSES = ['Active', 'Inactive'];
const STATUS_BADGE = { Active: 'badge badge-green', Inactive: 'badge badge-gray' };

const EMPTY = { usoc_code: '', description: '', category: 'Access', sub_category: '', default_mrc: '', default_nrc: '', unit: 'Each', status: 'Active' };

const FILTER_CONFIG = {
  usoc_code: 'text', description: 'text', category: 'select',
  sub_category: 'text', default_mrc: 'text', default_nrc: 'text', status: 'select',
};

export default function UsocCodes() {
  const navigate = useNavigate();
  const table = useCrudTable({
    api: { list: getUsocCodes, create: createUsocCode, update: updateUsocCode, delete: deleteUsocCode },
    idKey: 'usoc_codes_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
  });

  const fmt = n => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

  const columns = [
    { key: 'usoc_code', label: 'USOC Code', link: row => navigate(`/usoc-codes/${row.usoc_codes_id}`) },
    { key: 'description', label: 'Description',
      style: { maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
    { key: 'category', label: 'Category', filterType: 'select', filterOptions: CATEGORIES,
      render: v => <span className="badge badge-purple">{v}</span> },
    { key: 'sub_category', label: 'Sub-Category', style: { color: '#64748b', fontSize: 13 } },
    { key: 'default_mrc', label: 'Default MRC', style: { fontWeight: 700 }, render: v => fmt(v) },
    { key: 'default_nrc', label: 'Default NRC', style: { fontWeight: 700 }, render: v => fmt(v) },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
  ];

  const formFields = [
    { key: 'usoc_code', label: 'USOC Code *', placeholder: 'e.g. CLF00', half: true },
    { key: 'category', label: 'Category', type: 'select', options: CATEGORIES, half: true },
    { key: 'description', label: 'Description' },
    { key: 'sub_category', label: 'Sub-Category', half: true },
    { key: 'unit', label: 'Unit', placeholder: 'Each', half: true },
    { key: 'default_mrc', label: 'Default MRC ($)', type: 'number', step: '0.01', half: true },
    { key: 'default_nrc', label: 'Default NRC ($)', type: 'number', step: '0.01', half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card purple"><div className="kpi-label">Total USOC Codes</div><div className="kpi-value">{table.data.length}</div><div className="kpi-icon"><Tag size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Active</div><div className="kpi-value">{table.data.filter(d => d.status === 'Active').length}</div></div>
        <div className="kpi-card blue"><div className="kpi-label">Categories</div><div className="kpi-value">{new Set(table.data.map(d => d.category)).size}</div></div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="USOC Code Catalog"
        headerRight={<button className="btn btn-primary" onClick={() => navigate('/usoc-codes/new')}><Plus size={15} /> New USOC Code</button>}
      />

      <CrudModal
        open={table.modal}
        title="Edit USOC Code"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
