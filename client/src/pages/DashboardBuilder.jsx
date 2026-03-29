import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSavedGraphs, getSavedReports, saveSystemSetting, getSystemSetting } from '../api';
import {
  ArrowLeft, Save, RotateCcw, Plus, X,
  Settings2, Eye, DollarSign, BarChart2, TrendingUp,
  Landmark, CheckCircle2, PieChart as PieChartIcon, Receipt, Zap, ShieldAlert,
  LifeBuoy, Clock, AlertTriangle, LineChart, FileText, Link2,
  MessageSquare, Maximize2, Minimize2, GripVertical, Columns,
  Square, Trash2, LayoutGrid, Table2, Info, Shield, Download, User,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   Widget Catalog & Defaults
   ═══════════════════════════════════════════════════════════ */
const WIDGET_CATALOG = [
  { type: 'hero_banner', label: 'Spend Overview Banner', icon: DollarSign, category: 'Overview', defaultWidth: 'full', desc: 'Total spend, MRC, NRC, variance, and savings pipeline' },
  { type: 'kpi_cards', label: 'KPI Cards', icon: BarChart2, category: 'Overview', defaultWidth: 'full', desc: 'Key metric cards with click-through navigation', configurable: true },
  { type: 'audit_progress', label: 'Audit Progress Bar', icon: CheckCircle2, category: 'Overview', defaultWidth: 'full', desc: 'Progress bar showing line item audit completion' },
  { type: 'chart_monthly_trend', label: 'Monthly Spend Trend', icon: TrendingUp, category: 'Charts', defaultWidth: 'half', desc: 'Area chart of 6-month invoice spend' },
  { type: 'chart_top_vendors', label: 'Top Vendors by Spend', icon: Landmark, category: 'Charts', defaultWidth: 'half', desc: 'Bar chart of highest-spend vendors' },
  { type: 'chart_audit_status', label: 'Audit Status', icon: CheckCircle2, category: 'Charts', defaultWidth: 'half', desc: 'Pie chart of audit status distribution' },
  { type: 'chart_charge_type', label: 'Spend by Charge Type', icon: PieChartIcon, category: 'Charts', defaultWidth: 'half', desc: 'Pie chart of spend by charge type' },
  { type: 'table_recent_invoices', label: 'Recent Invoices', icon: Receipt, category: 'Tables', defaultWidth: 'half', desc: 'Latest invoices with amounts and status' },
  { type: 'table_savings', label: 'Savings Opportunities', icon: Zap, category: 'Tables', defaultWidth: 'half', desc: 'Open cost savings opportunities' },
  { type: 'table_disputes', label: 'Recent Disputes', icon: ShieldAlert, category: 'Tables', defaultWidth: 'half', desc: 'Latest dispute filings and amounts' },
  { type: 'table_tickets', label: 'Recent Tickets', icon: LifeBuoy, category: 'Tables', defaultWidth: 'half', desc: 'Latest support tickets' },
  { type: 'table_expiring_contracts', label: 'Expiring Contracts', icon: Clock, category: 'Tables', defaultWidth: 'full', desc: 'Contracts expiring within 90 days' },
  { type: 'table_variances', label: 'Billing Variances', icon: AlertTriangle, category: 'Tables', defaultWidth: 'full', desc: 'Recent line item billing variances' },
  { type: 'saved_graph', label: 'Saved Graph', icon: LineChart, category: 'Custom', defaultWidth: 'half', desc: 'Embed a chart from the graph builder', configurable: true, multi: true },
  { type: 'saved_report', label: 'Saved Report', icon: FileText, category: 'Custom', defaultWidth: 'half', desc: 'Embed a report as a mini table', configurable: true, multi: true },
  { type: 'quick_links', label: 'Quick Links', icon: Link2, category: 'Utility', defaultWidth: 'half', desc: 'Custom shortcut links to pages', configurable: true, multi: true },
  { type: 'welcome_message', label: 'Welcome / Note', icon: MessageSquare, category: 'Utility', defaultWidth: 'full', desc: 'Custom greeting or personal notes', configurable: true, multi: true },
];

const DEFAULT_WIDGETS = [
  { id: 'hero', type: 'hero_banner', width: 'full' },
  { id: 'kpis', type: 'kpi_cards', width: 'full', config: { cards: ['vendors', 'contracts', 'inventory', 'locations', 'invoices', 'orders', 'disputes', 'tickets'] } },
  { id: 'trend', type: 'chart_monthly_trend', width: 'half' },
  { id: 'topvendors', type: 'chart_top_vendors', width: 'half' },
  { id: 'auditpie', type: 'chart_audit_status', width: 'half' },
  { id: 'chargetype', type: 'chart_charge_type', width: 'half' },
  { id: 'auditbar', type: 'audit_progress', width: 'full' },
  { id: 'invoices', type: 'table_recent_invoices', width: 'half' },
  { id: 'savings', type: 'table_savings', width: 'half' },
  { id: 'disputes', type: 'table_disputes', width: 'half' },
  { id: 'tickets', type: 'table_tickets', width: 'half' },
  { id: 'expiring', type: 'table_expiring_contracts', width: 'full' },
  { id: 'variances', type: 'table_variances', width: 'full' },
];

const KPI_OPTIONS = [
  { key: 'vendors', label: 'Vendors' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'locations', label: 'Locations' },
  { key: 'invoices', label: 'Open Invoices' },
  { key: 'orders', label: 'Pending Orders' },
  { key: 'disputes', label: 'Open Disputes' },
  { key: 'tickets', label: 'Open Tickets' },
];

const CATEGORIES = ['Overview', 'Charts', 'Tables', 'Custom', 'Utility'];

const CATEGORY_COLORS = {
  Overview: '#3b82f6', Charts: '#10b981', Tables: '#f59e0b', Custom: '#8b5cf6', Utility: '#64748b',
};

let _nextId = 1;
const genId = () => `w_${Date.now()}_${_nextId++}`;

export default function DashboardBuilder() {
  const navigate = useNavigate();
  const { user, updatePreferences, isAdmin } = useAuth();

  const [widgets, setWidgets] = useState([]);
  const [graphs, setGraphs] = useState([]);
  const [reports, setReports] = useState([]);
  const [settings, setSettings] = useState({ autoRefresh: true, refreshInterval: 1, compactMode: false });
  const [configWidgetId, setConfigWidgetId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savedDefault, setSavedDefault] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [loadingDefault, setLoadingDefault] = useState(false);
  const [editingMode, setEditingMode] = useState('user'); // 'user' or 'default'
  const [userBackup, setUserBackup] = useState(null);

  // Load existing layout from preferences
  useEffect(() => {
    const layout = user?.preferences?.dashboardLayout;
    if (layout?.widgets?.length) {
      setWidgets(layout.widgets);
      if (layout.settings) setSettings(s => ({ ...s, ...layout.settings }));
    } else {
      setWidgets(DEFAULT_WIDGETS.map(w => ({ ...w })));
    }
  }, [user]);

  // Load available graphs and reports
  useEffect(() => {
    getSavedGraphs().then(r => setGraphs(r.data || [])).catch(() => {});
    getSavedReports().then(r => setReports(r.data || [])).catch(() => {});
  }, []);

  const addWidget = (catalogItem) => {
    const newWidget = {
      id: genId(),
      type: catalogItem.type,
      width: catalogItem.defaultWidth,
      config: catalogItem.type === 'kpi_cards'
        ? { cards: KPI_OPTIONS.map(k => k.key) }
        : catalogItem.type === 'quick_links'
        ? { links: [] }
        : catalogItem.type === 'welcome_message'
        ? { text: '', color: 'blue' }
        : {},
    };
    setWidgets(w => [...w, newWidget]);
    setDirty(true);
    if (catalogItem.configurable) {
      setTimeout(() => setConfigWidgetId(newWidget.id), 50);
    }
  };

  const removeWidget = (id) => {
    setWidgets(w => w.filter(x => x.id !== id));
    setDirty(true);
    if (configWidgetId === id) setConfigWidgetId(null);
  };

  const toggleWidth = (id) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, width: w.width === 'full' ? 'half' : 'full' } : w));
    setDirty(true);
  };

  const updateWidgetConfig = (id, configUpdate) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, config: { ...w.config, ...configUpdate } } : w));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({ dashboardLayout: { widgets, settings } });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save dashboard layout', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsDefault = async () => {
    setSavingDefault(true);
    try {
      await saveSystemSetting('defaultDashboardLayout', { widgets, settings });
      setSavedDefault(true);
      setTimeout(() => setSavedDefault(false), 2500);
    } catch (e) {
      console.error('Failed to save default dashboard layout', e);
    } finally {
      setSavingDefault(false);
    }
  };

  const handleLoadDefaultTemplate = async () => {
    setLoadingDefault(true);
    try {
      const res = await getSystemSetting('defaultDashboardLayout');
      const layout = res.data?.value;
      if (layout?.widgets?.length) {
        // Back up user's current layout before switching
        setUserBackup({ widgets: [...widgets], settings: { ...settings } });
        setWidgets(layout.widgets);
        if (layout.settings) setSettings(s => ({ ...s, ...layout.settings }));
        setDirty(false);
        setConfigWidgetId(null);
        setEditingMode('default');
      }
    } catch (e) {
      console.error('Failed to load default template', e);
    } finally {
      setLoadingDefault(false);
    }
  };

  const handleSwitchToUser = () => {
    if (userBackup) {
      setWidgets(userBackup.widgets);
      setSettings(userBackup.settings);
    } else {
      const layout = user?.preferences?.dashboardLayout;
      if (layout?.widgets?.length) {
        setWidgets(layout.widgets);
        if (layout.settings) setSettings(s => ({ ...s, ...layout.settings }));
      } else {
        setWidgets(DEFAULT_WIDGETS.map(w => ({ ...w })));
        setSettings({ autoRefresh: true, refreshInterval: 1, compactMode: false });
      }
    }
    setDirty(false);
    setConfigWidgetId(null);
    setEditingMode('user');
  };

  const handleReset = () => {
    setWidgets(DEFAULT_WIDGETS.map(w => ({ ...w })));
    setSettings({ autoRefresh: true, refreshInterval: 1, compactMode: false });
    setDirty(true);
    setConfigWidgetId(null);
  };

  const handleClearCustom = async () => {
    try {
      await updatePreferences({ dashboardLayout: null });
      setWidgets(DEFAULT_WIDGETS.map(w => ({ ...w })));
      setSettings({ autoRefresh: true, refreshInterval: 1, compactMode: false });
      setDirty(false);
      setConfigWidgetId(null);
    } catch (e) {
      console.error('Failed to clear dashboard layout', e);
    }
  };

  const getCatalogItem = (type) => WIDGET_CATALOG.find(c => c.type === type);

  /* ── Drag-and-drop state ────────────────── */
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const dragGhost = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);

  const handleDragStart = useCallback((e, idx) => {
    dragItem.current = idx;
    setDragIdx(idx);

    // Create a styled clone as the drag ghost so the browser shows a full-opacity image
    const el = e.currentTarget;
    const clone = el.cloneNode(true);
    Object.assign(clone.style, {
      position: 'fixed',
      top: '-10000px',
      left: '-10000px',
      width: el.offsetWidth + 'px',
      height: el.offsetHeight + 'px',
      boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
      opacity: '1',
      transform: 'none',
      borderRadius: '12px',
      background: '#fff',
      zIndex: '999999',
      pointerEvents: 'none',
    });
    document.body.appendChild(clone);
    dragGhost.current = clone;
    // Offset from the corner so it centers under the cursor
    e.dataTransfer.setDragImage(clone, el.offsetWidth / 2, el.offsetHeight / 2);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnter = useCallback((idx) => {
    dragOverItem.current = idx;
    setDropIdx(idx);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      setWidgets(prev => {
        const copy = [...prev];
        const [dragged] = copy.splice(dragItem.current, 1);
        copy.splice(dragOverItem.current, 0, dragged);
        return copy;
      });
      setDirty(true);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragIdx(null);
    setDropIdx(null);
    // Clean up ghost clone
    if (dragGhost.current) {
      document.body.removeChild(dragGhost.current);
      dragGhost.current = null;
    }
  }, []);

  /* ── Widget type visual badge ───────────── */
  const TYPE_BADGES = {
    Overview: { icon: LayoutGrid, label: 'Overview' },
    Charts:   { icon: BarChart2,  label: 'Chart' },
    Tables:   { icon: Table2,     label: 'Table' },
    Custom:   { icon: FileText,   label: 'Custom' },
    Utility:  { icon: Info,       label: 'Utility' },
  };

  /* ── Config Panels ────────────────────────── */
  const renderConfigPanel = (widget) => {
    switch (widget.type) {
      case 'kpi_cards':
        return (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 4 }}>Select KPI Cards to Display</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {KPI_OPTIONS.map(opt => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, padding: '6px 8px', borderRadius: 6, background: (widget.config?.cards || []).includes(opt.key) ? '#eff6ff' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={(widget.config?.cards || []).includes(opt.key)}
                    onChange={(e) => {
                      const cards = widget.config?.cards || [];
                      const next = e.target.checked ? [...cards, opt.key] : cards.filter(k => k !== opt.key);
                      updateWidgetConfig(widget.id, { cards: next });
                    }}
                    style={{ accentColor: '#3b82f6' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        );

      case 'saved_graph':
        return (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>Select Saved Graph</div>
            <select
              value={widget.config?.graphId || ''}
              onChange={e => updateWidgetConfig(widget.id, { graphId: Number(e.target.value) || null })}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
            >
              <option value="">— Choose a graph —</option>
              {graphs.map(g => <option key={g.saved_graphs_id} value={g.saved_graphs_id}>{g.name}</option>)}
            </select>
            {graphs.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>No saved graphs yet. Create one from the Graphs page.</div>}
          </div>
        );

      case 'saved_report':
        return (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>Select Saved Report</div>
            <select
              value={widget.config?.reportId || ''}
              onChange={e => updateWidgetConfig(widget.id, { reportId: Number(e.target.value) || null })}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
            >
              <option value="">— Choose a report —</option>
              {reports.map(r => <option key={r.saved_reports_id} value={r.saved_reports_id}>{r.name}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ color: '#475569' }}>Max rows:</span>
              <input
                type="number"
                min={1} max={50}
                value={widget.config?.limit || 10}
                onChange={e => updateWidgetConfig(widget.id, { limit: Math.max(1, Math.min(50, Number(e.target.value) || 10)) })}
                style={{ width: 70, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
            {reports.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>No saved reports yet. Create one from the Reports page.</div>}
          </div>
        );

      case 'quick_links': {
        const links = widget.config?.links || [];
        return (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>Quick Links</div>
            {links.map((link, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="Label"
                  value={link.label}
                  onChange={e => {
                    const next = [...links];
                    next[i] = { ...next[i], label: e.target.value };
                    updateWidgetConfig(widget.id, { links: next });
                  }}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <input
                  placeholder="/path (e.g. /invoices)"
                  value={link.path}
                  onChange={e => {
                    const next = [...links];
                    next[i] = { ...next[i], path: e.target.value };
                    updateWidgetConfig(widget.id, { links: next });
                  }}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                />
                <button onClick={() => {
                  updateWidgetConfig(widget.id, { links: links.filter((_, j) => j !== i) });
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateWidgetConfig(widget.id, { links: [...links, { label: '', path: '/' }] })}
              style={{
                alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 6, border: '1px dashed #94a3b8',
                background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#64748b',
              }}
            >
              <Plus size={12} /> Add Link
            </button>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Tip: Use paths like /invoices, /contracts, /vendors, /reports, /graphs etc.
            </div>
          </div>
        );
      }

      case 'welcome_message':
        return (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>Message Content</div>
            <textarea
              value={widget.config?.text || ''}
              onChange={e => updateWidgetConfig(widget.id, { text: e.target.value })}
              placeholder="Welcome to your dashboard! Add notes, reminders, or a greeting here."
              style={{ minHeight: 80, padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical', lineHeight: 1.5 }}
            />
            <div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Accent Color</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'blue', bg: '#3b82f6' },
                  { key: 'green', bg: '#10b981' },
                  { key: 'purple', bg: '#8b5cf6' },
                  { key: 'orange', bg: '#f59e0b' },
                  { key: 'slate', bg: '#64748b' },
                ].map(c => (
                  <button
                    key={c.key}
                    onClick={() => updateWidgetConfig(widget.id, { color: c.key })}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: widget.config?.color === c.key ? '3px solid #1e293b' : '2px solid #e2e8f0',
                      background: c.bg, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    title={c.key}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ── Render ────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/preferences')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          <ArrowLeft size={16} /> Back to Preferences
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Dashboard Builder</h2>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Customize your home dashboard with widgets, charts, reports, and more</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={14} /> Preview
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button
            className={editingMode === 'default' ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
            onClick={handleSave}
            disabled={!dirty || saving}
            style={editingMode === 'default'
              ? { display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600 }
              : { display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }
            }
          >
            <Save size={14} /> {saving ? 'Saving…' : saved ? 'Saved!' : 'Save My Layout'}
          </button>
          {isAdmin && (
            <button
              className={editingMode === 'default' ? 'btn btn-primary btn-sm' : 'btn btn-sm'}
              onClick={handleSaveAsDefault}
              disabled={!dirty || savingDefault}
              title="Save current layout as the default for all new users"
              style={editingMode === 'default'
                ? { display: 'flex', alignItems: 'center', gap: 6, minWidth: 155 }
                : {
                    display: 'flex', alignItems: 'center', gap: 6, minWidth: 155,
                    background: '#faf5ff', color: '#7c3aed', border: '1.5px solid #c4b5fd',
                    fontWeight: 600,
                  }
              }
            >
              <Shield size={14} /> {savingDefault ? 'Saving…' : savedDefault ? 'Default Saved!' : 'Save as Default'}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Two-panel Layout ═══ */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Left Panel: Widget Catalog ── */}
        <div style={{ width: 300, flexShrink: 0 }}>

          {/* Catalog */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} color="#3b82f6" /> Add Widgets
            </div>

            {CATEGORIES.map(cat => {
              const items = WIDGET_CATALOG.filter(w => w.category === cat);
              return (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
                    color: CATEGORY_COLORS[cat], marginBottom: 6, paddingLeft: 2,
                  }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map(item => {
                      const Icon = item.icon;
                      const alreadyAdded = !item.multi && widgets.some(w => w.type === item.type);
                      return (
                        <button
                          key={item.type}
                          onClick={() => addWidget(item)}
                          disabled={alreadyAdded}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', borderRadius: 8,
                            border: alreadyAdded ? '1px solid #e2e8f0' : '1px solid #e2e8f0',
                            background: alreadyAdded ? '#f8fafc' : '#fff',
                            cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: alreadyAdded ? 0.45 : 1,
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{
                            width: 30, height: 30, borderRadius: 7,
                            background: alreadyAdded ? '#f1f5f9' : '#eff6ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Icon size={15} color={alreadyAdded ? '#94a3b8' : '#3b82f6'} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: alreadyAdded ? '#94a3b8' : '#1e293b' }}>{item.label}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                          </div>
                          {!alreadyAdded && <Plus size={14} color="#3b82f6" style={{ flexShrink: 0 }} />}
                          {alreadyAdded && <span style={{ fontSize: 10, color: '#cbd5e1', flexShrink: 0 }}>Added</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Settings */}
          <div className="card" style={{ padding: '16px 18px', marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings2 size={16} color="#64748b" /> Dashboard Settings
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Auto-refresh */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={e => { setSettings(s => ({ ...s, autoRefresh: e.target.checked })); setDirty(true); }}
                  style={{ accentColor: '#3b82f6' }}
                />
                Auto-refresh dashboard data
              </label>
              {settings.autoRefresh && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, paddingLeft: 26 }}>
                  <span style={{ color: '#64748b' }}>Every</span>
                  <select
                    value={settings.refreshInterval}
                    onChange={e => { setSettings(s => ({ ...s, refreshInterval: Number(e.target.value) })); setDirty(true); }}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                  >
                    <option value={1}>1 min</option>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </div>
              )}

              {/* Compact mode */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={settings.compactMode}
                  onChange={e => { setSettings(s => ({ ...s, compactMode: e.target.checked })); setDirty(true); }}
                  style={{ accentColor: '#3b82f6' }}
                />
                Compact mode (denser layout)
              </label>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4 }}>
                <button
                  onClick={handleClearCustom}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid #fecaca', background: '#fff1f2',
                    cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 600,
                  }}
                >
                  <Trash2 size={13} /> Restore User Template to Default
                </button>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  Removes your custom layout and reverts to the standard dashboard
                </div>
              </div>

              {isAdmin && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4 }}>
                  {editingMode === 'user' ? (
                    <>
                      <button
                        onClick={handleLoadDefaultTemplate}
                        disabled={loadingDefault}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 8,
                          border: '1.5px solid #c4b5fd', background: '#faf5ff',
                          cursor: 'pointer', fontSize: 12, color: '#7c3aed', fontWeight: 600,
                        }}
                      >
                        <Download size={13} /> {loadingDefault ? 'Loading…' : 'Edit Default Template'}
                      </button>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                        Switch to editing the admin-defined default template
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSwitchToUser}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 8,
                          border: '1.5px solid #93c5fd', background: '#eff6ff',
                          cursor: 'pointer', fontSize: 12, color: '#2563eb', fontWeight: 600,
                        }}
                      >
                        <User size={13} /> Back to My Layout
                      </button>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                        Return to editing your personal dashboard layout
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Layout Editor ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card" style={{ padding: '20px 22px', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <Columns size={18} color="#3b82f6" />
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {editingMode === 'default' ? 'Default Template' : 'Your Dashboard Layout'}
              </div>
              <span className="badge badge-blue" style={{ fontSize: 11 }}>{widgets.length} widget{widgets.length !== 1 ? 's' : ''}</span>
              {dirty && <span className="badge badge-orange" style={{ fontSize: 11 }}>Unsaved</span>}

              {/* Mode indicator pill */}
              {editingMode === 'default' ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 12px 4px 6px', borderRadius: 99,
                  background: '#faf5ff', border: '1.5px solid #c4b5fd',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                  }}>
                    <Shield size={13} color="#fff" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>Editing Default</span>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 12px 4px 6px', borderRadius: 99,
                  background: '#eff6ff', border: '1.5px solid #93c5fd',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 12,
                    boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                  }}>
                    {user?.display_name ? user.display_name.charAt(0).toUpperCase() : <User size={13} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>{user?.display_name || 'My Layout'}</span>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Drag to reorder</div>
            </div>

            {widgets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                <Columns size={48} style={{ margin: '0 auto 14px', opacity: 0.25 }} />
                <div style={{ fontWeight: 600, fontSize: 15 }}>No widgets added yet</div>
                <div style={{ fontSize: 13, marginTop: 6, maxWidth: 300, margin: '6px auto 0' }}>
                  Use the widget catalog on the left to build your perfect dashboard
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8,
                background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
                padding: 12, paddingBottom: 14,
                overflow: 'visible',
              }}>
                {widgets.map((widget, idx) => {
                  const cat = getCatalogItem(widget.type);
                  const Icon = cat?.icon || Square;
                  const isOpen = configWidgetId === widget.id;
                  const catColor = cat ? CATEGORY_COLORS[cat.category] || '#94a3b8' : '#94a3b8';
                  const typeBadge = cat ? TYPE_BADGES[cat.category] : null;
                  const TypeIcon = typeBadge?.icon;
                  const isDragging = dragIdx === idx;
                  const isDropTarget = dropIdx === idx && dragIdx !== null && dragIdx !== idx;

                  // Build subtitle
                  let subtitle = cat?.desc || widget.type;
                  if (widget.type === 'saved_graph' && widget.config?.graphId) {
                    const g = graphs.find(g => g.saved_graphs_id === widget.config.graphId);
                    subtitle = g ? g.name : 'Graph not found — please reconfigure';
                  }
                  if (widget.type === 'saved_report' && widget.config?.reportId) {
                    const r = reports.find(r => r.saved_reports_id === widget.config.reportId);
                    subtitle = r ? `${r.name} (${widget.config?.limit || 10} rows)` : 'Report not found — please reconfigure';
                  }
                  if (widget.type === 'kpi_cards') {
                    const count = (widget.config?.cards || []).length;
                    subtitle = `${count} of ${KPI_OPTIONS.length} cards selected`;
                  }
                  if (widget.type === 'quick_links') {
                    const count = (widget.config?.links || []).filter(l => l.label).length;
                    subtitle = count > 0 ? `${count} link${count !== 1 ? 's' : ''} configured` : 'No links configured — click gear to add';
                  }
                  if (widget.type === 'welcome_message') {
                    const text = widget.config?.text || '';
                    subtitle = text ? text.slice(0, 55) + (text.length > 55 ? '…' : '') : 'Click gear to add your message';
                  }

                  const showConfig = isOpen && cat?.configurable;
                  const widthStyle = widget.width === 'full' ? '100%' : 'calc(50% - 4px)';

                  return (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragOver={e => e.preventDefault()}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx(null)}
                      style={{
                        width: widthStyle,
                        opacity: isDragging ? 0.4 : 1,
                        zIndex: isDragging ? 10 : 'auto',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Drop indicator */}
                      {isDropTarget && (
                        <div style={{
                          height: 3, borderRadius: 2, background: '#3b82f6',
                          marginBottom: 4,
                        }} />
                      )}

                      {/* Widget card */}
                      <div style={{
                        borderRadius: showConfig ? '12px 12px 0 0' : 12,
                        border: isOpen ? `2px solid ${catColor}` : `2px solid ${catColor}90`,
                        ...(showConfig ? { borderBottom: 'none' } : {}),
                        background: hoverIdx === idx && !isDragging ? '#fafbfc' : '#fff',
                        boxShadow: hoverIdx === idx && !isDragging
                          ? '0 6px 20px rgba(0,0,0,0.18)'
                          : '0 1px 4px rgba(0,0,0,0.06)',
                        transform: hoverIdx === idx && !isDragging ? 'translateY(-1px)' : 'none',
                        transition: 'all 0.15s ease',
                        cursor: 'grab',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                          {/* Drag handle */}
                          <div style={{ color: '#cbd5e1', flexShrink: 0 }}>
                            <GripVertical size={18} />
                          </div>

                          {/* Widget icon */}
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: `${catColor}12`,
                            border: `1.5px solid ${catColor}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Icon size={20} color={catColor} />
                          </div>

                          {/* Name + subtitle + badges */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{cat?.label || widget.type}</div>
                              {typeBadge && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  padding: '1px 7px', borderRadius: 4,
                                  background: `${catColor}12`, color: catColor,
                                  fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                                }}>
                                  {TypeIcon && <TypeIcon size={9} />}
                                  {typeBadge.label}
                                </span>
                              )}
                              <span style={{
                                padding: '1px 6px', borderRadius: 4,
                                background: widget.width === 'full' ? '#dbeafe' : '#f1f5f9',
                                color: widget.width === 'full' ? '#2563eb' : '#64748b',
                                fontSize: 10, fontWeight: 700,
                              }}>
                                {widget.width === 'full' ? 'Full' : 'Half'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
                          </div>

                          {/* Action buttons */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWidth(widget.id); }}
                            title={widget.width === 'full' ? 'Switch to half width' : 'Switch to full width'}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 30, height: 30, borderRadius: 7,
                              border: '1px solid #e2e8f0', background: '#f8fafc',
                              cursor: 'pointer',
                              color: widget.width === 'full' ? '#3b82f6' : '#64748b',
                            }}
                          >
                            {widget.width === 'full' ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                          </button>

                          {cat?.configurable && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfigWidgetId(isOpen ? null : widget.id); }}
                              title="Configure"
                              style={{
                                width: 30, height: 30, borderRadius: 7,
                                border: isOpen ? `1.5px solid ${catColor}` : '1px solid #e2e8f0',
                                background: isOpen ? `${catColor}15` : '#fff',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Settings2 size={14} color={isOpen ? catColor : '#94a3b8'} />
                            </button>
                          )}

                          <button
                            onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                            title="Remove widget"
                            style={{
                              width: 28, height: 28, borderRadius: 6,
                              border: '1px solid #fecaca', background: '#fff5f5',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <X size={14} color="#ef4444" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded config panel */}
                      {showConfig && (
                        <div style={{
                          border: `2px solid ${catColor}`,
                          borderTop: `1px solid ${catColor}30`,
                          borderRadius: '0 0 10px 10px',
                          background: `${catColor}08`,
                        }}>
                          {renderConfigPanel(widget)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
