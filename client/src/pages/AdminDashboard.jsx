/**
 * @file Admin dashboard with system health, DB stats, and maintenance tools.
 * @module AdminDashboard
 *
 * Admin-only page showing system info (Node.js version, memory, uptime), table row counts, DB size, data purge tools, and email retry action. Accessible only to Admin role.
 */
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboard, getAdminDbStats, adminPurge, adminRetryEmails } from '../api';
import { PageTitleContext } from '../PageTitleContext';
import { getRoleColor } from '../utils/roleColors';
import {
  Users, ShieldCheck, ShieldX, ShieldOff, Activity, FileText,
  Mail, MailX, Bell, BellOff, GitBranch, CheckCircle2, XCircle,
  AlertTriangle, Clock, LifeBuoy, Upload, BarChart2, Megaphone, Wrench,
  RefreshCw, Eye, TrendingUp, Database, ArrowRight, UserCheck,
  Shield, Zap, Server, HardDrive, Trash2, RotateCcw, Table2, Menu, X, Wifi,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

function KpiCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <div className={`kpi-card ${color}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-icon"><Icon size={40} /></div>
    </div>
  );
}

function StatusDot({ color }) {
  return <span style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: color, flexShrink: 0,
  }} />;
}

function TimeAgo({ date }) {
  if (!date) return <span style={{ color: '#94a3b8' }}>Never</span>;
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span style={{ color: '#10b981' }}>Just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  const days = Math.floor(hrs / 24);
  if (days < 7) return <span>{days}d ago</span>;
  return <span>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>;
}

const ACTION_BADGE = {
  CREATE: { cls: 'badge badge-green', label: 'CREATE' },
  UPDATE: { cls: 'badge badge-blue',  label: 'UPDATE' },
  DELETE: { cls: 'badge badge-red',   label: 'DELETE' },
};

const WORKFLOW_BADGE = {
  success: { cls: 'badge badge-green', label: 'Success' },
  failed:  { cls: 'badge badge-red',   label: 'Failed' },
  running: { cls: 'badge badge-blue',  label: 'Running' },
};

export default function AdminDashboard() {
  const { setTitle } = useContext(PageTitleContext) || {};
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Maintenance state
  const [dbStats, setDbStats] = useState(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState('audit_log');
  const [purgeDays, setPurgeDays] = useState(90);
  const [purgeResult, setPurgeResult] = useState(null);
  const [purging, setPurging] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const quickMenuRef = useRef(null);

  const load = () => {
    setLoading(true); setError(null);
    getAdminDashboard()
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setTitle?.('Administration'); load(); }, [setTitle]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target)) setQuickMenuOpen(false);
    };
    if (quickMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [quickMenuOpen]);

  const loadDbStats = () => {
    setDbStatsLoading(true);
    getAdminDbStats()
      .then(r => setDbStats(r.data))
      .catch(() => {})
      .finally(() => setDbStatsLoading(false));
  };

  const handlePurge = async () => {
    if (!window.confirm(`Delete ${purgeTarget.replace('_', ' ')} records older than ${purgeDays} days? This cannot be undone.`)) return;
    setPurging(true); setPurgeResult(null);
    try {
      const r = await adminPurge({ target: purgeTarget, olderThanDays: purgeDays });
      setPurgeResult(r.data);
      load(); // refresh dashboard counts
      if (dbStats) loadDbStats();
    } catch (e) {
      setPurgeResult({ error: e.response?.data?.error || e.message });
    } finally { setPurging(false); }
  };

  const handleRetryEmails = async () => {
    setRetrying(true); setRetryResult(null);
    try {
      const r = await adminRetryEmails();
      setRetryResult(r.data);
      load();
    } catch (e) {
      setRetryResult({ error: e.response?.data?.error || e.message });
    } finally { setRetrying(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ background: 'var(--bg-error)', color: 'var(--text-error)', padding: '16px 20px', borderRadius: 12, fontWeight: 600 }}>
      Error loading admin dashboard: {error}
    </div>
  );

  const { users, audit, email, notifications, workflows, tickets, invoiceReader, exceptions, announcements, reports, system, activeSessions } = data;

  // ── Helpers ──
  const fmtBytes = (b) => {
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(0) + ' MB';
    return (b / 1024).toFixed(0) + ' KB';
  };
  const fmtUptime = (secs) => {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  const heapLimit = system?.processMemory?.heapSizeLimit || system?.processMemory?.heapTotal || 1;
  const heapPct = system?.processMemory ? Math.round((system.processMemory.heapUsed / heapLimit) * 100) : 0;

  // ── Chart data ──
  const roleChartData = users.roleBreakdown.map((r, i) => ({
    name: r.role,
    value: r.count,
    fill: getRoleColor(r, i),
  }));

  const auditTimeline = audit.timeline.map(r => ({
    day: new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Creates: r.creates,
    Updates: r.updates,
    Deletes: r.deletes,
  }));

  const resourceBarData = audit.byResource.slice(0, 8).map(r => ({
    resource: r.resource.replace(/_/g, ' '),
    count: r.count,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        borderRadius: 16, padding: '28px 32px', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={24} color="#93c5fd" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>System Administration</h1>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Real-time system health, activity & configuration</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={load}
            style={{ color: '#93c5fd', borderColor: 'rgba(147,197,253,0.3)', fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <div ref={quickMenuRef} style={{ position: 'relative' }}>
            <button className="btn btn-ghost" onClick={() => setQuickMenuOpen(o => !o)}
              style={{ color: '#93c5fd', borderColor: 'rgba(147,197,253,0.3)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              {quickMenuOpen ? <X size={16} /> : <Menu size={16} />} Quick Actions
            </button>
            {quickMenuOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                background: '#fff', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                border: '1px solid #e2e8f0', width: 280, maxHeight: '70vh', overflowY: 'auto',
                padding: '6px 0',
              }}>
                {[
                  { path: '/users',              icon: Users,         label: 'Manage Users',       sub: `${users.total} users` },
                  { path: '/roles',              icon: Shield,        label: 'Manage Roles',       sub: `${users.roleBreakdown.length} roles` },
                  { path: '/role-permissions',   icon: ShieldCheck,   label: 'Role Permissions',   sub: 'Permission matrix' },
                  { path: '/batch-upload',       icon: Upload,        label: 'Batch Upload',       sub: 'Import data' },
                  { path: '/field-catalog',      icon: Database,      label: 'Field Catalog',      sub: 'Custom fields' },
                  { path: '/form-instructions',  icon: FileText,      label: 'Form Instructions',  sub: 'Help text config' },
                  { path: '/announcements',      icon: Megaphone,     label: 'Announcements',      sub: `${announcements.active} active` },
                  { path: '/workflows',          icon: GitBranch,     label: 'Workflows',          sub: `${workflows.success + workflows.failed} runs` },
                  { path: '/email-config',       icon: Mail,          label: 'Email Config',       sub: email.enabled ? 'Enabled' : 'Disabled' },
                  { path: '/audit-log',          icon: Eye,           label: 'Audit Log',          sub: `${audit.today} today` },
                  { path: '/reports',            icon: BarChart2,     label: 'Reports',            sub: `${reports.saved} saved` },
                  { path: '/reader-exceptions',  icon: AlertTriangle, label: 'Reader Exceptions',  sub: `${exceptions.open} open` },
                ].map(item => (
                  <div key={item.path}
                    onClick={() => { navigate(item.path); setQuickMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <item.icon size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── System Health KPIs ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard label="Total Users" value={users.total} icon={Users} color="blue"
          sub={`${users.active} active`} onClick={() => navigate('/users')} />
        <KpiCard label="Suspended" value={users.suspended} icon={ShieldOff} color={users.suspended > 0 ? 'red' : 'green'}
          sub={users.suspended > 0 ? 'Action needed' : 'All clear'} onClick={() => navigate('/users')} />
        <KpiCard label="Audit Events (Today)" value={audit.today} icon={Activity} color="purple"
          sub={`${audit.week} this week`} onClick={() => navigate('/audit-log')} />
        <KpiCard label="Emails Sent" value={email.sent} icon={Mail} color="teal"
          sub={email.enabled ? `via ${email.host || 'SMTP'}` : 'Email disabled'} onClick={() => navigate('/email-config')} />
        <KpiCard label="Email Failures" value={email.failed} icon={MailX} color={email.failed > 0 ? 'orange' : 'green'}
          sub={email.failed > 0 ? 'Review needed' : 'All delivered'} onClick={() => navigate('/email-config')} />
        <KpiCard label="Notifications" value={notifications.unread} icon={Bell} color="blue"
          sub={`${notifications.total} total, ${notifications.read} read`} />
        <KpiCard label="Open Tickets" value={tickets.open} icon={LifeBuoy} color={tickets.highPriority > 0 ? 'orange' : 'blue'}
          sub={`${tickets.highPriority} high/critical`} onClick={() => navigate('/tickets')} />
        <KpiCard label="Workflows" value={workflows.success + workflows.failed} icon={GitBranch} color="slate"
          sub={workflows.failed > 0 ? `${workflows.failed} failed` : `${workflows.running} running`}
          onClick={() => navigate('/workflows')} />
      </div>

      {/* ── Service Status Strip ───────────────────────────────── */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Server size={15} /> Service Status
          </span>
        </div>
        <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Database', status: true, detail: 'PostgreSQL connected' },
            { label: 'Email Delivery', status: email.enabled, detail: email.enabled ? `${email.host}` : 'Disabled' },
            { label: 'Announcements', status: announcements.active > 0, detail: `${announcements.active} active` },
            { label: 'Invoice Reader', status: true, detail: `${invoiceReader.totalUploads} uploads processed` },
            { label: 'Saved Reports', status: true, detail: `${reports.saved} reports` },
            { label: 'Exceptions Queue', status: exceptions.open === 0, detail: exceptions.open > 0 ? `${exceptions.open} open` : 'All clear' },
          ].map(svc => (
            <div key={svc.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(241,245,249,0.5)' }}>
              <StatusDot color={svc.status ? '#10b981' : '#f59e0b'} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{svc.label}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{svc.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Who's Online ───────────────────────────────────────── */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Wifi size={15} /> Who's Online
          </span>
          <div className="badge" style={{ fontSize: 11, background: '#10b981', color: '#fff', fontWeight: 700 }}>
            {activeSessions?.length || 0} active
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          {(!activeSessions || activeSessions.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
              No active users in the last 15 minutes
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {activeSessions.map(s => (
                <div key={s.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, border: '1px solid #e2e8f0', background: '#fafbfc',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: s.roleColor || '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 14, textTransform: 'uppercase',
                  }}>
                    {s.name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.name}</span>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0,
                        boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      {s.role} · {s.lastAction} {s.lastResource?.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                      {s.ipAddress && `${s.ipAddress} · `}<TimeAgo date={s.lastActivity} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Node.js / System Stats ──────────────────────────── */}
      {system && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
          {/* Process & Memory */}
          <div className="page-card">
            <div className="page-card-header">
              <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Server size={15} /> Node.js Process
              </span>
              <span className="badge badge-green">{system.env}</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Node Version</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{system.nodeVersion}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>PID</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{system.pid}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Process Uptime</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtUptime(system.processUptime)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Environment</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{system.env}</div>
                </div>
              </div>
              {/* Heap gauge */}
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Heap Usage</span>
                  <span style={{ fontWeight: 800, color: heapPct > 85 ? '#ef4444' : heapPct > 60 ? '#f59e0b' : '#10b981' }}>{heapPct}%</span>
                </div>
                <div style={{ height: 10, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6, transition: 'width 0.3s',
                    width: `${heapPct}%`,
                    background: heapPct > 85 ? '#ef4444' : heapPct > 60 ? '#f59e0b' : '#10b981',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  <span>Used: {fmtBytes(system.processMemory.heapUsed)}</span>
                  <span>Limit: {fmtBytes(heapLimit)}</span>
                </div>
              </div>
              {/* RSS + External */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14, padding: '12px 0 0', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{fmtBytes(system.processMemory.rss)}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>RSS</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{fmtBytes(system.processMemory.external)}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>External</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{fmtBytes(system.processMemory.arrayBuffers || 0)}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Buffers</div>
                </div>
              </div>
            </div>
          </div>

          {/* OS / Hardware */}
          <div className="page-card">
            <div className="page-card-header">
              <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Activity size={15} /> Host System
              </span>
              <span style={{ fontSize: 12 }}>{system.hostname}</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Platform</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{system.platform}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>CPU Cores</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{system.cpus}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>CPU Model</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{system.cpuModel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>System Uptime</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtUptime(system.systemUptime)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Load Average (1/5/15m)</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {system.loadAvg.map(v => v.toFixed(2)).join(' / ')}
                  </div>
                </div>
              </div>
              {/* System Memory gauge */}
              {(() => {
                const usedMem = system.totalMemory - system.freeMemory;
                const memPct = Math.round((usedMem / system.totalMemory) * 100);
                return (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>System Memory</span>
                      <span style={{ fontWeight: 800, color: memPct > 90 ? '#ef4444' : memPct > 70 ? '#f59e0b' : '#10b981' }}>{memPct}%</span>
                    </div>
                    <div style={{ height: 10, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 6, transition: 'width 0.3s',
                        width: `${memPct}%`,
                        background: memPct > 90 ? '#ef4444' : memPct > 70 ? '#f59e0b' : '#10b981',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      <span>Used: {fmtBytes(usedMem)}</span>
                      <span>Total: {fmtBytes(system.totalMemory)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts Row ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {/* Audit Activity Timeline */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Activity size={15} /> Audit Activity (14 Days)
            </span>
            <span style={{ fontSize: 12 }}>{audit.month} events this month</span>
          </div>
          <div style={{ padding: '16px 12px 8px' }}>
            {auditTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={auditTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Creates" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Updates" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Deletes" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No audit data yet</div>
            )}
          </div>
        </div>

        {/* User Distribution by Role */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Shield size={15} /> Users by Role
            </span>
            <span style={{ fontSize: 12 }}>{users.total} total users</span>
          </div>
          <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={roleChartData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {roleChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {roleChartData.map(r => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 3, background: r.fill, flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, flex: 1 }}>{r.name}</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Most Active Resources + Top Active Users Row ────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {/* Most Active Resources */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Database size={15} /> Most Active Resources (7 Days)
            </span>
          </div>
          <div style={{ padding: '16px 12px 8px' }}>
            {resourceBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resourceBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="resource" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No activity yet</div>
            )}
          </div>
        </div>

        {/* Top Active Users */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Zap size={15} /> Top Active Users (7 Days)
            </span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {audit.topActiveUsers.length > 0 ? (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>User</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                    <th style={{ width: 160 }}>Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.topActiveUsers.map((u, i) => {
                    const maxActions = audit.topActiveUsers[0]?.actions || 1;
                    return (
                      <tr key={u.email}>
                        <td style={{ fontWeight: 800, color: i < 3 ? '#3b82f6' : '#94a3b8', textAlign: 'center' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{u.actions}</td>
                        <td>
                          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(u.actions / maxActions) * 100}%`, background: '#3b82f6', borderRadius: 3 }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No user activity yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity + Recent Logins ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {/* Recent Audit Trail */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <FileText size={15} /> Recent Audit Trail
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit-log')}
              style={{ fontSize: 11, color: '#93c5fd' }}>
              View All <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {audit.recent.length > 0 ? (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>User</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.recent.map(ev => {
                    const badge = ACTION_BADGE[ev.action] || { cls: 'badge badge-gray', label: ev.action };
                    return (
                      <tr key={ev.audit_log_id}>
                        <td><span className={badge.cls}>{badge.label}</span></td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{ev.resource}</span>
                          {ev.resource_id && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>#{ev.resource_id}</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>{ev.display_name || '—'}</td>
                        <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          <TimeAgo date={ev.created_at} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No audit events yet</div>
            )}
          </div>
        </div>

        {/* Recent Logins */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <UserCheck size={15} /> Recent Logins
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/users')}
              style={{ fontSize: 11, color: '#93c5fd' }}>
              All Users <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {users.recentLogins.length > 0 ? (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.recentLogins.map(u => (
                    <tr key={u.users_id} onClick={() => navigate(`/users/${u.users_id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.display_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'Active' ? 'badge-green' : u.status === 'Suspended' ? 'badge-red' : 'badge-gray'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        <TimeAgo date={u.last_login} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No login activity yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Workflows + Email / Exceptions Row ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {/* Recent Workflows */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <GitBranch size={15} /> Recent Workflows
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workflows')}
              style={{ fontSize: 11, color: '#93c5fd' }}>
              View All <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {workflows.recent.length > 0 ? (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Triggered By</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.recent.map(w => {
                    const wBadge = WORKFLOW_BADGE[w.status] || { cls: 'badge badge-gray', label: w.status };
                    return (
                      <tr key={w.workflow_runs_id}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{w.workflow_name || w.workflow_key}</td>
                        <td><span className={wBadge.cls}>{wBadge.label}</span></td>
                        <td style={{ fontSize: 12 }}>{w.triggered_by_name || '—'}</td>
                        <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          <TimeAgo date={w.started_at} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No workflow runs yet</div>
            )}
          </div>
        </div>

        {/* Failed Emails + Exceptions Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Failed Emails */}
          <div className="page-card">
            <div className="page-card-header">
              <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <MailX size={15} /> Failed Emails
              </span>
              <span className={`badge ${email.failed > 0 ? 'badge-red' : 'badge-green'}`}>
                {email.failed > 0 ? `${email.failed} failed` : 'All clear'}
              </span>
            </div>
            {email.recentFailed.length > 0 ? (
              <div style={{ padding: '0' }}>
                {email.recentFailed.map(e => (
                  <div key={e.email_log_id} style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{e.to_address}</span>
                      <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}><TimeAgo date={e.created_at} /></span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: 2 }}>{e.subject}</div>
                    {e.error_message && <div style={{ color: '#ef4444', marginTop: 2, fontSize: 11 }}>{e.error_message}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                <CheckCircle2 size={20} style={{ margin: '0 auto 8px', display: 'block' }} color="#10b981" />
                No failed emails
              </div>
            )}
          </div>

          {/* Invoice Reader Exceptions */}
          <div className="page-card">
            <div className="page-card-header">
              <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle size={15} /> Reader Exceptions
              </span>
              <span className={`badge ${exceptions.open > 0 ? 'badge-orange' : 'badge-green'}`}>
                {exceptions.open > 0 ? `${exceptions.open} open` : 'All resolved'}
              </span>
            </div>
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: exceptions.open > 0 ? '#f59e0b' : '#10b981' }}>{exceptions.open}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Open</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{exceptions.resolved}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Resolved</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#94a3b8' }}>{exceptions.ignored}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Ignored</div>
              </div>
            </div>
            <div style={{ padding: '0 20px 14px', textAlign: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reader-exceptions')} style={{ fontSize: 11 }}>
                View Exceptions <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── System Maintenance Tools ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {/* Database Stats */}
        <div className="page-card">
          <div className="page-card-header">
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <HardDrive size={15} /> Database Health
            </span>
            <button className="btn btn-ghost btn-sm" onClick={loadDbStats}
              disabled={dbStatsLoading}
              style={{ fontSize: 11, color: '#93c5fd' }}>
              {dbStatsLoading ? 'Loading...' : dbStats ? 'Refresh' : 'Load Stats'}
            </button>
          </div>
          {dbStats ? (
            <div>
              {/* Connection Pool */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={13} /> Connection Pool
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                  {[
                    { label: 'Used', value: dbStats.pool.used, color: '#3b82f6' },
                    { label: 'Free', value: dbStats.pool.free, color: '#10b981' },
                    { label: 'Pending', value: dbStats.pool.pending, color: '#f59e0b' },
                    { label: 'Total', value: dbStats.pool.total, color: '#0f172a' },
                  ].map(p => (
                    <div key={p.label}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{p.value}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Table sizes */}
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th style={{ textAlign: 'right' }}>Rows</th>
                      <th style={{ textAlign: 'right' }}>Size</th>
                      <th style={{ textAlign: 'right' }}>Dead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbStats.tables.filter(t => !t.name.startsWith('knex_')).map(t => (
                      <tr key={t.name}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{t.name}</td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{t.rows.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{fmtBytes(t.totalBytes)}</td>
                        <td style={{ textAlign: 'right', fontSize: 12, color: t.deadRows > 100 ? '#f59e0b' : '#64748b' }}>
                          {t.deadRows.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Migrations */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Table2 size={13} /> Migrations ({dbStats.migrations.length} applied)
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Latest: <span style={{ fontWeight: 600, color: '#0f172a' }}>{dbStats.migrations[0]?.name || '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              <HardDrive size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
              Click "Load Stats" to view database health
            </div>
          )}
        </div>

        {/* Data Purge + Email Retry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Data Purge */}
          <div className="page-card">
            <div className="page-card-header">
              <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Trash2 size={15} /> Data Purge
              </span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                Remove old records from high-growth tables. Workflow purge only removes completed/failed runs. Notification purge only removes read items.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>Target</label>
                  <select value={purgeTarget} onChange={e => setPurgeTarget(e.target.value)}
                    className="form-input" style={{ fontSize: 12, padding: '6px 10px' }}>
                    <option value="audit_log">Audit Log</option>
                    <option value="email_log">Email Log</option>
                    <option value="notifications">Notifications (read)</option>
                    <option value="workflow_runs">Workflow Runs</option>
                  </select>
                </div>
                <div style={{ width: 100 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>Older than (days)</label>
                  <input type="number" min={7} value={purgeDays}
                    onChange={e => setPurgeDays(parseInt(e.target.value, 10) || 7)}
                    className="form-input" style={{ fontSize: 12, padding: '6px 10px' }} />
                </div>
                <button className="btn btn-danger btn-sm" onClick={handlePurge}
                  disabled={purging} style={{ fontSize: 12 }}>
                  <Trash2 size={12} /> {purging ? 'Purging...' : 'Purge'}
                </button>
              </div>
              {purgeResult && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                  background: purgeResult.error ? '#fef2f2' : '#f0fdf4',
                  color: purgeResult.error ? '#dc2626' : '#16a34a',
                  fontWeight: 600,
                }}>
                  {purgeResult.error || `✓ Deleted ${purgeResult.deleted.toLocaleString()} ${purgeResult.target.replace('_', ' ')} records`}
                </div>
              )}
            </div>
          </div>

          {/* Email Retry */}
          <div className="page-card">
            <div className="page-card-header">
              <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <RotateCcw size={15} /> Retry Failed Emails
              </span>
              <span className={`badge ${email.failed > 0 ? 'badge-red' : 'badge-green'}`}>
                {email.failed} failed
              </span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                Re-sends up to 20 failed emails (max 5 retries each). Creates new log entries for each retry attempt.
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleRetryEmails}
                disabled={retrying || email.failed === 0}
                style={{ fontSize: 12 }}>
                <RotateCcw size={12} /> {retrying ? 'Retrying...' : `Retry ${email.failed} Failed Email${email.failed !== 1 ? 's' : ''}`}
              </button>
              {retryResult && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                  background: retryResult.error ? '#fef2f2' : '#f0fdf4',
                  color: retryResult.error ? '#dc2626' : '#16a34a',
                  fontWeight: 600,
                }}>
                  {retryResult.error || `✓ Retried ${retryResult.retried}: ${retryResult.succeeded} succeeded, ${retryResult.failed} still failed`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
