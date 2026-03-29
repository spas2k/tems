import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Trash2 } from 'lucide-react';
import { getCurrencies, createCurrency, updateCurrency, deleteCurrency } from '../api';
import useCrudTable from '../hooks/useCrudTable';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const EMPTY = { currency_code: '', name: '', symbol: '', exchange_rate: 1, status: 'Active' };

const FILTER_CONFIG = { currency_code: 'text', name: 'text', status: 'select' };

export default function Currencies() {
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const table = useCrudTable({
    api: { list: getCurrencies, create: createCurrency, update: updateCurrency, delete: deleteCurrency },
    idKey: 'currencies_id',
    emptyForm: EMPTY,
    filterConfig: FILTER_CONFIG,
    resourceName: 'currencies',
  });

  const columns = [
    { key: 'currency_code', label: 'Code', copyable: true, summary: 'count',
      style: { fontFamily: 'monospace', fontWeight: 700, fontSize: 13 } },
    { key: 'name', label: 'Currency Name', link: row => navigate(`/currencies/${row.currencies_id}`) },
    { key: 'symbol', label: 'Symbol', style: { fontWeight: 600, fontSize: 14 } },
    { key: 'exchange_rate', label: 'Exchange Rate', format: 'number' },
    { key: 'status', label: 'Status', filterType: 'select', filterOptions: ['Active', 'Inactive'],
      badge: { Active: 'badge badge-green', Inactive: 'badge badge-red' } },
  ];

  const formFields = [
    { key: 'currency_code', label: 'Currency Code *', half: true },
    { key: 'name', label: 'Currency Name *', half: true },
    { key: 'symbol', label: 'Symbol *', half: true },
    { key: 'exchange_rate', label: 'Exchange Rate', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], half: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {table.renderToast()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Currencies</div>
          <div className="kpi-value">{table.data.length}</div>
          <div className="kpi-icon"><DollarSign size={40} /></div>
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
        title="All Currencies"
        titleIcon={<DollarSign size={15} color="#16a34a" />}
        exportFilename="Currencies"
        bulkUpdateFields={formFields}
        bulkActions={[
          { label: 'Delete', icon: Trash2, danger: true,
            onClick: async rows => { if (!(await confirm(`Delete ${rows.length} records?`))) return; rows.forEach(r => table.handleDelete(r.currencies_id, { skipConfirm: true })); } },
        ]}
        headerRight={
          <button className="btn btn-primary" onClick={() => navigate('/currencies/new')}><DollarSign size={15} /> New Currency</button>
        }
      />
    </div>
  );
}
