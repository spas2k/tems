/**
 * @file Root application shell with routing, navigation, and global UI.
 * @module App
 *
 * Defines the full application layout: sidebar navigation, header bar (with
 * global search, notifications, recent items, favorites), breadcrumbs,
 * AnnouncementBanner, and all <Route> definitions. Contains sub-components:
 * GlobalSearch, RecentItems, NotificationCenter, AppShell, and ErrorBoundary.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, Network, ShoppingCart,
  Receipt, PieChart, Zap, DollarSign, ChevronLeft, ChevronRight, ChevronDown, User, Search, X, Tag,
  ShieldAlert, ShieldCheck, Users, Shield, Settings, Upload, Wrench, FolderKanban, Landmark, Flag, UserCheck, BookOpen,
  BarChart2, LineChart, Bell, Clock, Command, AlertTriangle, KeyRound, Menu,
  MapPin, CreditCard, Megaphone, Layers, Database, LifeBuoy, AlertCircle, GitBranch, Mail, Trash2, BellRing,
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
import AllocationRules from './pages/AllocationRules';
import Currencies      from './pages/Currencies';
import CurrencyAdd     from './pages/CurrencyAdd';
import CurrencyDetail  from './pages/CurrencyDetail';
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
import Graphs         from './pages/Graphs';
import ViewGraph       from './pages/ViewGraph';
import Reports        from './pages/Reports';
import ViewReport      from './pages/ViewReport';
import CreateReport    from './pages/CreateReport';
import RolePermissions from './pages/RolePermissions';
import Roles           from './pages/Roles';
import RoleForm        from './pages/RoleForm';
import RoleDetail      from './pages/RoleDetail';
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
import SpendCategoryAdd from './pages/SpendCategoryAdd';
import SpendCategoryDetail from './pages/SpendCategoryDetail';
import Workflows from './pages/Workflows';
import WorkflowDetail from './pages/WorkflowDetail';
import EmailConfig from './pages/EmailConfig';
import AdminDashboard from './pages/AdminDashboard';
import AdminPurge from './pages/AdminPurge';
import NotificationSettings from './pages/NotificationSettings';
import DashboardBuilder from './pages/DashboardBuilder';
import AnnouncementBanner from './components/AnnouncementBanner';
import ScrollToTop from './components/ScrollToTop';
import FavoritesPanel from './components/FavoritesPanel';
import { FavoritesProvider } from './context/FavoritesContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { PageTitleContext } from './PageTitleContext';
import { globalSearch } from './api';

const SEARCH_GROUPS = [
  { key: 'vendors',      icon: 'V',  label: 'Vendors',      color: '#3b82f6', idKey: 'vendors_id',      path: id => `/vendors/${id}`,
    display: r => r.name,             sub: r => [r.vendor_number, r.vendor_type].filter(Boolean).join(' · '), badge: r => r.status },
  { key: 'accounts',     icon: 'A',  label: 'Accounts',     color: '#06b6d4', idKey: 'accounts_id',     path: id => `/accounts/${id}`,
    display: r => r.account_number,   sub: r => [r.name, r.vendor_name].filter(Boolean).join(' · '),         badge: r => r.status },
  { key: 'contracts',    icon: 'C',  label: 'Contracts',    color: '#0d9488', idKey: 'contracts_id',    path: id => `/contracts/${id}`,
    display: r => r.contract_number || r.contract_name, sub: r => r.vendor_name,                          badge: r => r.status },
  { key: 'inventory',    icon: 'I',  label: 'Inventory',    color: '#7c3aed', idKey: 'inventory_id',    path: id => `/inventory/${id}`,
    display: r => r.inventory_number, sub: r => [r.type, r.account_name].filter(Boolean).join(' · '),       badge: r => r.status },
  { key: 'orders',       icon: 'O',  label: 'Orders',       color: '#d97706', idKey: 'orders_id',       path: id => `/orders/${id}`,
    display: r => r.order_number,     sub: r => [r.vendor_name, r.description].filter(Boolean).join(' · '), badge: r => r.status },
  { key: 'invoices',     icon: '$',  label: 'Invoices',     color: '#ef4444', idKey: 'invoices_id',     path: id => `/invoices/${id}`,
    display: r => r.invoice_number,   sub: r => r.account_name,                                             badge: r => r.status,
    extra: r => r.total_amount != null ? `$${Number(r.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null },
  { key: 'locations',    icon: 'L',  label: 'Locations',    color: '#10b981', idKey: 'locations_id',    path: id => `/locations/${id}`,
    display: r => r.name,             sub: r => [r.city, r.state, r.site_code].filter(Boolean).join(', '),  badge: r => r.status },
  { key: 'disputes',     icon: 'D',  label: 'Disputes',     color: '#f59e0b', idKey: 'disputes_id',     path: id => `/disputes/${id}`,
    display: r => r.reference_number || `#${r.disputes_id}`, sub: r => [r.dispute_type, r.vendor_name].filter(Boolean).join(' · '), badge: r => r.status,
    extra: r => r.amount != null ? `$${Number(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null },
  { key: 'tickets',      icon: 'T',  label: 'Tickets',      color: '#ec4899', idKey: 'tickets_id',      path: id => `/tickets/${id}`,
    display: r => r.ticket_number || `#${r.tickets_id}`, sub: r => r.title,                               badge: r => r.status },
  { key: 'cost_savings', icon: 'S',  label: 'Savings',      color: '#22c55e', idKey: 'cost_savings_id', path: id => `/cost-savings/${id}`,
    display: r => r.category || 'Savings', sub: r => [r.description, r.vendor_name].filter(Boolean).join(' · '), badge: r => r.status,
    extra: r => r.projected_savings != null ? `$${Number(r.projected_savings).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null },
  { key: 'usoc_codes',   icon: 'U',  label: 'USOC Codes',   color: '#8b5cf6', idKey: 'usoc_codes_id',   path: id => `/usoc-codes/${id}`,
    display: r => r.usoc_code,        sub: r => [r.description, r.category].filter(Boolean).join(' · '), badge: r => r.status },
];

const BADGE_COLORS = {
  Active: '#22c55e', Open: '#3b82f6', Paid: '#22c55e', Unpaid: '#ef4444',
  Closed: '#64748b', Resolved: '#22c55e', 'In Progress': '#f59e0b',
  Disputed: '#f59e0b', Pending: '#f59e0b', Expired: '#ef4444',
};

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
      } catch { setResults(null); }
      finally { setLoading(false); }
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
        <Search size={16} color={loading ? '#3b82f6' : '#64748b'} style={{ flexShrink: 0, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => results && setOpen(true)}
          placeholder="Search all assets…  (Ctrl+K)"
          className="global-search-input"
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 500 }}
        />
        {query && <X size={14} color="#64748b" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={clear} />}
      </div>

      {open && results && (
        <div style={{
          position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)',
          width: 520, maxHeight: 560, borderRadius: 14, overflowY: 'auto', zIndex: 9999,
          background: '#0f172a', border: '1px solid #1e293b',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}>
          {total === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No results for <strong style={{ color: '#94a3b8' }}>"{query}"</strong>
            </div>
          ) : (
            SEARCH_GROUPS.map(group => {
              const items = results[group.key] || [];
              if (!items.length) return null;
              return (
                <div key={group.key}>
                  <div style={{
                    padding: '10px 16px 6px', fontSize: 10, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '1px', color: group.color,
                    background: '#0f172a', position: 'sticky', top: 0, zIndex: 2,
                    borderBottom: '1px solid #1e293b',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${group.color}25`, color: group.color,
                    }}>{group.icon}</span>
                    {group.label}
                    <span style={{ color: '#475569', fontWeight: 600, marginLeft: 'auto' }}>{items.length}</span>
                  </div>
                  {items.map(r => {
                    const badgeText = group.badge?.(r);
                    const extraText = group.extra?.(r);
                    return (
                      <div key={r[group.idKey]} onClick={() => go(group.path(r[group.idKey]))}
                        style={{
                          padding: '10px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          borderBottom: '1px solid #1e293b20',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                              {group.display(r)}
                            </span>
                            {badgeText && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                background: `${BADGE_COLORS[badgeText] || '#475569'}22`,
                                color: BADGE_COLORS[badgeText] || '#94a3b8',
                                textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
                              }}>{badgeText}</span>
                            )}
                          </div>
                          {group.sub(r) && (
                            <div style={{
                              fontSize: 11, color: '#64748b', marginTop: 2,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{group.sub(r)}</div>
                          )}
                        </div>
                        {extraText && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                            {extraText}
                          </span>
                        )}
                        <ChevronRight size={14} color="#334155" style={{ flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
          <div style={{
            padding: '8px 16px', borderTop: '1px solid #1e293b',
            fontSize: 11, color: '#475569', textAlign: 'right', background: '#0f172a',
            position: 'sticky', bottom: 0,
          }}>
            {total} result{total !== 1 ? 's' : ''} across {SEARCH_GROUPS.filter(g => (results[g.key] || []).length > 0).length} categories
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
  const [shaking, setShaking] = useState(false);
  const [toasts, setToasts] = useState([]);
  const prevUnreadIds = useRef(new Set());
  const initialLoadDone = useRef(false);
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
    const interval = setInterval(load, 15000); // refresh every 15s
    // Allow instant refresh from anywhere via custom event
    const refresh = () => setTimeout(load, 500); // small delay for DB write to complete
    window.addEventListener('tems-notification-refresh', refresh);
    return () => { clearInterval(interval); window.removeEventListener('tems-notification-refresh', refresh); };
  }, []);

  // DB notifications are unread when is_read=false; computed ones when not dismissed
  const unread = notifications.filter(n => n.dbId ? !n.isDbRead : !dismissed.includes(n.id));

  // Detect newly-arrived unread notifications → shake bell + show toast
  useEffect(() => {
    const currentIds = new Set(unread.map(n => n.id));
    const isFirstLoad = !initialLoadDone.current;

    if (isFirstLoad && unread.length > 0) {
      // Shake the bell on initial load if there are unread notifications
      initialLoadDone.current = true;
      setShaking(true);
      setTimeout(() => setShaking(false), 650);
    } else if (!isFirstLoad) {
      const newItems = unread.filter(n => !prevUnreadIds.current.has(n.id));
      if (newItems.length > 0) {
        // Shake the bell
        setShaking(true);
        setTimeout(() => setShaking(false), 650);
        // Show toast for each new notification (max 3)
        const incoming = newItems.slice(0, 3).map(n => ({ ...n, _toastId: `${n.id}-${Date.now()}` }));
        setToasts(prev => [...incoming, ...prev].slice(0, 5));
        incoming.forEach(t => {
          setTimeout(() => setToasts(prev => prev.filter(x => x._toastId !== t._toastId)), 5000);
        });
      }
    }

    if (isFirstLoad && unread.length === 0) initialLoadDone.current = true;
    prevUnreadIds.current = currentIds;
  }, [unread.map(n => n.id).join(',')]);

  const dismissToast = (toastId, path) => {
    setToasts(prev => prev.filter(t => t._toastId !== toastId));
    if (path) { navigate(path); setOpen(false); }
  };

  const dismissAll = async () => {
    try { await markAllNotificationsRead(); } catch {}
    const computedIds = notifications.filter(n => !n.dbId).map(n => n.id);
    setDismissed(computedIds);
    localStorage.setItem('tems-dismissed-notifs', JSON.stringify(computedIds));
    load();
  };

  const TYPE_ICON_COLOR = { danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

  return (
    <>
    <div ref={ref} style={{ position: 'relative' }}>
      <div className={`notification-bell${shaking ? ' shaking' : ''}`} onClick={() => setOpen(p => !p)}>
        <Bell size={20} color="#64748b" />
        {unread.length > 0 && <span className="notification-badge">{unread.length > 9 ? '9+' : unread.length}</span>}
      </div>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Notifications</span>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={dismissAll}>
              Mark all read
            </button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No notifications
              </div>
            ) : notifications.slice(0, 10).map(n => {
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
    {toasts.length > 0 && (
        <div className="notification-toast">
          {toasts.map(t => (
            <div key={t._toastId} className="notification-toast-item" onClick={() => dismissToast(t._toastId, t.path)}>
              <AlertTriangle size={16} color={TYPE_ICON_COLOR[t.type]} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="toast-title" style={{ color: TYPE_ICON_COLOR[t.type] }}>{t.title}</div>
                <div className="toast-message">{t.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const NAV = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/vendors',  icon: Landmark,  label: 'Vendors',
    children: [
      { path: '/vendors',           icon: Landmark,    label: 'All Vendors' },
      { path: '/accounts',          icon: Building2,   label: 'All Accounts' },
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
      { path: '/allocation-rules',   icon: PieChart,  label: 'Allocation Rules' },
      { path: '/invoice-approvers', icon: UserCheck, label: 'Invoice Approvers' },
      { path: '/currencies',        icon: DollarSign, label: 'Currencies' },
      { path: '/invoice-reader',    icon: Upload,    label: 'Invoice Reader' },
      { path: '/reader-profiles',     icon: Settings,  label: 'Reader Profiles' },
      { path: '/reader-exceptions',   icon: AlertTriangle, label: 'Reader Exceptions' },
    ],
  },
  { path: '/tickets', icon: LifeBuoy, label: 'Tickets & Issues',
    children: [
      { path: '/tickets',              icon: LifeBuoy,     label: 'All Tickets',  roles: ['Admin', 'Manager'] },
      { path: '/tickets',              icon: UserCheck,    label: 'My Tickets',   state: { filters: { assigned_user_name: '__MY__' } } },
      { path: '/tickets',              icon: AlertCircle,  label: 'Open Issues',  roles: ['Admin', 'Manager'], state: { filters: { status: 'Open' } } },
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
      { path: '/graphs',        icon: LineChart, label: 'All Graphs' },
      { path: '/create-graph',  icon: LineChart, label: 'Create Graph' },
    ],
  },
  {
    path: '/administration', icon: Wrench, label: 'Administration', adminOnly: true,
    children: [
      { path: '/administration',    icon: BarChart2, label: 'Admin Dashboard' },
      { path: '/batch-upload',      icon: Upload,    label: 'Batch Upload' },
      { path: '/users',             icon: Users,     label: 'Users' },
      { path: '/roles',             icon: Shield,    label: 'Roles' },
      { path: '/role-permissions',  icon: KeyRound,  label: 'Role Permissions' },
      { path: '/field-catalog',     icon: Database,  label: 'Field Catalog' },
      { path: '/form-instructions', icon: BookOpen,  label: 'Form Instructions' },
      { path: '/announcements',     icon: Megaphone, label: 'Announcements' },
      { path: '/workflows',         icon: GitBranch, label: 'Workflows' },
      { path: '/email-config',      icon: Mail,      label: 'Email Config' },
      { path: '/notification-settings', icon: BellRing, label: 'Notification Settings' },
      { path: '/audit-log',         icon: Shield,    label: 'Audit Log' },
      { path: '/admin-purge',       icon: Trash2,    label: 'Purge Tool' },
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
  '/allocation-rules': { label: 'Allocation Rules', sub: 'Define cost center splits per account' },
  '/currencies':   { label: 'Currencies', sub: 'Currency code management' },
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
  '/administration': { label: 'Administration', sub: 'System health & administrative overview' },
  '/admin-purge':    { label: 'Purge Tool',      sub: 'Cascade delete vendors, invoices, or inventory' },
  '/batch-upload':   { label: 'Batch Upload', sub: 'Import data from Excel templates' },
  '/role-permissions': { label: 'Role Permissions', sub: 'Configure access control for each user role' },
  '/roles':            { label: 'Roles',            sub: 'Manage system roles' },
  '/roles/new':        { label: 'New Role',          sub: 'Create a new role' },
  '/roles/:id':        { label: 'Role Detail',       sub: 'View and manage role' },
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
  '/email-config':   { label: 'Email Config',      sub: 'SMTP settings & notification email management' },
  '/notification-settings': { label: 'Notification Settings', sub: 'Manage notification types and delivery preferences' },
  '/form-instructions': { label: 'Form Instructions', sub: 'Manage user form helper blurbs' },
  '/spend-categories': { label: 'Spend Categories', sub: 'Spending classification hierarchy' },
  '/spend-categories/new': { label: 'New Category', sub: 'Create a new spend category' },
  '/spend-categories/:id': { label: 'Category Detail', sub: 'View and edit spend category' },
  '/tickets':        { label: 'Tickets & Issues', sub: 'Issue tracking and resolution' },
  '/tickets/new':    { label: 'New Ticket',        sub: 'Create a new ticket' },
  '/tickets/:id':    { label: 'Ticket Detail',    sub: 'View and manage a ticket' },
  '/reports':        { label: 'Reports',      sub: 'Graphs and custom reports' },
  '/reports/:id':    { label: 'View Report',  sub: 'Report data view' },
  '/graphs':         { label: 'Graphs',       sub: 'Saved graph configurations' },
  '/graphs/:id':     { label: 'View Graph',   sub: 'Graph data view' },
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
    '/vendors':            'vendors',
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
    '/invoice-reader':     'invoice_reader_uploads',
    '/reader-profiles':    'invoice_reader_uploads',
    '/reader-exceptions':  'invoice_reader_uploads',
    '/batch-upload':       'users',
    '/users':              'users',
    '/role-permissions':   'roles',
    '/roles':              'roles',
    '/locations':          'locations',
    '/vendor-remit':       'vendor_remit',
    '/field-catalog':      'field_catalog',
    '/announcements':      'announcements',
    '/form-instructions':  'form_instructions',
    '/spend-categories':   'spend_categories',
    '/tickets':            'tickets',
    '/reports':            'reports',
    '/create-report':      'reports',
    '/graphs':             'reports',
    '/create-graph':       'reports',
    '/workflows':          'roles',
    '/email-config':       'roles',
  };

  // Filter NAV: hide adminOnly groups from non-admins; hide children the
  // current user lacks read access to; hide empty groups.
  const filteredNav = NAV
    .filter(n => !n.adminOnly || isAdmin)
    .map(item => {
      if (!item.children) return item;
      const visible = item.children.filter(c => {
        if (c.roles && !c.roles.includes(user?.role_name)) return false;
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
    if (location.pathname === '/create-report' || location.pathname === '/create-graph') {
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
                        navigate(path);
                      } else {
                        toggleGroup(path);
                        navigate(path);
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
                    {children.map(({ path: cp, icon: CIcon, label: clabel, state: cState }) => {
                      const pathMatch = activeKey === cp || activeKey.startsWith(cp + '/');
                      const cActive = pathMatch && !cState;
                      return (
                        <div
                          key={cp + clabel}
                          className={`nav-subitem${cActive ? ' active' : ''}`}
                          onClick={() => navigate(cp, cState ? { state: cState } : undefined)}
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
            {groupItem.children.map(({ path: cp, icon: CIcon, label: clabel, state: cState }) => {
              const pathMatch = activeKey === cp || activeKey.startsWith(cp + '/');
              const cActive = pathMatch && !cState;
              return (
                <div
                  key={cp + clabel}
                  className={`nav-subitem${cActive ? ' active' : ''}`}
                  onClick={() => { navigate(cp, cState ? { state: cState } : undefined); setFlyoutGroup(null); }}
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
            <Route path="/allocation-rules" element={<AllocationRules />} />
            <Route path="/currencies"     element={<Currencies />} />
            <Route path="/currencies/new" element={<CurrencyAdd />} />
            <Route path="/currencies/:id" element={<CurrencyDetail />} />
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
            <Route path="/dashboard-builder" element={<DashboardBuilder />} />
            <Route path="/batch-upload" element={<BatchUpload />} />
            <Route path="/role-permissions" element={<RolePermissions />} />
            <Route path="/roles"       element={<Roles />} />
            <Route path="/roles/new"   element={<RoleForm />} />
            <Route path="/roles/:id"   element={<RoleDetail />} />
            <Route path="/create-graph"  element={<CreateGraph />} />
            <Route path="/graphs/:id"    element={<ViewGraph />} />
            <Route path="/graphs"         element={<Graphs />} />
            <Route path="/reports/:id"   element={<ViewReport />} />
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
            <Route path="/spend-categories/new" element={<SpendCategoryAdd />} />
            <Route path="/spend-categories/:id" element={<SpendCategoryDetail />} />
            <Route path="/tickets"      element={<Tickets />} />
            <Route path="/tickets/new" element={<TicketAdd />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/workflows"    element={<Workflows />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
            <Route path="/email-config" element={<EmailConfig />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/admin-purge" element={<AdminPurge />} />
            <Route path="/administration" element={<AdminDashboard />} />

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
