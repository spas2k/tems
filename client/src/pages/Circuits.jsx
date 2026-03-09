import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Network, Trash2 } from 'lucide-react';
import { getCircuits, createCircuit, updateCircuit, deleteCircuit, getAccounts, getContracts } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const TYPES = ['MPLS', 'Internet', 'Ethernet', 'Voice', 'SD-WAN', 'Dedicated', 'Other'];
const STATUSES = ['Active', 'Pending', 'Disconnected', 'Suspended'];
const STATUS_BADGE = { Active: 'badge badge-green', Pending: 'badge badge-blue', Disconnected: 'badge badge-gray', Suspended: 'badge badge-orange' };

const EMPTY = { accounts_id: '', contracts_id: '', orders_id: '', circuit_number: '', location: '', type: 'Internet', bandwidth: '', contracted_rate: '', install_date: '', status: 'Active' };

const FILTER_CONFIG = {
  circuit_number: 'text', account_name: 'select', location: 'text',
  type: 'select', bandwidth: 'text', contracted_rate: 'text', status: 'select',
};

export default function Circuits() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('circuits', 'create');
  const canDelete = hasPermission('circuits', 'delete');
  const table = useCrudTable({
    api: { list: getCircuits, create: createCircuit, update: updateCircuit, delete: deleteCircuit },
    idKey: 'circuits_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { accounts: getAccounts, contracts: getContracts },
    defaultValues: (rel) => ({ accounts_id: rel.accounts[0]?.accounts_id || '' }),
  });

  const { accounts, contracts } = table.related;

  const columns = [
    { key: 'circuit_number', label: 'Circuit ID', copyable: true, link: row => navigate(`/circuits/${row.circuits_id}`) },
    { key: 'account_name', label: 'Vendor', filterType: 'select', filterOptions: accounts.map(a => a.name) },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type', filterType: 'select', filterOptions: TYPES },
    { key: 'bandwidth', label: 'Bandwidth' },
    { key: 'contracted_rate', label: 'Monthly Cost', format: 'currency', summary: 'sum', style: { fontWeight: 700 } },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
  ];

  const formFields = [
    { key: 'circuit_number', label: 'Circuit ID *', half: true },
    { key: 'accounts_id', label: 'Vendor Account *', type: 'select',
      options: accounts.map(a => ({ value: a.accounts_id, label: a.name })), placeholder: 'Select vendor…', half: true },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Circuit Type', type: 'select', options: TYPES, half: true },
    { key: 'bandwidth', label: 'Bandwidth', placeholder: 'e.g. 100 Mbps', half: true },
    { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    { key: 'install_date', label: 'Install Date', type: 'date', half: true },
    { key: 'contracts_id', label: 'Contract (optional)', type: 'select',
      options: contracts.map(c => ({ value: c.contracts_id, label: c.contract_number })), placeholder: 'None', half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
  ];

  const totalMRC = table.data.filter(d => d.status === 'Active').reduce((s, d) => s + Number(d.contracted_rate || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card purple"><div className="kpi-label">Total Circuits</div><div className="kpi-value">{table.data.length}</div><div className="kpi-icon"><Network size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Active Circuits</div><div className="kpi-value">{table.data.filter(d => d.status === 'Active').length}</div></div>
        <div className="kpi-card blue"><div className="kpi-label">Monthly MRC</div><div className="kpi-value">${totalMRC.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div className="kpi-sub">Active circuits only</div></div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Circuit Inventory"
        titleIcon={<Network size={15} color="#7c3aed" />}
        exportFilename="Circuits"
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.circuits_id, { skipConfirm: true })); } }
        ] : []}
        headerRight={canCreate ? <button className="btn btn-primary" onClick={() => navigate('/circuits/new')}><Plus size={15} /> New Circuit</button> : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Circuit"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
