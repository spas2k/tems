/**
 * @file Invoice list page with CRUD modal and account lookup.
 * @module Invoices
 *
 * CRUD list page for invoices.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Receipt, Trash2 } from 'lucide-react';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, getAccounts } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import LookupField from '../components/LookupField';
import { LOOKUP_ACCOUNTS } from '../utils/lookupConfigs';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const STATUSES = ['Open', 'Paid', 'Disputed', 'Void'];
const STATUS_BADGE = { Open: 'badge badge-blue', Paid: 'badge badge-green', Disputed: 'badge badge-orange', Void: 'badge badge-gray' };

const EMPTY = { accounts_id: '', invoice_number: '', invoice_date: '', due_date: '', period_start: '', period_end: '', total_amount: '', status: 'Open', notes: '' };

const FILTER_CONFIG = {
  invoice_number: 'text', account_name: 'select', invoice_date: 'date',
  due_date: 'date', total_amount: 'text', total_variance: 'text', status: 'select',
};

export default function Invoices() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const canCreate = hasPermission('invoices', 'create');
  const canDelete = hasPermission('invoices', 'delete');
  const table = useCrudTable({
    api: { list: getInvoices, create: createInvoice, update: updateInvoice, delete: deleteInvoice },
    idKey: 'invoices_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { accounts: getAccounts },
    defaultValues: (rel) => ({ accounts_id: rel.accounts[0]?.accounts_id || '' }),
    resourceName: 'invoices',
  });

  const accounts = table.related.accounts;

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', copyable: true, link: row => navigate(`/invoices/${row.invoices_id}`) },
    { key: 'account_name', label: 'Vendor', filterType: 'select',
      filterOptions: accounts.map(a => a.name), style: { fontWeight: 500 } },
    { key: 'invoice_date', label: 'Invoice Date', filterType: 'date', format: 'date', style: { color: '#64748b' } },
    { key: 'due_date', label: 'Due Date', filterType: 'date', format: 'date', style: { color: '#64748b' } },
    { key: 'total_amount', label: 'Amount', format: 'currency', summary: 'sum', style: { fontWeight: 700 } },
    { key: 'total_variance', label: 'Variance', render: (v) => {
      const variance = Number(v || 0);
      return (
        <span style={{ color: variance > 0 ? '#dc2626' : variance < 0 ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
          {variance !== 0 ? `$${variance.toFixed(2)}` : '—'}
        </span>
      );
    }},
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
    { key: 'period_start', label: 'Period Start', filterType: 'date', format: 'date', defaultHidden: true },
    { key: 'period_end', label: 'Period End', filterType: 'date', format: 'date', defaultHidden: true },
    { key: 'created_at', label: 'Imported At', filterType: 'date', format: 'date', defaultHidden: true },
  ];

  const formFields = [
    { key: 'accounts_id', label: 'Vendor Account *',
      render: (form, setField) => (
        <LookupField
          label="Vendor Account *"
          {...LOOKUP_ACCOUNTS(accounts)}
          value={form.accounts_id}
          onChange={row => setField('accounts_id', row.accounts_id)}
          onClear={() => setField('accounts_id', '')}
          displayValue={accounts.find(a => a.accounts_id === Number(form.accounts_id))?.name}
        />
      ) },
    { key: 'invoice_number', label: 'Invoice Number', half: true },
    { key: 'total_amount', label: 'Total Amount ($)', type: 'number', step: '0.01', half: true },
    { key: 'invoice_date', label: 'Invoice Date', type: 'date', half: true },
    { key: 'due_date', label: 'Due Date', type: 'date', half: true },
    { key: 'period_start', label: 'Period Start', type: 'date', half: true },
    { key: 'period_end', label: 'Period End', type: 'date', half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES },
  ];

  const totalBilled = table.data.reduce((s, d) => s + Number(d.total_amount || 0), 0);
  const openCount = table.data.filter(d => d.status === 'Open').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card blue"><div className="kpi-label">Total Invoices</div><div className="kpi-value">{table.data.length}</div><div className="kpi-icon"><Receipt size={40} /></div></div>
        <div className="kpi-card orange"><div className="kpi-label">Open</div><div className="kpi-value">{openCount}</div><div className="kpi-sub">Pending review</div></div>
        <div className="kpi-card green"><div className="kpi-label">Paid</div><div className="kpi-value">{table.data.filter(d => d.status === 'Paid').length}</div></div>
        <div className="kpi-card purple"><div className="kpi-label">Total Billed</div><div className="kpi-value">${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="All Invoices"
        titleIcon={<Receipt size={15} color="#d97706" />}
        exportFilename="Invoices"
        bulkUpdateFields={formFields}
        bulkActions={[
          { label: 'Delete', icon: Trash2, danger: true, onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.invoices_id, { skipConfirm: true })); } }
        ]}
        extraActions={[{ icon: Eye, title: 'View', onClick: row => navigate(`/invoices/${row.invoices_id}`) }]}
        headerRight={<button className="btn btn-primary" onClick={() => navigate('/invoices/new')}><Plus size={15} /> New Invoice</button>}
      />

      <CrudModal
        open={table.modal}
        title="Edit Invoice"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
