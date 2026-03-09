import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, Plus, RefreshCw, Search, X } from 'lucide-react';
import { PageTitleContext } from '../PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { getTickets } from '../api';
import CreateTicketModal from '../components/CreateTicketModal';

const STATUSES    = ['Open', 'In Progress', 'Pending Vendor', 'Pending Internal', 'Resolved', 'Closed'];
const PRIORITIES  = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORIES  = ['Billing Error', 'Rate Dispute', 'Service Issue', 'Contract Problem', 'Data Quality', 'Invoice Discrepancy', 'Provisioning', 'Access & Permissions', 'Other'];

function priorityBadgeClass(p) {
  if (p === 'Critical') return 'badge badge-red';
  if (p === 'High')     return 'badge badge-orange';
  if (p === 'Low')      return 'badge badge-green';
  return 'badge badge-blue';
}

function statusBadgeClass(s) {
  if (s === 'Open')             return 'badge badge-blue';
  if (s === 'In Progress')      return 'badge badge-purple';
  if (s === 'Resolved')         return 'badge badge-green';
  if (s === 'Closed')           return 'badge badge-gray';
  return 'badge badge-orange'; // Pending Vendor / Pending Internal
}

function sourceLink(type, id, label) {
  if (!type || !id) return '—';
  const paths = {
    invoice:  `/invoices/${id}`,
    circuit:  `/circuits/${id}`,
    contract: `/contracts/${id}`,
    order:    `/orders/${id}`,
    account:  `/accounts/${id}`,
    dispute:  `/disputes/${id}`,
  };
  return { path: paths[type] || '#', label: label || `${type} #${id}`, type };
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Tickets() {
  const { setTitle } = useContext(PageTitleContext) || {};
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const [tickets,   setTickets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [myTickets, setMyTickets] = useState(false);
  const [filters,   setFilters]   = useState({ status: '', priority: '', category: '' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { setTitle?.('Tickets & Issues'); }, [setTitle]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.status)   params.status   = filters.status;
      if (filters.priority) params.priority  = filters.priority;
      if (filters.category) params.category  = filters.category;
      if (myTickets && user?.display_name) params.assigned_to = user.display_name;
      const res = await getTickets(params);
      setTickets(res.data || []);
    } catch {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [filters, myTickets, user]);

  useEffect(() => { load(); }, [load]);

  const displayed = tickets.filter(t =>
    !search || [t.ticket_number, t.title, t.category, t.assigned_user_name, t.created_by]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
  );

  // KPI counts
  const open     = tickets.filter(t => t.status === 'Open').length;
  const critical = tickets.filter(t => t.priority === 'Critical' || t.priority === 'High').length;
  const inProg   = tickets.filter(t => t.status === 'In Progress').length;
  const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const clearAll  = () => { setFilters({ status: '', priority: '', category: '' }); setSearch(''); setMyTickets(false); };
  const hasFilter = filters.status || filters.priority || filters.category || search || myTickets;

  const handleCreated = (ticket) => {
    navigate(`/tickets/${ticket.tickets_id}`);
  };

  return (
    <div className="page-wrapper">
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LifeBuoy size={20} color="#fff" />
          </div>
          <div>
            <h1 className="rc-results-count" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Tickets &amp; Issues</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Issue tracking and resolution</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Open',        value: open,     color: '#2563eb', bg: '#eff6ff' },
          { label: 'High / Critical', value: critical, color: '#ea580c', bg: '#fff7ed' },
          { label: 'In Progress', value: inProg,   color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Resolved',    value: resolved,  color: '#16a34a', bg: '#f0fdf4' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{loading ? '—' : value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…"
            style={{ paddingLeft: 32, width: '100%' }}
          />
        </div>

        <select className="form-input" style={{ flex: '0 0 140px' }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select className="form-input" style={{ flex: '0 0 130px' }} value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>

        <select className="form-input" style={{ flex: '0 0 180px' }} value={filters.category} onChange={e => setFilter('category', e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        <button
          className={`btn ${myTickets ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: '0 0 auto', fontSize: 13 }}
          onClick={() => setMyTickets(v => !v)}
        >
          My Tickets
        </button>

        {hasFilter && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <X size={13} /> Clear
          </button>
        )}

        <button className="btn btn-ghost btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading tickets…</div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <LifeBuoy size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>No tickets found</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              {hasFilter ? 'Try adjusting your filters.' : 'Create your first ticket using the "New Ticket" button.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Assignee</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(t => {
                  const src = sourceLink(t.source_entity_type, t.source_entity_id, t.source_label);
                  return (
                    <tr
                      key={t.tickets_id}
                      onClick={() => navigate(`/tickets/${t.tickets_id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13, color: '#2563eb', whiteSpace: 'nowrap' }}>
                        {t.ticket_number}
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div className="rc-results-count" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: '#475569' }}>{t.category}</td>
                      <td><span className={priorityBadgeClass(t.priority)}>{t.priority}</span></td>
                      <td><span className={statusBadgeClass(t.status)}>{t.status}</span></td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {typeof src === 'object' ? (
                          <a
                            href={src.path}
                            onClick={e => { e.stopPropagation(); navigate(src.path); }}
                            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                          >
                            <span style={{ textTransform: 'capitalize' }}>{src.type}</span>: {src.label}
                          </a>
                        ) : src}
                      </td>
                      <td style={{ fontSize: 13, color: '#475569' }}>{t.assigned_user_name || '—'}</td>
                      <td style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(t.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateTicketModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
