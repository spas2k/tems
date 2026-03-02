import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, Network, ShoppingCart,
  Receipt, PieChart, Zap, DollarSign, ChevronLeft, ChevronRight, ChevronDown, User, Search, X, Tag,
  ShieldAlert, ShieldCheck, Users, Shield, Settings, Upload, Wrench, FolderKanban, Landmark, Flag, UserCheck, BookOpen,
  BarChart2, LineChart, Bell, Clock, Command, AlertTriangle,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getContracts, getDashboard } from './api';

import Dashboard    from './pages/Dashboard';
import Accounts     from './pages/Accounts';
import AccountAdd   from './pages/AccountAdd';
import AccountDetail from './pages/AccountDetail';
import Contracts    from './pages/Contracts';
import ContractAdd  from './pages/ContractAdd';
import ContractDetail from './pages/ContractDetail';
import Circuits     from './pages/Circuits';
import CircuitAdd   from './pages/CircuitAdd';
import CircuitDetail from './pages/CircuitDetail';
import Orders       from './pages/Orders';
import OrderAdd     from './pages/OrderAdd';
import OrderDetail  from './pages/OrderDetail';
import Invoices     from './pages/Invoices';
import InvoiceAdd   from './pages/InvoiceAdd';
import InvoiceDetail from './pages/InvoiceDetail';
import Allocations  from './pages/Allocations';
import CostSavings  from './pages/CostSavings';
import CostSavingAdd from './pages/CostSavingAdd';
import UsocCodes    from './pages/UsocCodes';
import UsocCodeAdd  from './pages/UsocCodeAdd';
import UsocCodeDetail from './pages/UsocCodeDetail';
import Disputes     from './pages/Disputes';
import DisputeAdd   from './pages/DisputeAdd';
import DisputeDetail from './pages/DisputeDetail';
import RateAudit    from './pages/RateAudit';
import UserManagement from './pages/UserManagement';
import AuditLog     from './pages/AuditLog';
import Preferences  from './pages/Preferences';
import BatchUpload  from './pages/BatchUpload';
import Projects     from './pages/Projects';
import ServiceProviders from './pages/ServiceProviders';
import Milestones      from './pages/Milestones';
import InvoiceApprovers from './pages/InvoiceApprovers';
import InvoiceReader   from './pages/InvoiceReader';
import GLCodes         from './pages/GLCodes';
import CreateGraph     from './pages/CreateGraph';
import CreateReport    from './pages/CreateReport';
import { PageTitleContext } from './PageTitleContext';
import { globalSearch } from './api';

