/**
 * @file Location list page with CRUD modal, filtering, and export.
 * @module Locations
 *
 * CRUD list page for site/location management.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const SITE_TYPES = ['Data Center', 'Office', 'Remote', 'Warehouse', 'Colocation', 'Other'];

const EMPTY = {
  name: '', site_code: '', site_type: 'Office', address: '', city: '', state: '', zip: '',
  country: 'USA', contact_name: '', contact_phone: '', contact_email: '', status: 'Active', notes: '',
};

const FILTER_CONFIG = {
  name: 'text', site_code: 'text', site_type: 'select', city: 'text', state: 'text', status: 'select',
};

export default function Locations() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('locations', 'create');
  const canDelete = hasPermission('locations', 'delete');

  const table = useCrudTable({
    api: { list: getLocations, create: createLocation, update: updateLocation, delete: deleteLocation },
    idKey: 'locations_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    resourceName: 'locations',
  });

  const columns = [
    { key: 'name', label: 'Site Name', copyable: true, summary: 'count',
      link: row => navigate(`/locations/${row.locations_id}`) },
    { key: 'site_code', label: 'Site Code', style: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' } },
    { key: 'site_type', label: 'Type', filterType: 'select', filterOptions: SITE_TYPES },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'contact_name', label: 'Contact' },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: ['Active', 'Inactive'],
      badge: { Active: 'badge badge-green', Inactive: 'badge badge-red' } },
  ];

  const formFields = [
    { key: 'name', label: 'Site Name *' },
    { key: 'site_code', label: 'Site Code', half: true },
    { key: 'site_type', label: 'Site Type', type: 'select', options: SITE_TYPES, half: true },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City', half: true },
    { key: 'state', label: 'State', half: true },
    { key: 'zip', label: 'ZIP', half: true },
    { key: 'country', label: 'Country', half: true },
    { key: 'contact_name', label: 'Contact Name', half: true },
    { key: 'contact_phone', label: 'Contact Phone', half: true },
    { key: 'contact_email', label: 'Contact Email', type: 'email' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Locations</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><MapPin size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{table.data.filter(d => d.status === 'Active').length}</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value">{table.data.filter(d => d.status === 'Inactive').length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="All Locations"
        titleIcon={<MapPin size={15} color="#0d9488" />}
        exportFilename="Locations"
        bulkUpdateFields={formFields}
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.locations_id, { skipConfirm: true })); } },
        ] : []}
        headerRight={canCreate
          ? <button className="btn btn-primary" onClick={() => navigate('/locations/new')}><Plus size={15} /> New Location</button>
          : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Location"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
