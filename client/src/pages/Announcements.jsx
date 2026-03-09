import React, { useState } from 'react';
import { Plus, Megaphone, Trash2 } from 'lucide-react';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import dayjs from 'dayjs';

const EMPTY = {
  title: '', message: '', type: 'info',
  is_active: true, start_date: '', end_date: '',
};

const FILTER_CONFIG = { title: 'text', type: 'select', is_active: 'select' };

const TYPE_BADGE = {
  info:    'badge badge-blue',
  warning: 'badge badge-orange',
  danger:  'badge badge-red',
  success: 'badge badge-green',
};

export default function Announcements() {
  const { hasPermission, isAdmin } = useAuth();
  const confirm = useConfirm();
  const canManage = isAdmin;

  const table = useCrudTable({
    api: { list: getAnnouncements, create: createAnnouncement, update: updateAnnouncement, delete: deleteAnnouncement },
    idKey: 'announcements_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    beforeSave: form => ({ ...form, is_active: form.is_active === true || form.is_active === 'true' }),
  });

  const columns = [
    { key: 'title', label: 'Title', summary: 'count', copyable: true },
    { key: 'type', label: 'Type', filterType: 'select', filterOptions: ['info','warning','danger','success'],
      render: val => <span className={TYPE_BADGE[val] || 'badge badge-gray'}>{val}</span> },
    { key: 'message', label: 'Message',
      render: val => <span style={{ fontSize: 12, color: '#64748b', maxWidth: 300, overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span> },
    { key: 'start_date', label: 'Start', render: val => val ? dayjs(val).format('MM/DD/YYYY') : '—' },
    { key: 'end_date',   label: 'End',   render: val => val ? dayjs(val).format('MM/DD/YYYY') : '—' },
    { key: 'is_active', label: 'Active', filterType: 'select', filterOptions: ['true','false'],
      render: val => <span className={val ? 'badge badge-green' : 'badge badge-gray'}>{val ? 'Active' : 'Inactive'}</span> },
  ];

  const formFields = [
    { key: 'title', label: 'Title *' },
    { key: 'type', label: 'Type', type: 'select', options: ['info','warning','danger','success'], half: true },
    { key: 'is_active', label: 'Active', type: 'select', options: ['true','false'], half: true },
    { key: 'start_date', label: 'Start Date (optional)', type: 'date', half: true },
    { key: 'end_date',   label: 'End Date (optional)',   type: 'date', half: true },
    { key: 'message', label: 'Message *', type: 'textarea' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Announcements</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><Megaphone size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Currently Active</div>
          <div className="kpi-value">{table.data.filter(d => d.is_active).length}</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value">{table.data.filter(d => !d.is_active).length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Announcements"
        titleIcon={<Megaphone size={15} color="#d97706" />}
        exportFilename="Announcements"
        bulkActions={canManage ? [
          { label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => { if (!(await confirm(`Delete ${rows.length} announcements?`))) return; rows.forEach(r => table.handleDelete(r.announcements_id, { skipConfirm: true })); } },
        ] : []}
        headerRight={canManage
          ? <button className="btn btn-primary" onClick={() => table.openNew()}><Plus size={15} /> New Announcement</button>
          : null}
      />

      <CrudModal
        open={table.modal}
        title={table.editing ? 'Edit Announcement' : 'New Announcement'}
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
