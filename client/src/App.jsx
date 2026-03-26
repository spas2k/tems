import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, Network, ShoppingCart,
  Receipt, PieChart, Zap, DollarSign, ChevronLeft, ChevronRight, ChevronDown, User, Search, X, Tag,
  ShieldAlert, ShieldCheck, Users, Shield, Settings, Upload, Wrench, FolderKanban, Landmark, Flag, UserCheck, BookOpen,
  BarChart2, LineChart, Bell, Clock, Command, AlertTriangle, KeyRound, Menu,
  MapPin, CreditCard, Megaphone, Layers, Database, LifeBuoy, AlertCircle, GitBranch,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getContracts, getDashboard, getNotifications, markAllNotificationsRead } from './api';
import UserSwitcher from './components/UserSwitcher';

import Dashboard    from './pages/Dashboard';
import Accounts      from './pages/Accounts';
import Vendors       from './pages/Vendors';
import VendorDetail  from './pages/VendorDetail';
import VendorAdd     from './pages/VendorAdd';
import AccountAdd   from './pages/AccountAdd';
import AccountDetail from './pages/AccountDetail';
import Contracts    from './pages/Contracts';
import ContractAdd  from './pages/ContractAdd';
import ContractDetail from './pages/ContractDetail';
import Inventory     from './pages/Inventory';
import InventoryAdd   from './pages/InventoryAdd';
import InventoryDetail from './pages/InventoryDetail';
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
import UsersPage      from './pages/Users';
import UserDetail     from './pages/UserDetail';
import UserAdd        from './pages/UserAdd';
import AuditLog     from './pages/AuditLog';
import Preferences  from './pages/Preferences';
import BatchUpload  from './pages/BatchUpload';
import Projects     from './pages/Projects';
import Milestones      from './pages/Milestones';
import InvoiceApprovers from './pages/InvoiceApprovers';
import InvoiceReader   from './pages/InvoiceReader';
import ReaderProfiles  from './pages/ReaderProfiles';
import ReaderExceptions from './pages/ReaderExceptions';
import Tickets         from './pages/Tickets';
import TicketDetail    from './pages/TicketDetail';
import TicketAdd       from './pages/TicketAdd';
import GLCodes         from './pages/GLCodes';
import CreateGraph     from './pages/CreateGraph';
import Reports        from './pages/Reports';
import CreateReport    from './pages/CreateReport';
import RolePermissions from './pages/RolePermissions';
import Locations       from './pages/Locations';
import LocationAdd     from './pages/LocationAdd';
import LocationDetail  from './pages/LocationDetail';
import FieldCatalog       from './pages/FieldCatalog';
import FieldCatalogDetail from './pages/FieldCatalogDetail';
import VendorRemit     from './pages/VendorRemit';
import VendorRemitAdd  from './pages/VendorRemitAdd';
import VendorRemitDetail from './pages/VendorRemitDetail';
import Announcements   from './pages/Announcements';
import FormInstructions from './pages/FormInstructions';
import SpendCategories from './pages/SpendCategories';
import Workflows from './pages/Workflows';
import WorkflowDetail from './pages/WorkflowDetail';
import AnnouncementBanner from './components/AnnouncementBanner';
import ScrollToTop from './components/ScrollToTop';
import FavoritesPanel from './components/FavoritesPanel';
import { FavoritesProvider } from './context/FavoritesContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { PageTitleContext } from './PageTitleContext';
import { globalSearch } from './api';

