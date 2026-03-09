import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap } from 'lucide-react';
import { getCostSavings, createCostSaving, updateCostSaving, deleteCostSaving, getAccounts, getCircuits } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Billing Error', 'Contract Optimization', 'Disconnect', 'Rate Negotiation', 'Duplicate', 'Other'];
const STATUSES = ['Identified', 'In Progress', 'Resolved'];
const STATUS_BADGE = { Identified: 'badge badge-orange', 'In Progress': 'badge badge-blue', Resolved: 'badge badge-green' };

const EMPTY = { accounts_id: '', cir_id: '', category: 'Billing Error', description: '', projected_savings: '', realized_savings: '', status: 'Identified', identified_date: '', resolved_date: '', notes: '' };

const FILTER_CONFIG = {
  account_name: 'select', category: 'select', description: 'text',
  projected_savings: 'text', realized_savings: 'text', identified_date: 'date', status: 'select',
};

export default function CostSavings() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('cost_savings', 'create');
  const table = useCrudTable({
    api: { list: getCostSavings, create: createCostSaving, update: updateCostSaving, delete: deleteCostSaving },
    idKey: 'cost_savings_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    related: { accounts: getAccounts, circuits: getCircuits },
    defaultValues: (rel) => ({ accounts_id: rel.accounts[0]?.accounts_id || '' }),
    beforeSave: form => ({ ...form, cir_id: form.cir_id || null }),
  });

  const { accounts, circuits } = table.related;

  const columns = [
    { key: 'account_name', label: 'Vendor', filterType: 'select',
      filterOptions: accounts.map(a => a.name), style: { fontWeight: 600 } },
    { key: 'category', label: 'Category', filterType: 'select', filterOptions: CATEGORIES,
      render: v => <span className="badge badge-blue">{v}</span> },
    { key: 'description', label: 'Description', style: { maxWidth: 200 },
      render: v => <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'projected_savings', label: 'Projected',
      render: v => <span style={{ color: '#16a34a', fontWeight: 700 }}>${Number(v || 0).toLocaleString()}</span> },
    { key: 'realized_savings', label: 'Realized',
      render: v => v != null ? <span style={{ color: '#0d9488', fontWeight: 700 }}>${Number(v).toLocaleString()}</span> : '—' },
    { key: 'identified_date', label: 'Identified', filterType: 'date', format: 'date', style: { color: '#64748b' } },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: STATUSES, badge: STATUS_BADGE },
  ];

  const formFields = [
    { key: 'accounts_id', label: 'Vendor Account *', type: 'select',
      options: accounts.map(a => ({ value: a.accounts_id, label: a.name })), placeholder: 'Select vendor…' },
    { key: 'category', label: 'Category', type: 'select', options: CATEGORIES, half: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES, half: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'projected_savings', label: 'Projected Savings ($)', type: 'number', step: '0.01', half: true },
    { key: 'realized_savings', label: 'Realized Savings ($)', type: 'number', step: '0.01', half: true },
    { key: 'identified_date', label: 'Identified Date', type: 'date', half: true },
    { key: 'resolved_date', label: 'Resolved Date', type: 'date', half: true },
    { key: 'cir_id', label: 'Related Circuit (optional)', type: 'select',
      options: circuits.map(c => ({ value: c.cir_id, label: `${c.circuit_id} — ${c.location}` })), placeholder: 'None' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 2 });
  const totalProjected = table.data.reduce((s, d) => s + Number(d.projected_savings || 0), 0);
  const totalRealized = table.data.reduce((s, d) => s + Number(d.realized_savings || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card orange"><div className="kpi-label">Open Opportunities</div><div className="kpi-value">{table.data.filter(d => d.status === 'Identified').length}</div><div className="kpi-icon"><Zap size={40} /></div></div>
        <div className="kpi-card green"><div className="kpi-label">Projected Savings</div><div className="kpi-value">${fmt(totalProjected)}</div></div>
        <div className="kpi-card teal"><div className="kpi-label">Realized Savings</div><div className="kpi-value">${fmt(totalRealized)}</div></div>
      </div>

      <DataTable
        columns={columns}
        {...table.tableProps}
        title="Savings Pipeline"
        titleIcon={<Zap size={15} color="#16a34a" />}
        headerRight={canCreate ? <button className="btn btn-primary" onClick={() => navigate('/cost-savings/new')}><Plus size={15} /> New Opportunity</button> : null}
      />

      <CrudModal
        open={table.modal}
        title="Edit Record"
        onClose={() => table.setModal(false)}
        onSave={table.handleSave}
        form={table.form}
        setField={table.setField}
        fields={formFields}
      />
    </div>
  );
}
