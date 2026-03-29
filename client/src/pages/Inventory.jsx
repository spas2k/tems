/**
 * @file Inventory list page with CRUD modal and account/contract/order lookups.
 * @module Inventory
 *
 * CRUD list page for circuit/service inventory items.
 */
﻿import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Network, Trash2 } from 'lucide-react';
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, getAccounts, getContracts, getOrders } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import LookupField from '../components/LookupField';
import { LOOKUP_ACCOUNTS, LOOKUP_CONTRACTS, LOOKUP_ORDERS } from '../utils/lookupConfigs';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const TYPES = ['MPLS', 'Internet', 'Ethernet', 'Voice', 'SD-WAN', 'Dedicated', 'Other'];
const STATUSES = ['Active', 'Pending', 'Disconnected', 'Suspended'];
const STATUS_BADGE = { Active: 'badge badge-green', Pending: 'badge badge-blue', Disconnected: 'badge badge-gray', Suspended: 'badge badge-orange' };

const EMPTY = { accounts_id: '', contracts_id: '', orders_id: '', inventory_number: '', location: '', type: 'Internet', bandwidth: '', contracted_rate: '', install_date: '', disconnect_date: '', status: 'Active' };

const FILTER_CONFIG = {
  inventory_number: 'text', account_name: 'select', location: 'text',
  type: 'select', bandwidth: 'text', contracted_rate: 'text', status: 'select',
};

export default function Inventory() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('inventory', 'create');
  const canDelete = hasPermission('inventory', 'delete');
  const table = useCrudTable({
    api: { list: getInventory, create: createInventoryItem, update: updateInventoryItem, delete: deleteInventoryItem },
    idKey: 'inventory_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { accounts: getAccounts, contracts: getContracts, orders: getOrders },
    defaultValues: (rel) => ({ accounts_id: rel.accounts[0]?.accounts_id || '' }),
    resourceName: 'inventory',
  });

  const { accounts, contracts, orders } = table.related;

  const columns = [
    { key: 'inventory_number', label: 'Inventory Number', copyable: true, link: row => navigate(/inventory/ + row.inventory_id) },
    { key: 'account_name', label: 'Account', filterType: 'select', filterOptions: accounts.map(a => a.name) },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type', filterType: 'select', filterOptions: TYPES },
    { key: 'bandwidth', label: 'Bandwidth' },
    { key: 'contracted_rate', label: 'Monthly Cost', format: 'currency', summary: 'sum', style: { fontWeight: 700 } },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
    { key: 'install_date', label: 'Install Date', filterType: 'date', format: 'date', defaultHidden: true },
    { key: 'disconnect_date', label: 'Disconnect Date', filterType: 'date', format: 'date', defaultHidden: true },
  ];

  const formFields = [
    { key: 'inventory_number', label: 'Inventory Number *', half: true },
    { key: 'accounts_id', label: 'Account *', half: true,
      render: (form, setField) => (
        <LookupField
          label="Account *"
          {...LOOKUP_ACCOUNTS(accounts)}
          value={form.accounts_id}
          onChange={row => setField('accounts_id', row.accounts_id)}
          onClear={() => setField('accounts_id', '')}
          displayValue={accounts.find(a => a.accounts_id === Number(form.accounts_id))?.name}
        />
      ) },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type', type: 'select', options: TYPES, half: true },
    { key: 'bandwidth', label: 'Bandwidth', placeholder: 'e.g. 100 Mbps', half: true },
    { key: 'contracted_rate', label: 'Contracted Rate ($)', type: 'number', step: '0.01', half: true },
    { key: 'install_date', label: 'Install Date', type: 'date', half: true },
    { key: 'contracts_id', label: 'Contract *', half: true,
      render: (form, setField) => (
        <LookupField
          label="Contract *"
          {...LOOKUP_CONTRACTS(contracts)}
          value={form.contracts_id}
          onChange={row => setField('contracts_id', row.contracts_id)}
          onClear={() => setField('contracts_id', '')}
          displayValue={contracts.find(c => c.contracts_id === Number(form.contracts_id))?.contract_number}
        />
      ) },
    { key: 'orders_id', label: 'Order (optional)', half: true,
      render: (form, setField) => (
        <LookupField
          label="Order (optional)"
          {...LOOKUP_ORDERS(orders)}
          value={form.orders_id}
          onChange={row => setField('orders_id', row.orders_id)}
          onClear={() => setField('orders_id', '')}
          displayValue={orders.find(o => o.orders_id === Number(form.orders_id))?.order_number}
        />
      ) },
    { key: 'disconnect_date', label: 'Disconnect Date', type: 'date', half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
  ];

  const totalMRC = table.data.filter(d => d.status === 'Active').reduce((s, d) => s + Number(d.contracted_rate || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card purple"><div className="kpi-label">Total Inventory</div><div className="kpi-value">{table.data.length}</div><div className="kpi-icon"><Network size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Active Inventory</div><div className="kpi-value">{table.data.filter(d => d.status === 'Active').length}</div></div>
        <div className="kpi-card blue"><div className="kpi-label">Monthly MRC</div><div className="kpi-value">${totalMRC.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div className="kpi-sub">Active inventory only</div></div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Inventory"
        titleIcon={<Network size={15} color="#7c3aed" />}
        exportFilename="Inventory"
        bulkUpdateFields={formFields}
        bulkActions={canDelete ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm('Delete ' + rows.length + ' records?'))) return; rows.forEach(r => table.handleDelete(r.inventory_id, { skipConfirm: true })); } }
        ] : []}
        headerRight={canCreate ? <button className="btn btn-primary" onClick={() => navigate('/inventory/new')}><Plus size={15} /> New Inventory Item</button> : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Inventory Item"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