const SEARCH_GROUPS = [
  { key: 'vendors',   idKey: 'accounts_id',  label: 'Vendors',   color: '#2563eb', path: id => `/vendors/${id}`,   display: r => r.name },
  { key: 'contracts', idKey: 'contracts_id', label: 'Contracts', color: '#0d9488', path: id => `/contracts/${id}`, display: r => r.contract_number || r.name },
  { key: 'inventory',  idKey: 'inventory_id',  label: 'Inventory',  color: '#7c3aed', path: id => `/inventory/${id}`,  display: r => r.inventory_number },
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
          placeholder="Search accounts, inventory, orders…"
          className="global-search-input"
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 500 }}
        />
        {query && <X size={14} color="#64748b" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={clear} />}
      </div>

      {open && results && (
        <div className="us-dropdown" style={{
          position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', width: 420, maxHeight: 500,
          borderRadius: 12,
          overflowY: 'auto', zIndex: 9999,
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

  const TYPE_COLORS = { account: '#2563eb', contract: '#0d9488', inventoryItem: '#7c3aed', order: '#d97706', invoice: '#dc2626' };

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

  const load = async () => {
    const notifs = [];
    try {
      const [contractsRes, dashRes, dbNotifsRes] = await Promise.all([
        getContracts(), getDashboard(), getNotifications(),
      ]);
      const contracts = contractsRes.data;
      const now = new Date();

      // DB user-targeted notifications (invoice assignment, etc.) — shown first
      (dbNotifsRes.data || []).forEach(n => {
        const path = n.entity_type === 'invoice' ? `/invoices/${n.entity_id}`
          : n.entity_type === 'order'   ? `/orders/${n.entity_id}`
          : n.entity_type === 'ticket'  ? `/tickets/${n.entity_id}`
          : '/';
        notifs.push({
          id:       `db-${n.notifications_id}`,
          type:     n.type,
          title:    n.title,
          message:  n.message,
          path,
          time:     n.created_at,
          isDbRead: n.is_read,
          dbId:     n.notifications_id,
        });
      });

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

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // DB notifications are unread when is_read=false; computed ones when not dismissed
  const unread = notifications.filter(n => n.dbId ? !n.isDbRead : !dismissed.includes(n.id));

  const dismissAll = async () => {
    try { await markAllNotificationsRead(); } catch {}
    const computedIds = notifications.filter(n => !n.dbId).map(n => n.id);
    setDismissed(computedIds);
    localStorage.setItem('tems-dismissed-notifs', JSON.stringify(computedIds));
    load();
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
            ) : notifications.map(n => {
              const isUnread = n.dbId ? !n.isDbRead : !dismissed.includes(n.id);
              return (
                <div key={n.id}
                  className={`notification-item ${isUnread ? 'notification-item-unread' : ''}`}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/vendors',  icon: Landmark,  label: 'Vendors',
    children: [
      { path: '/vendors',           icon: Landmark,    label: 'All Vendors' },
      { path: '/vendor-remit',      icon: CreditCard,  label: 'Vendor Remit' },
    ],
  },
  { path: '/spend-categories', icon: Layers, label: 'Spend Categories',
    children: [
      { path: '/spend-categories', icon: Layers, label: 'All Categories' },
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
      { path: '/reader-profiles',     icon: Settings,  label: 'Reader Profiles' },
      { path: '/reader-exceptions',   icon: AlertTriangle, label: 'Reader Exceptions' },
    ],
  },
  { path: '/tickets', icon: LifeBuoy, label: 'Tickets & Issues',
    children: [
      { path: '/tickets',              icon: LifeBuoy,     label: 'All Tickets' },
      { path: '/tickets?my=1',         icon: UserCheck,    label: 'My Tickets' },
      { path: '/tickets?status=Open',  icon: AlertCircle,  label: 'Open Issues' },
    ],
  },
  { path: '/locations', icon: MapPin, label: 'Locations',
    children: [
      { path: '/locations', icon: MapPin, label: 'All Locations' },
    ],
  },
  { path: '/inventory',     icon: Network,         label: 'Inventory',
    children: [
      { path: '/inventory',     icon: Network,       label: 'All Inventory' },
      { path: '/cost-savings', icon: Zap,          label: 'Cost Savings' },
      { path: '/projects',     icon: FolderKanban,  label: 'Projects' },
    ],
  },
  { path: '/reports', icon: BarChart2, label: 'Reports',
    children: [
      { path: '/reports',       icon: BarChart2, label: 'All Reports' },
      { path: '/create-report', icon: FileText,  label: 'Create Report' },
      { path: '/create-graph',  icon: LineChart, label: 'Create Graph' },
    ],
  },
  {
    path: '/administration', icon: Wrench, label: 'Administration', adminOnly: true,
    children: [
      { path: '/batch-upload',      icon: Upload,    label: 'Batch Upload' },
      { path: '/users',             icon: Users,     label: 'Users' },
      { path: '/role-permissions',  icon: KeyRound,  label: 'Role Permissions' },
      { path: '/field-catalog',     icon: Database,  label: 'Field Catalog' },
      { path: '/form-instructions', icon: BookOpen,  label: 'Form Instructions' },
      { path: '/announcements',     icon: Megaphone, label: 'Announcements' },
      { path: '/workflows',         icon: GitBranch, label: 'Workflows' },
    ],
  },

];

const PAGE_META = {
  '/':             { label: 'Dashboard',   sub: 'System overview & key metrics' },
  '/vendors':      { label: 'Vendors',   sub: 'Telecom vendor companies' },
  '/vendors/new':   { label: 'New Vendor', sub: 'Add a new vendor' },
  '/accounts':      { label: 'Accounts',  sub: 'Billing accounts by vendor' },
  '/contracts':     { label: 'Contracts',    sub: 'Track contracts and terms' },
  '/contracts/new': { label: 'New Contract', sub: 'Create a new vendor contract' },
  '/contracts/:id': { label: 'Contract Detail', sub: 'View and edit contract information' },
  '/inventory':     { label: 'Inventory',    sub: 'InventoryItem inventory' },
  '/inventory/new': { label: 'New InventoryItem', sub: 'Add a inventoryItem to the inventory' },
  '/inventory/:id': { label: 'InventoryItem Detail', sub: 'View and edit inventoryItem information' },
  '/orders':        { label: 'Orders',       sub: 'InventoryItem orders & provisioning' },
  '/orders/new':    { label: 'New Order',    sub: 'Create a new inventoryItem order' },
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
  '/reader-profiles':  { label: 'Reader Profiles', sub: 'Automated processing profiles & match rules' },
  '/reader-exceptions': { label: 'Reader Exceptions', sub: 'Processing exceptions & resolution queue' },
  '/cost-savings': { label: 'Cost Savings',sub: 'Billing errors & savings pipeline' },
  '/cost-savings/new': { label: 'New Savings', sub: 'Record a new savings opportunity' },
  '/projects':           { label: 'Projects',          sub: 'Manage telecom projects' },
  '/milestones':         { label: 'Milestones',        sub: 'Order provisioning milestones' },
  '/invoice-approvers':  { label: 'Invoice Approvers', sub: 'Invoice approval workflow management' },
  '/gl-codes':           { label: 'GL Codes',          sub: 'General ledger code management' },
  '/users':        { label: 'Users',       sub: 'User accounts & role assignments' },
  '/audit-log':    { label: 'Audit Log',   sub: 'System activity history' },
  '/preferences':    { label: 'Preferences', sub: 'User preferences & settings' },
  '/administration': { label: 'Administration', sub: 'System administration tools' },
  '/batch-upload':   { label: 'Batch Upload', sub: 'Import data from Excel templates' },
  '/role-permissions': { label: 'Role Permissions', sub: 'Configure access control for each user role' },
  '/locations':      { label: 'Locations',        sub: 'InventoryItem installation site locations' },
  '/locations/new':  { label: 'New Location',     sub: 'Add a new site location' },
  '/locations/:id':  { label: 'Location Detail',  sub: 'View and edit location' },
  '/field-catalog':            { label: 'Field Catalog',    sub: 'User-defined dropdown options' },
  '/field-catalog/:category':  { label: 'Field Catalog',    sub: 'Manage category options' },
  '/vendor-remit':   { label: 'Vendor Remit',     sub: 'Vendor payment remittance information' },
  '/vendor-remit/new': { label: 'New Vendor Remit', sub: 'Add a remittance record' },
  '/vendor-remit/:id': { label: 'Remit Detail',   sub: 'View and edit remittance record' },
  '/announcements':  { label: 'Announcements',    sub: 'System-wide announcement banners' },
  '/workflows':      { label: 'Workflows',         sub: 'Workflow execution history & flowcharts' },
  '/form-instructions': { label: 'Form Instructions', sub: 'Manage user form helper blurbs' },
  '/spend-categories': { label: 'Spend Categories', sub: 'Spending classification hierarchy' },
  '/tickets':        { label: 'Tickets & Issues', sub: 'Issue tracking and resolution' },
  '/tickets/new':    { label: 'New Ticket',        sub: 'Create a new ticket' },
  '/tickets/:id':    { label: 'Ticket Detail',    sub: 'View and manage a ticket' },
  '/reports':        { label: 'Reports',      sub: 'Graphs and custom reports' },
  '/create-graph':   { label: 'Create Graph', sub: 'Build a custom chart' },
  '/create-report':  { label: 'Create Report', sub: 'Build a custom report' },
};

// ── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: 40, gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={28} color="var(--text-error)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="rc-results-count" style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Something went wrong</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.6 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </div>
          </div>
          <details style={{ fontSize: 11, color: 'var(--text-faint)', maxWidth: 600, width: '100%' }}>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Stack trace</summary>
            <pre style={{ overflowX: 'auto', background: 'var(--pre-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, lineHeight: 1.5 }}>
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            className="btn btn-primary"
            onClick={() => { this.setState({ error: null, info: null }); window.location.reload(); }}
          >
            Reload page
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => this.setState({ error: null, info: null })}
          >
            Try to continue
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const { user, isAdmin, hasPermission } = useAuth();

  // ── NAV path → permission resource map ─────────────────
  // A child nav item is visible only if the user has `resource:read`.
  // Paths not listed here (Dashboard, Reports, etc.) are always visible.
  const NAV_RESOURCE = {
    '/vendors':            'accounts',
    '/contracts':          'contracts',
    '/usoc-codes':         'usoc_codes',
    '/disputes':           'disputes',
    '/rate-audit':         'contracts',
    '/audit-log':          'roles',
    '/inventory':           'inventory',
    '/cost-savings':       'cost_savings',
    '/projects':           'inventory',
    '/orders':             'orders',
    '/milestones':         'orders',
    '/invoices':           'invoices',
    '/allocations':        'allocations',
    '/invoice-approvers':  'invoices',
    '/invoice-reader':     'invoices',
    '/reader-profiles':    'invoices',
    '/reader-exceptions':  'invoices',
    '/batch-upload':       'users',
    '/users':              'users',
    '/role-permissions':   'roles',
    '/locations':          'accounts',
    '/vendor-remit':       'accounts',
    '/field-catalog':      'users',
    '/announcements':      'roles',
    '/form-instructions':  'roles',
    '/spend-categories':   'accounts',
  };

  // Filter NAV: hide adminOnly groups from non-admins; hide children the
  // current user lacks read access to; hide empty groups.
  const filteredNav = NAV
    .filter(n => !n.adminOnly || isAdmin)
    .map(item => {
      if (!item.children) return item;
      const visible = item.children.filter(c => {
        const res = NAV_RESOURCE[c.path];
        return !res || hasPermission(res, 'read');
      });
      return { ...item, children: visible };
    })
    .filter(item => !item.children || item.children.length > 0);

  const COLLAPSE_BREAKPOINT = 1024;
  const MOBILE_BREAKPOINT    = 768;
  const COMPACT_HEADER_BREAKPOINT = 1450;
  const [collapsed, setCollapsed]         = useState(() => window.innerWidth < COLLAPSE_BREAKPOINT);
  const [isMobile, setIsMobile]           = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [isCompactHeader, setIsCompactHeader] = useState(() => window.innerWidth < COMPACT_HEADER_BREAKPOINT);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [virtualMobile, setVirtualMobile] = useState(() => localStorage.getItem('tems-virtual-mobile') === 'true');

  // Listen for virtual mobile toggle from Preferences page
  useEffect(() => {
    const handler = () => setVirtualMobile(localStorage.getItem('tems-virtual-mobile') === 'true');
    window.addEventListener('tems-virtual-mobile-change', handler);
    return () => window.removeEventListener('tems-virtual-mobile-change', handler);
  }, []);
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
        const w = window.innerWidth;
        setCollapsed(w < COLLAPSE_BREAKPOINT);
        setManualOverride(false);
        setIsMobile(w < MOBILE_BREAKPOINT);
        setIsCompactHeader(w < COMPACT_HEADER_BREAKPOINT);
        if (w >= MOBILE_BREAKPOINT) setMobileNavOpen(false);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(resizeTimer); };
  }, []);

  // Close mobile nav drawer on navigation
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  // Auto-collapse sidebar on report builder to maximise canvas space
  useEffect(() => {
    if (location.pathname === '/create-report') {
      setCollapsed(true);
      setManualOverride(true);
    }
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed(c => !c);
    setManualOverride(true);
  };

  const toggleAllGroups = () => {
    const allGroupPaths = filteredNav.filter(n => n.children).map(n => n.path);
    const anyOpen = allGroupPaths.some(p => openGroups.has(p));
    setOpenGroups(anyOpen ? new Set() : new Set(allGroupPaths));
  };

  const activeKey = location.pathname.endsWith('/new')
    ? location.pathname
    : location.pathname.startsWith('/inventory/') && location.pathname !== '/inventory'
    ? '/inventory/:id'
    : location.pathname.startsWith('/orders/') && location.pathname !== '/orders'
    ? '/orders/:id'
    : location.pathname.startsWith('/vendors/') && location.pathname !== '/vendors'
    ? '/vendors/:id'
    : location.pathname.startsWith('/contracts/') && location.pathname !== '/contracts'
    ? '/contracts/:id'
    : location.pathname.startsWith('/usoc-codes/') && location.pathname !== '/usoc-codes'
    ? '/usoc-codes/:id'
    : location.pathname.startsWith('/disputes/') && location.pathname !== '/disputes'
    ? '/disputes/:id'
    : location.pathname.startsWith('/invoices/') && location.pathname !== '/invoices'
    ? '/invoices/:id'
    : location.pathname.startsWith('/locations/') && location.pathname !== '/locations'
    ? '/locations/:id'
    : location.pathname.startsWith('/vendor-remit/') && location.pathname !== '/vendor-remit'
    ? '/vendor-remit/:id'
    : location.pathname.startsWith('/tickets/') && location.pathname !== '/tickets'
    ? (location.pathname === '/tickets/new' ? '/tickets/new' : '/tickets/:id')
    : location.pathname.startsWith('/field-catalog/') && location.pathname !== '/field-catalog'
    ? '/field-catalog/:category'
    : '/' + location.pathname.split('/')[1];
  const meta = PAGE_META[activeKey] || { label: 'TEMS', sub: '' };

  // Auto-open the group whose child is currently active
  useEffect(() => {
    filteredNav.forEach(item => {
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

  // ── Derived layout flags ─────────────────────────────────
  // effectiveMobile: treat as mobile (drawer UI) even on desktop when virtualMobile is on
  const effectiveMobile = isMobile || virtualMobile;
  // navExpanded: show icon+text in sidebar (true when drawer is open OR desktop is expanded)
  const navExpanded = effectiveMobile || !collapsed;

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile nav backdrop */}
      {effectiveMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 2999, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <div className="nav-sidebar" style={{
        width: effectiveMobile ? 240 : (collapsed ? 64 : 240),
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease, left 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
        position: effectiveMobile ? 'fixed' : 'relative',
        top: effectiveMobile ? 0 : undefined,
        bottom: effectiveMobile ? 0 : undefined,
        left: effectiveMobile ? (mobileNavOpen ? 0 : -240) : undefined,
        zIndex: effectiveMobile ? 3000 : undefined,
        overflow: 'hidden',
      }}>
        {/* Logo — click to collapse/expand sidebar */}
        <div
          onClick={toggleAllGroups}
          title="Expand / collapse all menus"
          style={{
            padding: navExpanded ? '20px 16px' : '20px 0',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 10, justifyContent: navExpanded ? 'flex-start' : 'center',
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
          {navExpanded && (
            <div>
              <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>TEMS <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>v0.8.3</span></div>
              <div style={{ color: '#64748b', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Telecom Expense</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8, overflowY: 'auto' }}>
          {filteredNav.map((item) => {
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
                  style={{ justifyContent: navExpanded ? 'flex-start' : 'center', margin: '2px 8px', padding: navExpanded ? '10px 16px' : '10px 0' }}
                  title={navExpanded ? undefined : label}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {navExpanded && (
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
                {isGroup && navExpanded && (
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
          onClick={effectiveMobile ? () => setMobileNavOpen(false) : toggleCollapsed}
          style={{
            padding: '14px', borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', justifyContent: navExpanded ? 'flex-end' : 'center',
            cursor: 'pointer', color: '#475569',
          }}
        >
          {effectiveMobile
            ? <ChevronLeft size={16} />
            : collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </div>
      </div>

      {/* Collapsed sidebar flyout submenu — only on desktop non-mobile */}
      {!effectiveMobile && collapsed && flyoutGroup && (() => {
        const groupItem = filteredNav.find(n => n.path === flyoutGroup);
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          padding: effectiveMobile ? '0 14px' : '0 28px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: effectiveMobile ? 10 : 0, minWidth: 0, flex: 1 }}>
            {effectiveMobile && (
              <button
                onClick={() => setMobileNavOpen(o => !o)}
                className="btn btn-ghost btn-icon"
                style={{ flexShrink: 0 }}
              >
                <Menu size={20} color="#64748b" />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              {(!isCompactHeader || effectiveMobile) && (
                <>
                  <div className="app-header-title" style={{ fontWeight: 800, fontSize: effectiveMobile ? 14 : 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</div>
                  {!effectiveMobile && <div className="app-header-sub" style={{ fontSize: 12 }}>{meta.sub}</div>}
                </>
              )}
            </div>
          </div>
          {!effectiveMobile && (
            <div style={{ flex: isCompactHeader ? '0 1 200px' : '0 1 400px', display: 'flex', justifyContent: 'center', minWidth: 0 }}>
              <GlobalSearch />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: effectiveMobile ? 8 : 16, justifyContent: 'flex-end', flex: 1, minWidth: 0 }}>
            {!effectiveMobile && !isCompactHeader && <FavoritesPanel />}
            {!effectiveMobile && !isCompactHeader && <RecentItems />}
            <NotificationCenter />
            <UserSwitcher />
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
        <div className="app-content" style={{ flex: 1, overflowY: 'auto', padding: effectiveMobile ? '14px' : '24px' }}>
          <AnnouncementBanner />
            <ScrollToTop />
          <ErrorBoundary>
            <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/vendors"      element={<Vendors />} />
            <Route path="/vendors/new"  element={<VendorAdd />} />
            <Route path="/vendors/:id"  element={<VendorDetail />} />
            <Route path="/accounts"     element={<Accounts />} />
            <Route path="/accounts/new" element={<AccountAdd />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/contracts"     element={<Contracts />} />
            <Route path="/contracts/new" element={<ContractAdd />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/inventory"     element={<Inventory />} />
            <Route path="/inventory/new" element={<InventoryAdd />} />
            <Route path="/inventory/:id" element={<InventoryDetail />} />
            <Route path="/orders"       element={<Orders />} />
            <Route path="/orders/new"   element={<OrderAdd />} />
            <Route path="/orders/:id"   element={<OrderDetail />} />
            <Route path="/invoices"     element={<Invoices />} />
            <Route path="/invoices/new" element={<InvoiceAdd />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/invoice-reader" element={<InvoiceReader />} />
            <Route path="/reader-profiles" element={<ReaderProfiles />} />
            <Route path="/reader-exceptions" element={<ReaderExceptions />} />
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
            <Route path="/milestones"         element={<Milestones />} />
            <Route path="/invoice-approvers" element={<InvoiceApprovers />} />
            <Route path="/gl-codes"          element={<GLCodes />} />
            <Route path="/users"       element={<UsersPage />} />
            <Route path="/users/new"   element={<UserAdd />} />
            <Route path="/users/:id"   element={<UserDetail />} />
            <Route path="/audit-log"   element={<AuditLog />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/batch-upload" element={<BatchUpload />} />
            <Route path="/role-permissions" element={<RolePermissions />} />
            <Route path="/create-graph"  element={<CreateGraph />} />
            <Route path="/reports"       element={<Reports />} />
            <Route path="/create-report" element={<CreateReport />} />
            <Route path="/locations"       element={<Locations />} />
            <Route path="/locations/new"   element={<LocationAdd />} />
            <Route path="/locations/:id"   element={<LocationDetail />} />
            <Route path="/field-catalog"           element={<FieldCatalog />} />
            <Route path="/field-catalog/:category" element={<FieldCatalogDetail />} />
            <Route path="/vendor-remit"    element={<VendorRemit />} />
            <Route path="/vendor-remit/new" element={<VendorRemitAdd />} />
            <Route path="/vendor-remit/:id" element={<VendorRemitDetail />} />
            <Route path="/announcements"   element={<Announcements />} />
            <Route path="/form-instructions" element={<FormInstructions />} />
            <Route path="/spend-categories" element={<SpendCategories />} />
            <Route path="/tickets"      element={<Tickets />} />
            <Route path="/tickets/new" element={<TicketAdd />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/workflows"    element={<Workflows />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
          </Routes>
          </ErrorBoundary>
        </div>
        </PageTitleContext.Provider>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <FavoritesProvider>
          <ConfirmProvider>
            <AppShell />
          </ConfirmProvider>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
