import React, { useEffect, useState, useMemo } from 'react';
import { Eye, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllocations, getInvoices } from '../api';
import Pagination from '../components/Pagination';

export default function Allocations() {
  const [data, setData]         = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterInv, setFilterInv] = useState('');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = (invId) => {
    setLoading(true);
    const params = invId ? { invoices_id: invId } : {};
    Promise.all([getAllocations(params), getInvoices()])
      .then(([a, inv]) => { setData(a.data); setInvoices(inv.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(filterInv || undefined); }, [filterInv]);

  const totalAllocated = data.reduce((s, a) => s + Number(a.allocated_amount || 0), 0);

  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return data;
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  // Reset to page 1 when filter changes
  React.useEffect(() => { setPage(1); }, [filterInv]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue"><div className="kpi-label">Total Allocated</div><div className="kpi-value">${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div className="kpi-icon"><PieChart size={40} /></div></div>
        <div className="kpi-card teal"><div className="kpi-label">Allocation Records</div><div className="kpi-value">{data.length}</div></div>
        <div className="kpi-card purple"><div className="kpi-label">Invoices</div><div className="kpi-value">{[...new Set(data.map(d => d.invoice_id))].length}</div><div className="kpi-sub">With allocations</div></div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Allocations</span>
          <select className="form-input" style={{ width: 300 }} value={filterInv} onChange={e => setFilterInv(e.target.value)}>
            <option value="">All Invoices</option>
            {invoices.map(i => <option key={i.invoices_id} value={i.invoices_id}>{i.invoice_number} — {i.account_name}</option>)}
          </select>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div> : (<>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead><tr>
                <th>Invoice #</th><th>Vendor</th><th>Line Item</th><th>Cost Center</th><th>Department</th><th>%</th><th>Allocated</th><th>Notes</th><th></th>
              </tr></thead>
              <tbody>
                {paginatedData.map(row => (
                  <tr key={row.allocations_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}><span style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/invoices/${row.invoice_id}`)}>{row.invoice_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{row.account_name}</td>
                    <td style={{ color: '#64748b', maxWidth: 180 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.line_item_description}</span></td>
                    <td><span className="badge badge-purple">{row.cost_center}</span></td>
                    <td>{row.department}</td>
                    <td style={{ fontWeight: 700 }}>{row.percentage}%</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>${Number(row.allocated_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{row.notes || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(`/invoices/${row.invoice_id}`)} title="View Invoice">
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalItems={data.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={v => { setPageSize(v); setPage(1); }}
          />
        </>)}
      </div>
    </div>
  );
}
