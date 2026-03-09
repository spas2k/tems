import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRateValidation } from '../api';
import { CheckCircle2, AlertTriangle, HelpCircle, Filter, X, Download, ShieldCheck } from 'lucide-react';
import Pagination from '../components/Pagination';

const COMPLIANCE_BADGE = {
  true:  'badge badge-green',
  false: 'badge badge-red',
  null:  'badge badge-gray',
};

export default function RateAudit() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ account_name: '', contract_number: '', usoc_code: '', compliance: '' });
  const [sort, setSort]       = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    getRateValidation()
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const FILTER_INIT = { account_name: '', contract_number: '', usoc_code: '', compliance: '' };
  const setFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));
  const clearFilters = () => setFilters(FILTER_INIT);
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const toggleSort = key => setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const arrow = key => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const processedData = useMemo(() => {
    if (!data) return [];
    let result = data.items.filter(row => {
      if (filters.account_name && row.account_name !== filters.account_name) return false;
      if (filters.contract_number && !(row.contract_number || '').toLowerCase().includes(filters.contract_number.toLowerCase())) return false;
      if (filters.usoc_code && !(row.usoc_code || '').toLowerCase().includes(filters.usoc_code.toLowerCase())) return false;
      if (filters.compliance === 'compliant' && !row.compliant) return false;
      if (filters.compliance === 'mismatch' && row.compliant !== false) return false;
      if (filters.compliance === 'no-rate' && !(row.rate_mrc === null && row.rate_nrc === null)) return false;
      return true;
    });
    if (sort.key) {
      result = [...result].sort((a, b) => {
        let av = a[sort.key] ?? '', bv = b[sort.key] ?? '';
        const an = Number(av), bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn) && av !== '' && bv !== '') return sort.dir === 'asc' ? an - bn : bn - an;
        return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [data, filters, sort]);

  const filterKey = JSON.stringify(filters);
  React.useEffect(() => { setPage(1); }, [filterKey]);

  const paginatedData = React.useMemo(() => {
    if (pageSize === 'all') return processedData;
    const start = (page - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize]);

  const fmt = n => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—';

  const exportCsv = () => {
    if (!processedData.length) return;
    const headers = ['Account', 'Invoice', 'Contract', 'Circuit', 'USOC', 'Description', 'Billed MRC', 'Rate MRC', 'MRC Delta', 'Billed NRC', 'Rate NRC', 'NRC Delta', 'Compliant'];
    const rows = processedData.map(r => [
      r.account_name, r.invoice_number, r.contract_number, r.circuit_id,
      r.usoc_code, r.description, r.mrc_amount, r.rate_mrc, r.mrc_delta,
      r.nrc_amount, r.rate_nrc, r.nrc_delta, r.compliant ? 'Yes' : r.compliant === false ? 'No' : 'N/A',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rate-audit.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#dc2626', padding: '16px 20px', borderRadius: 12, fontWeight: 600 }}>
      Error loading rate audit: {error}
    </div>
  );

  const s = data.summary;
  const uniqueAccounts = [...new Set(data.items.map(r => r.account_name).filter(Boolean))].sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Items</div>
          <div className="kpi-value">{s.total}</div>
          <div className="kpi-sub">With USOC codes</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Compliant</div>
          <div className="kpi-value">{s.matched}</div>
          <div className="kpi-sub">Rate matches billing</div>
          <div className="kpi-icon"><CheckCircle2 size={36} /></div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Mismatch</div>
          <div className="kpi-value">{s.mismatched}</div>
          <div className="kpi-sub">Rate vs billing delta</div>
          <div className="kpi-icon"><AlertTriangle size={36} /></div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">No Rate</div>
          <div className="kpi-value">{s.noRate}</div>
          <div className="kpi-sub">Contract rate missing</div>
          <div className="kpi-icon"><HelpCircle size={36} /></div>
        </div>
      </div>

      {/* Compliance bar */}
      {s.total > 0 && (
        <div className="page-card" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={16} color="#3b82f6" />
            <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 14 }}>Rate Compliance</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
              {s.total > 0 ? Math.round((s.matched / s.total) * 100) : 0}% compliant
            </span>
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', background: '#e2e8f0' }}>
            {s.matched > 0 && <div style={{ width: `${(s.matched / s.total) * 100}%`, background: '#22c55e' }} />}
            {s.mismatched > 0 && <div style={{ width: `${(s.mismatched / s.total) * 100}%`, background: '#ef4444' }} />}
            {s.noRate > 0 && <div style={{ width: `${(s.noRate / s.total) * 100}%`, background: '#94a3b8' }} />}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="page-card">
        <div className="page-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700 }}>Rate Validation Results</span>
            <span className="badge badge-blue">{processedData.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-ghost btn-sm${showFilters ? ' active' : ''}`} onClick={() => setShowFilters(f => !f)} title="Filters">
              <Filter size={14} />
              {hasActiveFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', marginLeft: 4 }} />}
            </button>
            {hasActiveFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters} title="Clear"><X size={14} /></button>}
            <button className="btn btn-ghost btn-sm" onClick={exportCsv} title="Export CSV"><Download size={14} /> CSV</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('account_name')} style={{ cursor: 'pointer' }}>Vendor{arrow('account_name')}</th>
                <th onClick={() => toggleSort('invoice_number')} style={{ cursor: 'pointer' }}>Invoice{arrow('invoice_number')}</th>
                <th onClick={() => toggleSort('contract_number')} style={{ cursor: 'pointer' }}>Contract{arrow('contract_number')}</th>
                <th onClick={() => toggleSort('usoc_code')} style={{ cursor: 'pointer' }}>USOC{arrow('usoc_code')}</th>
                <th onClick={() => toggleSort('mrc_amount')} style={{ cursor: 'pointer' }}>Billed MRC{arrow('mrc_amount')}</th>
                <th onClick={() => toggleSort('rate_mrc')} style={{ cursor: 'pointer' }}>Rate MRC{arrow('rate_mrc')}</th>
                <th onClick={() => toggleSort('mrc_delta')} style={{ cursor: 'pointer' }}>Δ MRC{arrow('mrc_delta')}</th>
                <th onClick={() => toggleSort('nrc_amount')} style={{ cursor: 'pointer' }}>Billed NRC{arrow('nrc_amount')}</th>
                <th onClick={() => toggleSort('rate_nrc')} style={{ cursor: 'pointer' }}>Rate NRC{arrow('rate_nrc')}</th>
                <th onClick={() => toggleSort('nrc_delta')} style={{ cursor: 'pointer' }}>Δ NRC{arrow('nrc_delta')}</th>
                <th>Status</th>
              </tr>
              {showFilters && (
                <tr className="filter-row">
                  <td>
                    <select value={filters.account_name} onChange={e => setFilter('account_name', e.target.value)}>
                      <option value="">All</option>
                      {uniqueAccounts.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td />
                  <td><input value={filters.contract_number} onChange={e => setFilter('contract_number', e.target.value)} placeholder="Filter…" /></td>
                  <td><input value={filters.usoc_code} onChange={e => setFilter('usoc_code', e.target.value)} placeholder="Filter…" /></td>
                  <td /><td /><td /><td /><td /><td />
                  <td>
                    <select value={filters.compliance} onChange={e => setFilter('compliance', e.target.value)}>
                      <option value="">All</option>
                      <option value="compliant">Compliant</option>
                      <option value="mismatch">Mismatch</option>
                      <option value="no-rate">No Rate</option>
                    </select>
                  </td>
                </tr>
              )}
            </thead>
            <tbody>
              {processedData.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No results.</td></tr>
              ) : paginatedData.map(r => {
                const hasMismatch = r.compliant === false;
                const noRate = r.rate_mrc === null && r.rate_nrc === null;
                return (
                  <tr key={r.line_items_id} style={{ background: hasMismatch ? 'rgba(239,68,68,0.06)' : undefined }}>
                    <td style={{ fontWeight: 500 }}>{r.account_name}</td>
                    <td>
                      <span style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => navigate(`/invoices/${r.invoices_id}`)}>
                        {r.invoice_number}
                      </span>
                    </td>
                    <td>
                      {r.contract_number ? (
                        <span style={{ color: '#3b82f6', cursor: 'pointer' }}
                              onClick={() => navigate(`/contracts/${r.contracts_id}`)}>
                          {r.contract_number}
                        </span>
                      ) : '—'}
                    </td>
                    <td><code className="rp-code" style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4 }}>{r.usoc_code}</code></td>
                    <td style={{ fontWeight: 600 }}>${fmt(r.mrc_amount)}</td>
                    <td>{r.rate_mrc != null ? `$${fmt(r.rate_mrc)}` : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td style={{ fontWeight: 700, color: r.mrc_delta > 0.01 ? '#ef4444' : r.mrc_delta < -0.01 ? '#16a34a' : '#64748b' }}>
                      {r.mrc_delta != null ? `$${fmt(r.mrc_delta)}` : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>${fmt(r.nrc_amount)}</td>
                    <td>{r.rate_nrc != null ? `$${fmt(r.rate_nrc)}` : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td style={{ fontWeight: 700, color: r.nrc_delta > 0.01 ? '#ef4444' : r.nrc_delta < -0.01 ? '#16a34a' : '#64748b' }}>
                      {r.nrc_delta != null ? `$${fmt(r.nrc_delta)}` : '—'}
                    </td>
                    <td>
                      {noRate ? (
                        <span className="badge badge-gray">No Rate</span>
                      ) : hasMismatch ? (
                        <span className="badge badge-red">Mismatch</span>
                      ) : (
                        <span className="badge badge-green">Compliant</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalItems={processedData.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={v => { setPageSize(v); setPage(1); }}
        />
      </div>
    </div>
  );
}
