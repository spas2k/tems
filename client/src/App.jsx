import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, Network, ShoppingCart,
  Receipt, PieChart, Zap, DollarSign, ChevronLeft, ChevronRight, User, Search, X,
} from 'lucide-react';

import Dashboard    from './pages/Dashboard';
import Accounts     from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import Contracts    from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Circuits     from './pages/Circuits';
import CircuitDetail from './pages/CircuitDetail';
import Orders       from './pages/Orders';
import OrderDetail  from './pages/OrderDetail';
import Invoices     from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Allocations  from './pages/Allocations';
import CostSavings  from './pages/CostSavings';
import { PageTitleContext } from './PageTitleContext';
import { globalSearch } from './api';

const SEARCH_GROUPS = [
  { key: 'accounts',  label: 'Accounts',  color: '#2563eb', path: id => `/accounts/${id}`,  display: r => r.name },
  { key: 'contracts', label: 'Contracts', color: '#0d9488', path: id => `/contracts/${id}`, display: r => r.contract_number || r.name },
  { key: 'circuits',  label: 'Circuits',  color: '#7c3aed', path: id => `/circuits/${id}`,  display: r => r.circuit_id },
  { key: 'orders',    label: 'Orders',    color: '#d97706', path: id => `/orders/${id}`,    display: r => r.order_number },
  { key: 'invoices',  label: 'Invoices',  color: '#dc2626', path: id => `/invoices/${id}`,  display: r => r.invoice_number },
];