const SEARCH_GROUPS = [
  { key: 'accounts',  idKey: 'accounts_id',  label: 'Accounts',  color: '#2563eb', path: id => `/accounts/${id}`,  display: r => r.name },
  { key: 'contracts', idKey: 'contracts_id', label: 'Contracts', color: '#0d9488', path: id => `/contracts/${id}`, display: r => r.contract_number || r.name },
  { key: 'circuits',  idKey: 'circuits_id',  label: 'Circuits',  color: '#7c3aed', path: id => `/circuits/${id}`,  display: r => r.circuit_number },
  { key: 'orders',    idKey: 'orders_id',    label: 'Orders',    color: '#d97706', path: id => `/orders/${id}`,    display: r => r.order_number },
  { key: 'invoices',  idKey: 'invoices_id',  label: 'Invoices',  color: '#dc2626', path: id => `/invoices/${id}`,  display: r => r.invoice_number },
  { key: 'usoc_codes', idKey: 'usoc_codes_id', label: 'USOC Codes', color: '#9333ea', path: id => `/usoc-codes/${id}`, display: r => `${r.usoc_code} — ${r.description}` },
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
                    <div key={r[group.idKey]} onClick={() => go(group.path(r[group.idKey]))}
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

/* ── Recent Items Dropdown ──────────────────────────────── */
function RecentItems() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tems-recent-items')) || []; } catch { return []; }
  });

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen for custom events from detail pages
  useEffect(() => {
    const handler = (e) => {
      const { path, label, type } = e.detail;
      setItems(prev => {
        const filtered = prev.filter(i => i.path !== path);
        const updated = [{ path, label, type, time: Date.now() }, ...filtered].slice(0, 10);
        localStorage.setItem('tems-recent-items', JSON.stringify(updated));
        return updated;
      });
    };
    window.addEventListener('tems-recent-item', handler);
    return () => window.removeEventListener('tems-recent-item', handler);
  }, []);

  const TYPE_COLORS = { account: '#2563eb', contract: '#0d9488', circuit: '#7c3aed', order: '#d97706', invoice: '#dc2626' };

  if (items.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="recent-items-btn" onClick={() => setOpen(p => !p)}>
        <Clock size={14} /> Recent
      </button>
      {open && (
        <div className="recent-items-dropdown">
          <div style={{ padding: '8px 16px 6px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
            Recently Viewed
          </div>
          {items.map((item, i) => (
            <div key={i} className="recent-item" onClick={() => { navigate(item.path); setOpen(false); }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[item.type] || '#94a3b8', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize' }}>{item.type}</div>
              </div>
              <span style={{ fontSize: 10, color: '#cbd5e1', flexShrink: 0 }}>
                {formatTimeAgo(item.time)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Notification Center ────────────────────────────────── */
function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tems-dismissed-notifs')) || []; } catch { return []; }
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications from contracts + dashboard
  useEffect(() => {
    const load = async () => {
      const notifs = [];
      try {
        const [contractsRes, dashRes] = await Promise.all([getContracts(), getDashboard()]);
        const contracts = contractsRes.data;
        const now = new Date();

        // Contract expiration alerts
        contracts.forEach(c => {
          if (!c.end_date || c.status === 'Terminated' || c.status === 'Expired') return;
          const days = Math.floor((new Date(c.end_date) - now) / 86400000);
          if (days <= 0) {
            notifs.push({ id: `exp-${c.contracts_id}`, type: 'danger', title: 'Contract Expired',
              message: `${c.contract_number || c.name} expired ${Math.abs(days)} days ago`,
              path: `/contracts/${c.contracts_id}`, time: c.end_date });
          } else if (days <= 30) {
            notifs.push({ id: `exp30-${c.contracts_id}`, type: 'danger', title: 'Expiring in ' + days + ' days',
              message: `${c.contract_number || c.name}`,
              path: `/contracts/${c.contracts_id}`, time: c.end_date });
          } else if (days <= 90) {
            notifs.push({ id: `exp90-${c.contracts_id}`, type: 'warning', title: 'Expiring in ' + days + ' days',
              message: `${c.contract_number || c.name}`,
              path: `/contracts/${c.contracts_id}`, time: c.end_date });
          }
        });

        // Dashboard variance alerts
        const dash = dashRes.data;
        if (dash.recentVariances?.length > 0) {
          notifs.push({ id: 'variances', type: 'warning', title: 'Rate Variances Found',
            message: `${dash.recentVariances.length} line items with billing variances`,
            path: '/rate-audit', time: new Date().toISOString() });
        }
        if (dash.openDisputes > 0) {
          notifs.push({ id: 'disputes', type: 'info', title: 'Open Disputes',
            message: `${dash.openDisputes} dispute${dash.openDisputes > 1 ? 's' : ''} need attention`,
            path: '/disputes', time: new Date().toISOString() });
        }
      } catch {}
      setNotifications(notifs);
    };
    load();
    const interval = setInterval(load, 300000); // refresh every 5min
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter(n => !dismissed.includes(n.id));
  const dismissAll = () => {
    const ids = notifications.map(n => n.id);
    setDismissed(ids);
    localStorage.setItem('tems-dismissed-notifs', JSON.stringify(ids));
  };

  const TYPE_ICON_COLOR = { danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="notification-bell" onClick={() => setOpen(p => !p)}>
        <Bell size={20} color="#64748b" />
        {unread.length > 0 && <span className="notification-badge">{unread.length > 9 ? '9+' : unread.length}</span>}
      </div>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Notifications</span>
            {unread.length > 0 && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={dismissAll}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No notifications
              </div>
            ) : notifications.map(n => (
              <div key={n.id}
                className={`notification-item ${!dismissed.includes(n.id) ? 'notification-item-unread' : ''}`}
                onClick={() => { navigate(n.path); setOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertTriangle size={16} color={TYPE_ICON_COLOR[n.type]} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: TYPE_ICON_COLOR[n.type] }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{n.message}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/accounts',     icon: Building2,       label: 'Accounts',
    children: [
      { path: '/accounts',          icon: Building2, label: 'All Accounts' },
      { path: '/service-providers', icon: Landmark,  label: 'Service Providers' },
      { path: '/gl-codes',          icon: BookOpen,  label: 'GL Codes' },
    ],
  },
  {
    path: '/contracts',   icon: FileText,        label: 'Contracts',
    children: [
      { path: '/contracts',  icon: FileText,    label: 'All Contracts' },
      { path: '/usoc-codes', icon: Tag,         label: 'USOC Codes' },
      { path: '/disputes',   icon: ShieldAlert, label: 'Disputes' },
      { path: '/rate-audit', icon: ShieldCheck, label: 'Rate Audit' },
      { path: '/audit-log',  icon: Shield,      label: 'Audit Log' },
    ],
  },
  { path: '/circuits',     icon: Network,         label: 'Circuits',
    children: [
      { path: '/circuits',     icon: Network,       label: 'All Circuits' },
      { path: '/cost-savings', icon: Zap,          label: 'Cost Savings' },
      { path: '/projects',     icon: FolderKanban,  label: 'Projects' },
    ],
  },
  { path: '/orders',       icon: ShoppingCart,    label: 'Orders',
    children: [
      { path: '/orders',     icon: ShoppingCart, label: 'All Orders' },
      { path: '/milestones', icon: Flag, label: 'Milestones' },
    ],
  },
  { path: '/invoices',     icon: Receipt,         label: 'Invoices',
    children: [
      { path: '/invoices',          icon: Receipt,   label: 'All Invoices' },
      { path: '/allocations',       icon: PieChart,  label: 'Allocations' },
      { path: '/invoice-approvers', icon: UserCheck, label: 'Invoice Approvers' },
      { path: '/invoice-reader',    icon: Upload,    label: 'Invoice Reader' },
    ],
  },
  { path: '/reports', icon: BarChart2, label: 'Reports',
    children: [
      { path: '/reports',       icon: BarChart2, label: 'All Reports' },
      { path: '/create-graph',  icon: LineChart, label: 'Create Graph' },
      { path: '/create-report', icon: FileText,  label: 'Create Report' },
    ],
  },
  {
    path: '/administration', icon: Wrench, label: 'Administration', adminOnly: true,
    children: [
      { path: '/batch-upload', icon: Upload, label: 'Batch Upload' },
      { path: '/users',        icon: Users,  label: 'Users' },
    ],
  },

];

const PAGE_META = {
  '/':             { label: 'Dashboard',   sub: 'System overview & key metrics' },
  '/accounts':     { label: 'Accounts',    sub: 'Manage vendor accounts' },
  '/accounts/new': { label: 'New Account', sub: 'Add a new vendor account' },
  '/accounts/:id': { label: 'Account Detail', sub: 'View and edit vendor account' },
  '/contracts':     { label: 'Contracts',    sub: 'Track contracts and terms' },
  '/contracts/new': { label: 'New Contract', sub: 'Create a new vendor contract' },
  '/contracts/:id': { label: 'Contract Detail', sub: 'View and edit contract information' },
  '/circuits':     { label: 'Circuits',    sub: 'Circuit inventory' },
  '/circuits/new': { label: 'New Circuit', sub: 'Add a circuit to the inventory' },
  '/circuits/:id': { label: 'Circuit Detail', sub: 'View and edit circuit information' },
  '/orders':        { label: 'Orders',       sub: 'Circuit orders & provisioning' },
  '/orders/new':    { label: 'New Order',    sub: 'Create a new circuit order' },
  '/orders/:id':    { label: 'Order Detail', sub: 'View and edit order information' },
  '/invoices':     { label: 'Invoices',    sub: 'Invoice management & review' },
  '/invoices/new': { label: 'New Invoice', sub: 'Record a new vendor invoice' },
  '/usoc-codes':   { label: 'USOC Codes',  sub: 'Universal Service Order Code catalog' },
  '/usoc-codes/new': { label: 'New USOC Code', sub: 'Add a new USOC code' },
  '/usoc-codes/:id': { label: 'USOC Detail', sub: 'View and edit USOC code' },
  '/disputes':     { label: 'Disputes',    sub: 'Dispute tracking & resolution' },
  '/disputes/new': { label: 'New Dispute', sub: 'File a new billing dispute' },
  '/disputes/:id': { label: 'Dispute Detail', sub: 'View and edit dispute' },
  '/rate-audit':   { label: 'Rate Audit',  sub: 'Contract rate compliance validation' },
  '/allocations':  { label: 'Allocations', sub: 'Cost center allocations' },
  '/invoice-reader': { label: 'Invoice Reader', sub: 'Dynamic invoice parsing & batch import' },
  '/cost-savings': { label: 'Cost Savings',sub: 'Billing errors & savings pipeline' },
  '/cost-savings/new': { label: 'New Savings', sub: 'Record a new savings opportunity' },
  '/projects':           { label: 'Projects',          sub: 'Manage telecom projects' },
  '/service-providers':  { label: 'Service Providers', sub: 'Telecom service provider directory' },
  '/milestones':         { label: 'Milestones',        sub: 'Order provisioning milestones' },
  '/invoice-approvers':  { label: 'Invoice Approvers', sub: 'Invoice approval workflow management' },
  '/gl-codes':           { label: 'GL Codes',          sub: 'General ledger code management' },
  '/users':        { label: 'Users',       sub: 'User accounts & role assignments' },
  '/audit-log':    { label: 'Audit Log',   sub: 'System activity history' },
  '/preferences':    { label: 'Preferences', sub: 'User preferences & settings' },
  '/administration': { label: 'Administration', sub: 'System administration tools' },
  '/batch-upload':   { label: 'Batch Upload', sub: 'Import data from Excel templates' },
  '/reports':        { label: 'Reports',      sub: 'Graphs and custom reports' },
  '/create-graph':   { label: 'Create Graph', sub: 'Build a custom chart' },
  '/create-report':  { label: 'Create Report', sub: 'Build a custom report' },
};

function AppShell() {
  const { user, isAdmin } = useAuth();
  const COLLAPSE_BREAKPOINT = 1024;
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < COLLAPSE_BREAKPOINT);
  const [manualOverride, setManualOverride] = useState(false);
  const [navHistory, setNavHistory] = useState([]);
  const [pageTitle, setPageTitle]   = useState(null);
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [flyoutGroup, setFlyoutGroup] = useState(null);
  const [flyoutY, setFlyoutY] = useState(0);
  const flyoutCloseTimer = useRef(null);

  const toggleGroup = (path) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };
  const navigate  = useNavigate();
  const location  = useLocation();

  // Auto-collapse/expand on window resize
  useEffect(() => {
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const narrow = window.innerWidth < COLLAPSE_BREAKPOINT;
        setCollapsed(narrow);
        setManualOverride(false);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(resizeTimer); };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(c => !c);
    setManualOverride(true);
  };

  const toggleAllGroups = () => {
    const allGroupPaths = NAV.filter(n => n.children && (!n.adminOnly || isAdmin)).map(n => n.path);
    const anyOpen = allGroupPaths.some(p => openGroups.has(p));
    setOpenGroups(anyOpen ? new Set() : new Set(allGroupPaths));
  };

  const activeKey = location.pathname.endsWith('/new')
    ? location.pathname
    : location.pathname.startsWith('/circuits/') && location.pathname !== '/circuits'
    ? '/circuits/:id'
    : location.pathname.startsWith('/orders/') && location.pathname !== '/orders'
    ? '/orders/:id'
    : location.pathname.startsWith('/accounts/') && location.pathname !== '/accounts'
    ? '/accounts/:id'
    : location.pathname.startsWith('/contracts/') && location.pathname !== '/contracts'
    ? '/contracts/:id'
    : location.pathname.startsWith('/usoc-codes/') && location.pathname !== '/usoc-codes'
    ? '/usoc-codes/:id'
    : location.pathname.startsWith('/disputes/') && location.pathname !== '/disputes'
    ? '/disputes/:id'
    : location.pathname.startsWith('/invoices/') && location.pathname !== '/invoices'
    ? '/invoices/:id'
    : '/' + location.pathname.split('/')[1];
  const meta = PAGE_META[activeKey] || { label: 'TEMS', sub: '' };

  // Auto-open the group whose child is currently active
  useEffect(() => {
    NAV.forEach(item => {
      if (item.children) {
        const childActive = item.children.some(c =>
          activeKey === c.path || activeKey.startsWith(c.path + '/')
        );
        if (childActive) {
          setOpenGroups(prev => new Set([...prev, item.path]));
        }
      }
    });
  }, [activeKey]);

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

  /* ── Keyboard shortcuts ────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+K / Cmd+K → focus global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.global-search-input');
        if (searchInput) searchInput.focus();
      }
      // Esc → close modals (handled via modal-overlay click, but also close search/dropdowns)
      if (e.key === 'Escape') {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.click();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="nav-sidebar" style={{
        width: collapsed ? 64 : 240,
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, transition: 'width 0.2s ease',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Logo — click to collapse/expand sidebar */}
        <div
          onClick={toggleAllGroups}
          title="Expand / collapse all menus"
          style={{
            padding: collapsed ? '20px 0' : '20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start',
            cursor: 'pointer', userSelect: 'none',
          }}
        >
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
          {NAV.filter(n => !n.adminOnly || isAdmin).map((item) => {
            const { path, icon: Icon, label, children, adminOnly } = item;
            const isGroup   = !!children;
            const groupOpen = openGroups.has(path);
            const active    = activeKey === path;
            const childActive = isGroup && children.some(c =>
              activeKey === c.path || activeKey.startsWith(c.path + '/')
            );
            const parentHighlight = active || (isGroup && childActive);

            return (
              <div key={path}>
                {/* Parent / standalone item */}
                <div
                  className={`nav-item${parentHighlight && !isGroup ? ' active' : ''}${isGroup && childActive && !groupOpen ? ' nav-item-child-active' : ''}`}
                  onClick={() => {
                    if (isGroup) {
                      if (collapsed) {
                        // flyout is shown via hover; clicking navigates to the parent page
                        const pureContainers = ['/administration'];
                        navigate(pureContainers.includes(path) ? children[0]?.path || path : path);
                      } else {
                        toggleGroup(path);
                        const pureContainers = ['/administration'];
                        navigate(pureContainers.includes(path) ? children[0]?.path || path : path);
                      }
                    } else {
                      navigate(path);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (collapsed && isGroup) {
                      clearTimeout(flyoutCloseTimer.current);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setFlyoutY(rect.top);
                      setFlyoutGroup(path);
                    }
                  }}
                  onMouseLeave={() => {
                    if (collapsed && isGroup) {
                      flyoutCloseTimer.current = setTimeout(() => setFlyoutGroup(null), 120);
                    }
                  }}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start', margin: '2px 8px', padding: collapsed ? '10px 0' : '10px 16px' }}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{label}</span>
                      {isGroup && (
                        <ChevronDown
                          size={13}
                          className={`nav-chevron${groupOpen ? ' open' : ''}`}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Submenu */}
                {isGroup && !collapsed && (
                  <div className={`nav-submenu${groupOpen ? ' open' : ''}`}>
                    {children.map(({ path: cp, icon: CIcon, label: clabel }) => {
                      const cActive = activeKey === cp || activeKey.startsWith(cp + '/');
                      return (
                        <div
                          key={cp}
                          className={`nav-subitem${cActive ? ' active' : ''}`}
                          onClick={() => navigate(cp)}
                          title={clabel}
                        >
                          <CIcon size={14} style={{ flexShrink: 0 }} />
                          <span>{clabel}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div
          onClick={toggleCollapsed}
          style={{
            padding: '14px', borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end',
            cursor: 'pointer', color: '#475569',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </div>
      </div>

      {/* Collapsed sidebar flyout submenu */}
      {collapsed && flyoutGroup && (() => {
        const groupItem = NAV.find(n => n.path === flyoutGroup);
        if (!groupItem?.children) return null;
        return (
          <div
            style={{
              position: 'fixed',
              left: 64,
              top: flyoutY,
              background: '#1e293b',
              borderRadius: '0 8px 8px 0',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '6px 4px 24px rgba(0,0,0,0.45)',
              zIndex: 2000,
              minWidth: 190,
              paddingBottom: 6,
            }}
            onMouseEnter={() => clearTimeout(flyoutCloseTimer.current)}
            onMouseLeave={() => { flyoutCloseTimer.current = setTimeout(() => setFlyoutGroup(null), 120); }}
          >
            <div style={{ padding: '10px 16px 8px', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
              {groupItem.label}
            </div>
            {groupItem.children.map(({ path: cp, icon: CIcon, label: clabel }) => {
              const cActive = activeKey === cp || activeKey.startsWith(cp + '/');
              return (
                <div
                  key={cp}
                  className={`nav-subitem${cActive ? ' active' : ''}`}
                  onClick={() => { navigate(cp); setFlyoutGroup(null); }}
                >
                  <CIcon size={14} style={{ flexShrink: 0 }} />
                  <span>{clabel}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div className="app-header" style={{
          height: 60,
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
          padding: '0 28px', flexShrink: 0,
        }}>
          <div>
            <div className="app-header-title" style={{ fontWeight: 800, fontSize: 17 }}>{meta.label}</div>
            <div className="app-header-sub" style={{ fontSize: 12 }}>{meta.sub}</div>
          </div>
          <GlobalSearch />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
            <RecentItems />
            <NotificationCenter />
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} title={`${user.display_name}\n${user.email}\nRole: ${user.role_name}\nClick for preferences`} onClick={() => navigate('/preferences')}>
                <div style={{ textAlign: 'right' }}>
                  <div className="app-header-title" style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{user.display_name}</div>
                  <div className="app-header-sub" style={{ fontSize: 10 }}>{user.role_name}</div>
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
                }}>
                  {user.display_name ? user.display_name.charAt(0).toUpperCase() : <User size={16} color="white" />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumb history bar */}
        {navHistory.length > 1 && (
          <div className="breadcrumb-bar" style={{
            padding: '0 28px', height: 34, display: 'flex', alignItems: 'center',
            flexShrink: 0, gap: 0,
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {navHistory.map((entry, i) => {
                const isCurrent = i === navHistory.length - 1;
                return (
                  <React.Fragment key={entry.path + i}>
                    {i > 0 && <span className="breadcrumb-sep" style={{ fontSize: 12, userSelect: 'none', flexShrink: 0 }}>›</span>}
                    <span
                      className={isCurrent ? 'breadcrumb-current' : 'breadcrumb-link'}
                      onClick={() => !isCurrent && navigate(entry.path)}
                      style={{
                        fontSize: 12, flexShrink: 0, borderRadius: 6, padding: '2px 8px',
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: isCurrent ? 'default' : 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >{entry.label}</span>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              className="breadcrumb-clear"
              onClick={() => setNavHistory([])}
              style={{
                flexShrink: 0, marginLeft: 12, fontSize: 11, fontWeight: 600,
                borderRadius: 6, padding: '2px 10px', cursor: 'pointer', lineHeight: '18px',
                transition: 'all 0.15s',
              }}
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
            <Route path="/accounts/new" element={<AccountAdd />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/contracts"     element={<Contracts />} />
            <Route path="/contracts/new" element={<ContractAdd />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/circuits"     element={<Circuits />} />
            <Route path="/circuits/new" element={<CircuitAdd />} />
            <Route path="/circuits/:id" element={<CircuitDetail />} />
            <Route path="/orders"       element={<Orders />} />
            <Route path="/orders/new"   element={<OrderAdd />} />
            <Route path="/orders/:id"   element={<OrderDetail />} />
            <Route path="/invoices"     element={<Invoices />} />
            <Route path="/invoices/new" element={<InvoiceAdd />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/invoice-reader" element={<InvoiceReader />} />
            <Route path="/usoc-codes"     element={<UsocCodes />} />
            <Route path="/usoc-codes/new" element={<UsocCodeAdd />} />
            <Route path="/usoc-codes/:id" element={<UsocCodeDetail />} />
            <Route path="/disputes"      element={<Disputes />} />
            <Route path="/disputes/new"  element={<DisputeAdd />} />
            <Route path="/disputes/:id"  element={<DisputeDetail />} />
            <Route path="/rate-audit"    element={<RateAudit />} />
            <Route path="/allocations"  element={<Allocations />} />
            <Route path="/cost-savings" element={<CostSavings />} />
            <Route path="/cost-savings/new" element={<CostSavingAdd />} />
            <Route path="/projects"           element={<Projects />} />
            <Route path="/service-providers" element={<ServiceProviders />} />
            <Route path="/milestones"         element={<Milestones />} />
            <Route path="/invoice-approvers" element={<InvoiceApprovers />} />
            <Route path="/gl-codes"          element={<GLCodes />} />
            <Route path="/users"       element={<UserManagement />} />
            <Route path="/audit-log"   element={<AuditLog />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/batch-upload" element={<BatchUpload />} />
            <Route path="/create-graph"  element={<CreateGraph />} />
            <Route path="/create-report" element={<CreateReport />} />
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
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
