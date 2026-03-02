import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Download } from 'lucide-react';
import { getDisputes, createDispute, updateDispute, deleteDispute, getAccounts, getInvoices } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';

const STATUSES = ['Open', 'Under Review', 'Credited', 'Denied', 'Closed'];
const TYPES = ['Overcharge', 'Duplicate Charge', 'Wrong Rate', 'Missing Credit', 'Service Not Delivered', 'Other'];
const STATUS_BADGE = {
  Open: 'badge badge-blue', 'Under Review': 'badge badge-orange',
  Credited: 'badge badge-green', Denied: 'badge badge-red', Closed: 'badge badge-gray',
};

const EMPTY = {
  invoices_id: '', accounts_id: '', line_items_id: '', dispute_type: 'Overcharge',
  amount: '', status: 'Open', filed_date: '', resolved_date: '', resolution_notes: '',
  credit_amount: '', reference_number: '', notes: '',
};

const FILTER_CONFIG = {
  reference_number: 'text', account_name: 'select', invoice_number: 'text',
  dispute_type: 'select', status: 'select', filed_date: 'date',
};

export default function Disputes() {
  const navigate = useNavigate();
  const table = useCrudTable({
    api: { list: getDisputes, create: createDispute, update: updateDispute, delete: deleteDispute },
    idKey: 'disputes_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { accounts: getAccounts, invoices: getInvoices },
    defaultValues: (rel) => ({
      accounts_id: rel.accounts[0]?.accounts_id || '',
      invoices_id: rel.invoices[0]?.invoices_id || '',
      filed_date: new Date().toISOString().slice(0, 10),
    }),
    beforeSave: form => ({
      ...form,
      resolved_date: form.resolved_date || null,
      credit_amount: form.credit_amount || null,
      line_items_id: form.line_items_id || null,
    }),
  });

  const { accounts, invoices } = table.related;
  const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const columns = [
    { key: 'reference_number', label: 'Reference',
      render: (v, row) => (
        <span style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => navigate(`/disputes/${row.disputes_id}`)}>
          {v || `#${row.disputes_id}`}
        </span>
      ) },
    { key: 'account_name', label: 'Vendor', filterType: 'select',
      filterOptions: accounts.map(a => a.name), style: { fontWeight: 500 } },
    { key: 'invoice_number', label: 'Invoice',
      render: (v, row) => v
        ? <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => navigate(`/invoices/${row.invoices_id}`)}>{v}</span>
        : '—' },
    { key: 'dispute_type', label: 'Type', filterType: 'select', filterOptions: TYPES,
      render: v => <span className="badge badge-purple">{v}</span> },
    { key: 'amount', label: 'Amount', filterable: false,
      render: v => <span style={{ fontWeight: 700 }}>${fmt(v)}</span> },
    { key: 'filed_date', label: 'Filed', filterType: 'date', format: 'date' },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
    { key: 'credit_amount', label: 'Credit', filterable: false,
      render: v => (
        <span style={{ fontWeight: 600, color: v > 0 ? '#16a34a' : '#64748b' }}>
          {v ? `$${fmt(v)}` : '—'}
        </span>
      ) },
  ];

  const formFields = [
    { key: 'accounts_id', label: 'Account', type: 'select',
      options: accounts.map(a => ({ value: a.accounts_id, label: a.name })), placeholder: 'Select…' },
    { key: 'invoices_id', label: 'Invoice', type: 'select',
      options: invoices.map(i => ({ value: i.invoices_id, label: i.invoice_number })), placeholder: 'Select…', half: true },
    { key: 'dispute_type', label: 'Dispute Type', type: 'select', options: TYPES, half: true },
    { key: 'amount', label: 'Amount', type: 'number', step: '0.01', half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
    { key: 'filed_date', label: 'Filed Date', type: 'date', half: true },
    { key: 'resolved_date', label: 'Resolved Date', type: 'date', half: true },
    { key: 'credit_amount', label: 'Credit Amount', type: 'number', step: '0.01', half: true },
    { key: 'reference_number', label: 'Reference #', half: true },
    { key: 'resolution_notes', label: 'Resolution Notes', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const exportCsv = () => {
    if (!table.processedData.length) return;
    const headers = ['Reference', 'Vendor', 'Invoice', 'Type', 'Amount', 'Filed', 'Status', 'Credit', 'Notes'];
    const rows = table.processedData.map(r => [
      r.reference_number, r.account_name, r.invoice_number, r.dispute_type,
      r.amount, r.filed_date?.split('T')[0], r.status, r.credit_amount, r.notes,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'disputes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const openCount = table.data.filter(d => d.status === 'Open').length;
  const reviewCount = table.data.filter(d => d.status === 'Under Review').length;
  const totalAmt = table.data.filter(d => !['Closed', 'Denied'].includes(d.status)).reduce((s, d) => s + Number(d.amount || 0), 0);
  const creditedAmt = table.data.filter(d => d.status === 'Credited').reduce((s, d) => s + Number(d.credit_amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div className="kpi-card blue"><div className="kpi-label">Open</div><div className="kpi-value">{openCount}</div></div>
        <div className="kpi-card orange"><div className="kpi-label">Under Review</div><div className="kpi-value">{reviewCount}</div></div>
        <div className="kpi-card red"><div className="kpi-label">Disputed Amount</div><div className="kpi-value">${fmt(totalAmt)}</div></div>
        <div className="kpi-card green"><div className="kpi-label">Credits Received</div><div className="kpi-value">${fmt(creditedAmt)}</div></div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Disputes"
        extraActions={[{ icon: Eye, title: 'View', onClick: row => navigate(`/disputes/${row.disputes_id}`) }]}
        headerRight={<>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} title="Export CSV"><Download size={14} /> CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/disputes/new')}><Plus size={14} /> New Dispute</button>
        </>}
      />

      <CrudModal
        open={table.modal}
        title="Edit Dispute"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