function GlobalSearch() {
  const navigate = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = e => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim() || val.trim().length < 2) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearch(val.trim());
        setResults(res.data);
        setOpen(true);
      } finally { setLoading(false); }
    }, 300);
  };

  const clear = () => { setQuery(''); setResults(null); setOpen(false); };
  const go    = path => { clear(); navigate(path); };
  const total = results ? Object.values(results).reduce((s, a) => s + a.length, 0) : 0;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#d6e4f7', border: '1.5px solid #93c5fd', borderRadius: 12,
        padding: '0 16px', height: 42, width: 380, transition: 'border-color 0.2s',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
        onFocusCapture={e => e.currentTarget.style.borderColor = '#3b82f6'}
        onBlurCapture={e => e.currentTarget.style.borderColor = '#93c5fd'}
      >
        <Search size={16} color={loading ? '#3b82f6' : '#64748b'} style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => results && setOpen(true)}
          placeholder="Search accounts, circuits, orders…"
          className="global-search-input"
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0f172a', fontWeight: 500 }}
        />
        {query && <X size={14} color="#64748b" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={clear} />}
      </div>

      {open && results && (
        <div style={{
          position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', width: 420, maxHeight: 500,
          background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflowY: 'auto', zIndex: 9999,
        }}>
          {total === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No results for <strong>"{query}"</strong>
            </div>
          ) : (
            SEARCH_GROUPS.map(group => {
              const items = results[group.key] || [];
              if (!items.length) return null;
              return (
                <div key={group.key}>
                  <div style={{
                    padding: '8px 16px 4px', fontSize: 10, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8',
                    borderTop: '1px solid #f1f5f9', background: '#fafafa',
                  }}>{group.label}</div>
                  {items.map(r => (
                    <div key={r.id} onClick={() => go(group.path(r.id))}
                      style={{ padding: '9px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: group.color, flexShrink: 0 }}>{group.display(r)}</span>
                      {r.sub && <span style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</span>}
                    </div>
                  ))}
                </div>
              );
            })
          )}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#cbd5e1', textAlign: 'right' }}>
            {total} result{total !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/accounts',     icon: Building2,       label: 'Accounts' },
  { path: '/contracts',    icon: FileText,        label: 'Contracts' },
  { path: '/circuits',     icon: Network,         label: 'Circuits' },
  { path: '/orders',       icon: ShoppingCart,    label: 'Orders' },
  { path: '/invoices',     icon: Receipt,         label: 'Invoices' },
  { path: '/allocations',  icon: PieChart,        label: 'Allocations' },
  { path: '/cost-savings', icon: Zap,             label: 'Cost Savings' },
];

const PAGE_META = {
  '/':             { label: 'Dashboard',   sub: 'System overview & key metrics' },
  '/accounts':     { label: 'Accounts',    sub: 'Manage vendor accounts' },
  '/accounts/:id': { label: 'Account Detail', sub: 'View and edit vendor account' },
  '/contracts':     { label: 'Contracts',    sub: 'Track contracts and terms' },
  '/contracts/:id': { label: 'Contract Detail', sub: 'View and edit contract information' },
  '/circuits':     { label: 'Circuits',    sub: 'Circuit inventory' },
  '/circuits/:id': { label: 'Circuit Detail', sub: 'View and edit circuit information' },
  '/orders':        { label: 'Orders',       sub: 'Circuit orders & provisioning' },
  '/orders/:id':    { label: 'Order Detail', sub: 'View and edit order information' },
  '/invoices':     { label: 'Invoices',    sub: 'Invoice management & review' },
  '/allocations':  { label: 'Allocations', sub: 'Cost center allocations' },
  '/cost-savings': { label: 'Cost Savings',sub: 'Billing errors & savings pipeline' },
};

function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [navHistory, setNavHistory] = useState([]);
  const [pageTitle, setPageTitle]   = useState(null);
  const navigate  = useNavigate();
  const location  = useLocation();
  const activeKey = location.pathname.startsWith('/circuits/') && location.pathname !== '/circuits'
    ? '/circuits/:id'
    : location.pathname.startsWith('/orders/') && location.pathname !== '/orders'
    ? '/orders/:id'
    : location.pathname.startsWith('/accounts/') && location.pathname !== '/accounts'
    ? '/accounts/:id'
    : location.pathname.startsWith('/contracts/') && location.pathname !== '/contracts'
    ? '/contracts/:id'
    : '/' + location.pathname.split('/')[1];
  const meta = PAGE_META[activeKey] || { label: 'TEMS', sub: '' };

  useEffect(() => {
    setPageTitle(null);
    const label = (PAGE_META[activeKey] || {}).label || activeKey;
    const entry = { path: location.pathname, label };
    setNavHistory(prev => {
      // drop duplicate if current page is same as last entry
      const filtered = prev.filter(e => e.path !== location.pathname);
      return [...filtered, entry].slice(-10);
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!pageTitle) return;
    setNavHistory(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], label: pageTitle };
      return updated;
    });
  }, [pageTitle]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <div style={{
        width: collapsed ? 64 : 240,
        background: '#0f172a',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, transition: 'width 0.2s ease',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          }}>
            <DollarSign size={18} color="white" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>TEMS</div>
              <div style={{ color: '#64748b', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Telecom Expense</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8, overflowY: 'auto' }}>
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = activeKey === path;
            return (
              <div
                key={path}
                className={`nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(path)}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', margin: '2px 8px', padding: collapsed ? '10px 0' : '10px 16px' }}
                title={collapsed ? label : undefined}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div
          onClick={() => setCollapsed(c => !c)}
          style={{
            padding: '14px', borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end',
            cursor: 'pointer', color: '#475569',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          height: 60, background: 'white', borderBottom: '1px solid #cbd5e1',
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
          padding: '0 28px', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>{meta.label}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{meta.sub}</div>
          </div>
          <GlobalSearch />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{today}</span>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
            }}>
              <User size={16} color="white" />
            </div>
          </div>
        </div>

        {/* Breadcrumb history bar */}
        {navHistory.length > 1 && (
          <div style={{
            background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            padding: '0 28px', height: 34, display: 'flex', alignItems: 'center',
            flexShrink: 0, gap: 0,
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {navHistory.map((entry, i) => {
                const isCurrent = i === navHistory.length - 1;
                return (
                  <React.Fragment key={entry.path + i}>
                    {i > 0 && <span style={{ color: '#cbd5e1', fontSize: 12, userSelect: 'none', flexShrink: 0 }}>›</span>}
                    <span
                      onClick={() => !isCurrent && navigate(entry.path)}
                      style={{
                        fontSize: 12, flexShrink: 0, borderRadius: 6, padding: '2px 8px',
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? '#0f172a' : '#3b82f6',
                        cursor: isCurrent ? 'default' : 'pointer',
                        background: isCurrent ? '#e2e8f0' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#dbeafe'; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                    >{entry.label}</span>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              onClick={() => setNavHistory([])}
              style={{
                flexShrink: 0, marginLeft: 12, fontSize: 11, fontWeight: 600,
                color: '#94a3b8', background: 'transparent', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: '2px 10px', cursor: 'pointer', lineHeight: '18px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.background = '#fff1f2'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}
              title="Clear navigation history"
            >Clear</button>
          </div>
        )}

        {/* Content */}
        <PageTitleContext.Provider value={{ setPageTitle }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/accounts"     element={<Accounts />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/contracts"     element={<Contracts />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/circuits"     element={<Circuits />} />
            <Route path="/circuits/:id" element={<CircuitDetail />} />
            <Route path="/orders"       element={<Orders />} />
            <Route path="/orders/:id"   element={<OrderDetail />} />
            <Route path="/invoices"     element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/allocations"  element={<Allocations />} />
            <Route path="/cost-savings" element={<CostSavings />} />
          </Routes>
        </div>
        </PageTitleContext.Provider>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
