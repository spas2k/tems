/**
 * @file Interactive graph builder with save/load support.
 * @module CreateGraph
 *
 * Full graph builder: select data source, link tables, configure axes and series,
 * add filters, choose chart type, preview live, and save/load configurations.
 * Reuses the same /reports/catalog and /reports/run API endpoints as CreateReport.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BarChart2, Play, Save, Plus, Trash2, ChevronUp, ChevronDown,
  X, Check, Filter, Layers, Database, AlertCircle,
  RefreshCw, FolderOpen, Settings,
  ChevronRight, ChevronLeft, Link, Info, Search,
  Network, Receipt, Building2, ShoppingCart, DollarSign, ShieldAlert,
  PieChart as PieChartIcon, Tag, CreditCard, MapPin, Ticket, Coins,
  TrendingUp, Activity, Minimize2, Maximize2, Palette, List,
  Download, Eye, ToggleLeft, ToggleRight, Type,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Treemap,
} from 'recharts';
import {
  getReportCatalog, runReport,
  getSavedGraphs, getSavedGraph, saveGraph, updateSavedGraph, deleteSavedGraph,
} from '../api';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';

// ── Operator sets (same as CreateReport) ──────────────────────────────────────
const TEXT_OPS = [
  { op: 'contains', label: 'Contains' }, { op: 'not_contains', label: 'Not contains' },
  { op: 'starts_with', label: 'Starts with' }, { op: 'ends_with', label: 'Ends with' },
  { op: 'equals', label: 'Equals' }, { op: 'not_equals', label: 'Not equals' },
  { op: 'in_set', label: 'In set' }, { op: 'not_in_set', label: 'Not in set' },
  { op: 'is_empty', label: 'Is empty' }, { op: 'not_empty', label: 'Not empty' },
];
const SELECT_OPS = [
  { op: 'equals', label: 'Is' }, { op: 'not_equals', label: 'Is not' },
  { op: 'in_set', label: 'In set' }, { op: 'not_in_set', label: 'Not in set' },
  { op: 'is_empty', label: 'Is empty' }, { op: 'not_empty', label: 'Not empty' },
];
const DATE_OPS = [
  { op: 'on', label: 'On' }, { op: 'not_on', label: 'Not on' },
  { op: 'before', label: 'Before' }, { op: 'after', label: 'After' },
  { op: 'between', label: 'Between' },
  { op: 'this_week', label: 'This week' }, { op: 'this_month', label: 'This month' },
  { op: 'this_quarter', label: 'This quarter' }, { op: 'this_year', label: 'This year' },
  { op: 'is_empty', label: 'Is empty' }, { op: 'not_empty', label: 'Not empty' },
];
const NUMBER_OPS = [
  { op: 'equals', label: '= Equals' }, { op: 'not_equals', label: '≠ Not equals' },
  { op: 'gt', label: '> Greater than' }, { op: 'gte', label: '≥ At least' },
  { op: 'lt', label: '< Less than' }, { op: 'lte', label: '≤ At most' },
  { op: 'between', label: 'Between' },
  { op: 'is_empty', label: 'Is empty' }, { op: 'not_empty', label: 'Not empty' },
];
const OPS_BY_TYPE = { text: TEXT_OPS, select: SELECT_OPS, date: DATE_OPS, number: NUMBER_OPS, boolean: SELECT_OPS };
const NO_VALUE_OPS = new Set(['is_empty','not_empty','this_week','this_month','this_quarter','this_year']);
const AGG_FUNCS = ['sum', 'avg', 'min', 'max', 'count'];

const TABLE_ICONS = {
  Network, Receipt, Building2, Layers, FileText: BarChart2, ShoppingCart, ShieldAlert,
  DollarSign, PieChart: PieChartIcon, Database, Tag, CreditCard, MapPin, Ticket,
  CircleDollarSign: Coins,
};

// ── Chart types ───────────────────────────────────────────────────────────────
const CHART_TYPES = [
  { key: 'bar',        label: 'Bar',            icon: BarChart2 },
  { key: 'line',       label: 'Line',           icon: TrendingUp },
  { key: 'area',       label: 'Area',           icon: Activity },
  { key: 'pie',        label: 'Pie / Donut',    icon: PieChartIcon },
  { key: 'scatter',    label: 'Scatter',        icon: Minimize2 },
  { key: 'radar',      label: 'Radar',          icon: Maximize2 },
  { key: 'composed',   label: 'Composed',       icon: Layers },
  { key: 'stacked',    label: 'Stacked Bar',    icon: BarChart2 },
  { key: 'horizontal', label: 'Horizontal Bar', icon: BarChart2 },
  { key: 'treemap',    label: 'Treemap',        icon: BarChart2 },
];

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
  '#eab308', '#dc2626', '#7c3aed', '#db2777', '#0891b2',
];

let _uid = 0;
const uid = () => `g${++_uid}`;

// ── Section header sub-component ──────────────────────────────────────────────
function SectionHeader({ label, icon: Icon, expanded, onToggle, color, count }) {
  return (
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 6,
      padding: '9px 12px', background: 'none', border: 'none', borderBottom: '1px solid #1e293b',
      color: color || '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <Icon size={12} />
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, flex: 1, textAlign: 'left' }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 10, background: color || '#334155', color: '#fff', borderRadius: 8, padding: '1px 6px', fontWeight: 700 }}>{count}</span>}
      {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </button>
  );
}

// ── Filter value input ────────────────────────────────────────────────────────
function FilterValueInput({ field, op, value, onChange }) {
  const NO_VAL = NO_VALUE_OPS.has(op);
  const BETWEEN = op === 'between';
  const IN_SET = op === 'in_set' || op === 'not_in_set';
  const inputStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '4px 7px', color: '#e2e8f0', fontSize: 11, width: '100%', fontFamily: 'inherit' };

  if (NO_VAL) return <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>no value needed</span>;

  if (BETWEEN) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input type={field?.type === 'date' ? 'date' : 'number'} placeholder="From" style={inputStyle}
        value={value?.split('|')[0] || ''} onChange={e => onChange(`${e.target.value}|${value?.split('|')[1] || ''}`)} />
      <input type={field?.type === 'date' ? 'date' : 'number'} placeholder="To" style={inputStyle}
        value={value?.split('|')[1] || ''} onChange={e => onChange(`${value?.split('|')[0] || ''}|${e.target.value}`)} />
    </div>
  );

  if (IN_SET) return (
    <textarea placeholder="one per line" rows={2} style={{ ...inputStyle, resize: 'vertical' }}
      value={(value || '').split(',').join('\n')}
      onChange={e => onChange(e.target.value.split('\n').filter(Boolean).join(','))} />
  );

  if (field?.type === 'select' || field?.type === 'boolean') return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
      <option value="">— Any —</option>
      {(field.options || []).map(o => <option key={o}>{o}</option>)}
    </select>
  );

  if (field?.type === 'date') return <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  if (field?.type === 'number') return <input type="number" placeholder="Value" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  return <input placeholder="Value…" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function CreateGraph() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('reports', 'create');
  const canUpdate = hasPermission('reports', 'update');
  const canDelete = hasPermission('reports', 'delete');

  // ── Catalog ──────────────────────────────────────────────
  const [catalog, setCatalog] = useState(null);
  const [catalogErr, setCatalogErr] = useState(null);

  // ── Graph config ─────────────────────────────────────────
  const [graphName, setGraphName] = useState('Untitled Graph');
  const [graphDesc, setGraphDesc] = useState('');
  const [tableKey, setTableKey] = useState('');
  const [linkedTables, setLinkedTables] = useState([]);
  const [filters, setFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND');
  const [limit, setLimit] = useState(1000);

  // ── Chart config ─────────────────────────────────────────
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState(null);           // {table, field}
  const [yAxes, setYAxes] = useState([]);              // [{id, table, field, agg, color, label, chartType}]
  const [groupByField, setGroupByField] = useState(null); // {table, field} for categorical grouping
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [stacked, setStacked] = useState(false);
  const [smooth, setSmooth] = useState(false);
  const [innerRadius, setInnerRadius] = useState(0);    // For donut charts (0 = pie, >0 = donut)
  const [colorPalette, setColorPalette] = useState([...COLORS]);

  // ── UI state ─────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState({
    source: true, links: true, chart: true, axes: true, filters: false, options: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [expandedFieldTables, setExpandedFieldTables] = useState(new Set());

  // ── Results ──────────────────────────────────────────────
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  // ── Save/load ────────────────────────────────────────────
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState(null);
  const [saveError, setSaveError] = useState('');

  // ── Toast ────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const autoRunPending = useRef(false);
  const pendingConfig = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Load catalog ─────────────────────────────────────────
  useEffect(() => {
    getReportCatalog()
      .then(r => setCatalog(r.data))
      .catch(e => setCatalogErr(e.response?.data?.error || e.message || 'Failed to load catalog'));
  }, []);

  const tables = catalog?.tables || {};
  const rels = catalog?.relationships || {};

  // ── Apply pending config after catalog loads ─────────────
  useEffect(() => {
    if (!catalog || !pendingConfig.current) return;
    applyConfig(pendingConfig.current);
    pendingConfig.current = null;
  }, [catalog]);

  // ── Load saved graphs ────────────────────────────────────
  const loadSaved = useCallback(() => {
    getSavedGraphs()
      .then(r => { setSavedGraphs(r.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // ── Load from URL ────────────────────────────────────────
  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    getSavedGraph(id)
      .then(r => {
        const row = r.data;
        const cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
        pendingConfig.current = cfg;
        setCurrentSavedId(row.saved_graphs_id);
        setGraphName(row.name || 'Untitled Graph');
        setGraphDesc(row.description || '');
        autoRunPending.current = true;
      })
      .catch(() => {});
  }, [searchParams]);

  // ── Selected tables ──────────────────────────────────────
  const selectedTableKeys = useMemo(() => {
    if (!tableKey) return [];
    return [tableKey, ...linkedTables.map(lt => lt.tableKey)];
  }, [tableKey, linkedTables]);

  // ── All fields from selected tables ──────────────────────
  const allFields = useMemo(() => {
    const result = [];
    for (const tk of selectedTableKeys) {
      const td = tables[tk];
      if (td) {
        for (const f of td.fields) {
          result.push({ ...f, table: tk, tableLabel: td.label, uid: `${tk}__${f.key}` });
        }
      }
    }
    return result;
  }, [tables, selectedTableKeys]);

  // ── Categorical fields (for X axis / grouping) ──────────
  const categoricalFields = useMemo(() =>
    allFields.filter(f => f.type === 'text' || f.type === 'select' || f.type === 'date' || f.type === 'boolean'),
    [allFields]
  );

  // ── Numeric fields (for Y axis / measures) ──────────────
  const numericFields = useMemo(() =>
    allFields.filter(f => f.type === 'number' || f.aggregable),
    [allFields]
  );

  // ── Available link targets ───────────────────────────────
  const availableLinks = useMemo(() => {
    if (!tableKey) return {};
    const selected = new Set(selectedTableKeys);
    const links = {};
    for (const tk of selectedTableKeys) {
      for (const n of (rels[tk] || [])) {
        if (!selected.has(n) && tables[n]) {
          if (!links[n]) links[n] = [];
          links[n].push(tk);
        }
      }
    }
    return links;
  }, [rels, tables, selectedTableKeys, tableKey]);

  // ── Table change ─────────────────────────────────────────
  const handleTableChange = useCallback((key) => {
    setTableKey(key);
    setLinkedTables([]);
    setFilters([]);
    setFilterLogic('AND');
    setXAxis(null);
    setYAxes([]);
    setGroupByField(null);
    setResults(null);
    setRunError(null);
    setShowLinkPicker(false);
    setExpandedFieldTables(new Set([key]));
    setActiveSection(p => ({ ...p, source: false, chart: true }));
  }, []);

  // ── Linked tables ────────────────────────────────────────
  const addLinkedTable = (targetTable, joinFrom) => {
    setLinkedTables(prev => [...prev, { id: uid(), tableKey: targetTable, joinFrom }]);
    setShowLinkPicker(false);
    setExpandedFieldTables(prev => new Set([...prev, targetTable]));
  };

  const removeLinkedTable = (id) => {
    const lt = linkedTables.find(l => l.id === id);
    if (!lt) return;
    const removing = new Set([lt.tableKey]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of linkedTables) {
        if (removing.has(other.joinFrom) && !removing.has(other.tableKey)) {
          removing.add(other.tableKey); changed = true;
        }
      }
    }
    setLinkedTables(prev => prev.filter(l => !removing.has(l.tableKey)));
    setFilters(prev => prev.filter(f => !removing.has(f.table)));
    if (xAxis && removing.has(xAxis.table)) setXAxis(null);
    setYAxes(prev => prev.filter(y => !removing.has(y.table)));
    if (groupByField && removing.has(groupByField.table)) setGroupByField(null);
  };

  // ── Filters ──────────────────────────────────────────────
  const addFilter = () => {
    const first = allFields[0];
    if (!first) return;
    setFilters(p => [...p, { id: uid(), table: first.table, field: first.key, op: 'contains', value: '' }]);
  };
  const updateFilter = (id, patch) => setFilters(p => p.map(f => f.id === id ? { ...f, ...patch } : f));
  const removeFilter = id => setFilters(p => p.filter(f => f.id !== id));

  // ── Y-Axis series management ─────────────────────────────
  const addYAxis = () => {
    const first = numericFields[0] || allFields[0];
    if (!first) return;
    const idx = yAxes.length;
    const hasNumeric = numericFields.length > 0;
    setYAxes(p => [...p, {
      id: uid(), table: first.table, field: first.key,
      agg: hasNumeric ? 'sum' : 'count', color: COLORS[idx % COLORS.length],
      label: '', chartType: chartType === 'composed' ? 'bar' : null,
    }]);
  };

  const updateYAxis = (id, patch) => setYAxes(p => p.map(y => y.id === id ? { ...y, ...patch } : y));
  const removeYAxis = id => setYAxes(p => p.filter(y => y.id !== id));

  // ── Resolve field def ────────────────────────────────────
  const resolveFieldDef = (table, field) => {
    const td = tables[table];
    return td?.fields?.find(f => f.key === field) || null;
  };

  // ── Build query config ───────────────────────────────────
  const buildConfig = useCallback(() => ({
    configType: 'graph',
    tableKey, linkedTables: linkedTables.map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
    filters: filters.map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
    filterLogic, limit,
    chartType, xAxis, yAxes: yAxes.map(y => ({
      table: y.table, field: y.field, agg: y.agg, color: y.color, label: y.label, chartType: y.chartType,
    })),
    groupByField, showLegend, showGrid, stacked, smooth, innerRadius, colorPalette,
  }), [tableKey, linkedTables, filters, filterLogic, limit, chartType, xAxis, yAxes, groupByField, showLegend, showGrid, stacked, smooth, innerRadius, colorPalette]);

  // ── Apply config ─────────────────────────────────────────
  const applyConfig = useCallback((cfg) => {
    setTableKey(cfg.tableKey || '');
    setLinkedTables((cfg.linkedTables || []).map(lt => ({ ...lt, id: uid() })));
    setFilters((cfg.filters || []).map(f => ({ ...f, id: uid() })));
    setFilterLogic(cfg.filterLogic || 'AND');
    setLimit(cfg.limit || 1000);
    setChartType(cfg.chartType || 'bar');
    setXAxis(cfg.xAxis || null);
    setYAxes((cfg.yAxes || []).map((y, i) => ({ ...y, id: uid(), color: y.color || COLORS[i % COLORS.length] })));
    setGroupByField(cfg.groupByField || null);
    setShowLegend(cfg.showLegend !== false);
    setShowGrid(cfg.showGrid !== false);
    setStacked(cfg.stacked || false);
    setSmooth(cfg.smooth || false);
    setInnerRadius(cfg.innerRadius || 0);
    if (cfg.colorPalette) setColorPalette(cfg.colorPalette);
    setResults(null);
    setRunError(null);
    if (autoRunPending.current) {
      autoRunPending.current = false;
      setTimeout(() => document.getElementById('graph-run-btn')?.click(), 300);
    }
  }, []);

  // ── Run query ────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!tableKey || !xAxis || yAxes.length === 0) return;
    setRunning(true); setRunError(null); setResults(null);
    try {
      // Build groupBy from xAxis (+ optional groupByField)
      const groupBy = [{ table: xAxis.table, field: xAxis.field }];
      if (groupByField) groupBy.push({ table: groupByField.table, field: groupByField.field });

      // Build aggregations from yAxes
      const aggregations = yAxes.map(y => ({ table: y.table, field: y.field, func: y.agg || 'sum' }));

      const res = await runReport({
        tableKey,
        linkedTables: linkedTables.map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
        fields: [],
        filters: filters.map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
        filterLogic,
        sorts: [],
        groupBy,
        aggregations,
        limit: Math.min(limit, 10000),
        offset: 0,
        distinct: false,
      });
      setResults(res.data);
    } catch (e) {
      setRunError(e.response?.data?.error || e.message || 'Query failed');
    } finally { setRunning(false); }
  }, [tableKey, linkedTables, filters, filterLogic, xAxis, yAxes, groupByField, limit]);

  // ── Save / load ──────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaveLoading(true); setSaveError('');
    try {
      const cfg = buildConfig();
      if (currentSavedId) {
        await updateSavedGraph(currentSavedId, { name: graphName, description: graphDesc, config: cfg });
        showToast('Graph updated');
      } else {
        const res = await saveGraph({ name: graphName, description: graphDesc, config: cfg });
        setCurrentSavedId(res.data.saved_graphs_id);
        showToast('Graph saved');
      }
      setSaveModal(false); loadSaved();
    } catch (e) {
      setSaveError(e.response?.data?.error || e.message || 'Save failed');
    } finally { setSaveLoading(false); }
  }, [buildConfig, currentSavedId, graphName, graphDesc, showToast, loadSaved]);

  const handleDeleteSaved = useCallback(async (id) => {
    if (!(await confirm('Delete this saved graph?'))) return;
    await deleteSavedGraph(id);
    if (currentSavedId === id) setCurrentSavedId(null);
    loadSaved(); showToast('Deleted', 'error');
  }, [currentSavedId, loadSaved, showToast, confirm]);

  const toggleSection = k => setActiveSection(p => ({ ...p, [k]: !p[k] }));

  const handleClear = useCallback(() => {
    setTableKey('');
    setLinkedTables([]);
    setFilters([]);
    setFilterLogic('AND');
    setLimit(1000);
    setChartType('bar');
    setXAxis(null);
    setYAxes([]);
    setGroupByField(null);
    setShowLegend(true);
    setShowGrid(true);
    setStacked(false);
    setSmooth(false);
    setInnerRadius(0);
    setResults(null);
    setRunError(null);
    setCurrentSavedId(null);
    setGraphName('Untitled Graph');
    setGraphDesc('');
    setShowLinkPicker(false);
    setExpandedFieldTables(new Set());
    setActiveSection({ source: true, links: true, chart: true, axes: true, filters: false, options: false });
  }, []);

  // ── Chart data transformation ────────────────────────────
  const chartData = useMemo(() => {
    if (!results?.data?.length || !xAxis) return [];
    const xResultKey = results.fields?.find(f => f.key.includes(xAxis.field))?.key || xAxis.field;

    return results.data.map(row => {
      const entry = { _x: row[xResultKey] ?? row[xAxis.field] ?? '' };
      yAxes.forEach((y, i) => {
        const yResultKey = results.fields?.find(f =>
          f.key.includes(y.field) && f.key.includes(y.agg)
        )?.key || `${y.agg}_${y.table}__${y.field}`;
        entry[`y${i}`] = Number(row[yResultKey] ?? row[`${y.agg}_${y.field}`] ?? 0);
      });
      return entry;
    }).sort((a, b) => {
      if (typeof a._x === 'string') return a._x.localeCompare(b._x);
      return (a._x || 0) - (b._x || 0);
    });
  }, [results, xAxis, yAxes]);

  // ── Pie chart data (special case) ────────────────────────
  const pieData = useMemo(() => {
    if (chartType !== 'pie' || !chartData.length) return [];
    return chartData.map((d, i) => ({
      name: String(d._x || `Item ${i + 1}`),
      value: d.y0 || 0,
      color: colorPalette[i % colorPalette.length],
    }));
  }, [chartType, chartData, colorPalette]);

  // ── Render chart ─────────────────────────────────────────
  const renderChart = () => {
    if (!chartData.length) return null;
    const h = 420;
    const axisStyle = { fontSize: 11, fill: '#64748b' };
    const tooltipStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' };
    const gridProps = showGrid ? { stroke: '#e2e8f0', strokeDasharray: '3 3' } : { stroke: 'transparent' };

    const xLabel = xAxis ? (resolveFieldDef(xAxis.table, xAxis.field)?.label || xAxis.field) : '';
    const seriesLabels = yAxes.map((y, i) => y.label || resolveFieldDef(y.table, y.field)?.label || y.field);

    // PIE
    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={innerRadius} outerRadius="80%"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#94a3b8' }}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // TREEMAP
    if (chartType === 'treemap') {
      const tmData = chartData.map((d, i) => ({
        name: String(d._x || `Item ${i + 1}`),
        size: d.y0 || 0,
        fill: colorPalette[i % colorPalette.length],
      }));
      return (
        <ResponsiveContainer width="100%" height={h}>
          <Treemap data={tmData} dataKey="size" nameKey="name"
            stroke="#f8fafc" fill="#3b82f6">
            <Tooltip contentStyle={tooltipStyle} />
          </Treemap>
        </ResponsiveContainer>
      );
    }

    // RADAR
    if (chartType === 'radar') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="_x" tick={axisStyle} />
            <PolarRadiusAxis tick={axisStyle} />
            {yAxes.map((y, i) => (
              <Radar key={y.id} name={seriesLabels[i]} dataKey={`y${i}`}
                stroke={y.color} fill={y.color} fillOpacity={0.25} />
            ))}
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    // SCATTER
    if (chartType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <ScatterChart>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="_x" name={xLabel} tick={axisStyle} />
            <YAxis tick={axisStyle} />
            {yAxes.map((y, i) => (
              <Scatter key={y.id} name={seriesLabels[i]} data={chartData} dataKey={`y${i}`}
                fill={y.color} />
            ))}
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    // COMPOSED (each series can have its own chart type)
    if (chartType === 'composed') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <ComposedChart data={chartData}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="_x" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            {yAxes.map((y, i) => {
              const ct = y.chartType || 'bar';
              if (ct === 'line') return <Line key={y.id} name={seriesLabels[i]} dataKey={`y${i}`} stroke={y.color} strokeWidth={2} dot={false} type={smooth ? 'monotone' : 'linear'} />;
              if (ct === 'area') return <Area key={y.id} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stroke={y.color} fillOpacity={0.2} type={smooth ? 'monotone' : 'linear'} />;
              return <Bar key={y.id} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stackId={stacked ? 'stack' : undefined} radius={[3, 3, 0, 0]} />;
            })}
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // BAR / STACKED / HORIZONTAL / LINE / AREA
    const isHorizontal = chartType === 'horizontal';
    const ChartWrapper = (chartType === 'line') ? LineChart
      : (chartType === 'area') ? AreaChart
      : BarChart;

    return (
      <ResponsiveContainer width="100%" height={h}>
        <ChartWrapper data={chartData} layout={isHorizontal ? 'vertical' : 'horizontal'}>
          <CartesianGrid {...gridProps} />
          {isHorizontal ? (
            <>
              <YAxis dataKey="_x" type="category" tick={axisStyle} width={120} />
              <XAxis type="number" tick={axisStyle} />
            </>
          ) : (
            <>
              <XAxis dataKey="_x" tick={axisStyle} />
              <YAxis tick={axisStyle} />
            </>
          )}
          {yAxes.map((y, i) => {
            if (chartType === 'line') return <Line key={y.id} name={seriesLabels[i]} dataKey={`y${i}`} stroke={y.color} strokeWidth={2} dot={{ r: 3 }} type={smooth ? 'monotone' : 'linear'} />;
            if (chartType === 'area') return <Area key={y.id} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stroke={y.color} fillOpacity={0.2} stackId={stacked ? 'stack' : undefined} type={smooth ? 'monotone' : 'linear'} />;
            return <Bar key={y.id} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stackId={(stacked || chartType === 'stacked') ? 'stack' : undefined} radius={isHorizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} />;
          })}
          <Tooltip contentStyle={tooltipStyle} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </ChartWrapper>
      </ResponsiveContainer>
    );
  };

  // ── Render guards ────────────────────────────────────────
  if (catalogErr) return (
    <div className="page-card" style={{ padding: 40, textAlign: 'center' }}>
      <AlertCircle size={36} color="var(--text-error)" style={{ marginBottom: 12 }} />
      <p style={{ color: 'var(--text-error)', fontSize: 14 }}>{catalogErr}</p>
    </div>
  );
  if (!catalog) return (
    <div className="page-card" style={{ padding: 40, textAlign: 'center' }}>
      <RefreshCw size={32} color="var(--text-faint)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading graph builder…</p>
    </div>
  );

  const canRun = tableKey && xAxis && yAxes.length > 0;

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 80px)', minHeight: 640, position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--bg-error)' : 'var(--bg-success)',
          color: toast.type === 'error' ? 'var(--text-error)' : 'var(--text-success)',
          border: `1px solid ${toast.type === 'error' ? 'var(--bg-error-border)' : 'var(--bg-success-border)'}`,
          padding: '10px 18px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────── */}
      <div style={{
        background: '#1e3a5f', color: '#bfdbfe', padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        borderRadius: '12px 12px 0 0',
      }}>
        <button onClick={() => navigate('/reports')} title="All Reports"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 10px', color: '#bfdbfe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'inherit', flexShrink: 0 }}>
          <List size={13} /> All Reports
        </button>
        <BarChart2 size={18} color="#60a5fa" />
        <input value={graphName} onChange={e => setGraphName(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 16, fontWeight: 700, minWidth: 180, flex: 1, borderBottom: '1px solid transparent' }}
          onFocus={e => (e.target.style.borderBottomColor = '#60a5fa')}
          onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
          placeholder="Graph Name…" />
        {currentSavedId && (
          <span style={{ fontSize: 11, color: '#93c5fd', background: 'rgba(59,130,246,0.2)', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>Saved</span>
        )}

        <button onClick={() => setShowSaved(p => !p)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 11px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
          <FolderOpen size={13} /> Saved{savedGraphs.length ? ` (${savedGraphs.length})` : ''}
        </button>
        {tableKey && (currentSavedId ? canUpdate : canCreate) && (
          <button onClick={() => setSaveModal(true)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 11px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            <Save size={13} /> Save
          </button>
        )}
        {tableKey && (
          <button onClick={handleClear}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 11px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            <X size={13} /> Clear
          </button>
        )}
        <button id="graph-run-btn" onClick={handleRun} disabled={!canRun || running}
          style={{
            background: canRun ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#334155',
            border: 'none', borderRadius: 7, padding: '6px 16px', color: '#fff', cursor: canRun && !running ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
            boxShadow: canRun ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
          }}>
          {running
            ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
            : <><Play size={13} fill="currentColor" /> Build Graph</>}
        </button>
      </div>

      {/* Flyout: Saved */}
      {showSaved && (
        <div className="rc-flyout" style={{ position: 'absolute', top: 54, right: 16, zIndex: 300, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', width: 370, maxHeight: 520, overflowY: 'auto' }}>
          <div className="rc-flyout-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
            <span className="rc-flyout-title" style={{ fontWeight: 700, fontSize: 14 }}><FolderOpen size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Saved Graphs</span>
            <button onClick={() => setShowSaved(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>
          {savedGraphs.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No saved graphs yet.</div>}
          {savedGraphs.map(r => (
            <div key={r.saved_graphs_id} className="rc-flyout-item" style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => {
                  const cfg = typeof r.config === 'string' ? JSON.parse(r.config) : r.config;
                  applyConfig(cfg); setCurrentSavedId(r.saved_graphs_id); setGraphName(r.name); setGraphDesc(r.description || ''); setShowSaved(false); showToast(`Loaded: ${r.name}`);
                }}>
                <div className="rc-flyout-item-title" style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                {r.description && <div className="rc-flyout-item-desc" style={{ fontSize: 12, marginTop: 1 }}>{r.description}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
                  {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : ''}{r.created_by_name ? ` · ${r.created_by_name}` : ''}
                </div>
              </div>
              {canDelete && <button onClick={() => handleDeleteSaved(r.saved_graphs_id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>}
            </div>
          ))}
        </div>
      )}

      {/* Save modal */}
      {saveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSaveModal(false)}>
          <div onClick={e => e.stopPropagation()} className="page-card" style={{ borderRadius: 14, padding: 28, width: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{currentSavedId ? 'Update Graph' : 'Save Graph'}</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Name</label>
              <input className="form-input" value={graphName} onChange={e => setGraphName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
              <textarea className="form-input" rows={2} value={graphDesc} onChange={e => setGraphDesc(e.target.value)} />
            </div>
            {saveError && <div style={{ color: 'var(--text-error)', fontSize: 12, marginBottom: 12 }}>{saveError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setSaveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveLoading || !graphName.trim()}>
                {saveLoading ? 'Saving…' : (currentSavedId ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>

        {/* ── Left Sidebar ─────────────────────────────────── */}
        <div style={{
          width: sidebarCollapsed ? 36 : 330, flexShrink: 0,
          background: '#0f172a', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', transition: 'width 0.25s', borderRight: '1px solid #1e293b',
        }}>
          <button onClick={() => setSidebarCollapsed(p => !p)} style={{
            background: '#1e293b', border: 'none', borderBottom: '1px solid #334155',
            color: '#64748b', padding: '7px', cursor: 'pointer',
            display: 'flex', justifyContent: 'center', flexShrink: 0,
          }} title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {!sidebarCollapsed && (
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* 1. Data Source */}
              <SectionHeader label="1. DATA SOURCE" icon={Database} expanded={activeSection.source} onToggle={() => toggleSection('source')} color="#60a5fa" count={tableKey ? 1 : 0} />
              {!activeSection.source && tableKey && tables[tableKey] && (() => {
                const td = tables[tableKey];
                const Icon = TABLE_ICONS[td.icon] || Database;
                return (
                  <div style={{ padding: '6px 10px' }}>
                    <button onClick={() => toggleSection('source')} style={{
                      background: td.color, border: `1.5px solid ${td.color}`,
                      borderRadius: 8, padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
                      color: '#fff', width: '100%', transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={13} />
                        <span style={{ fontWeight: 700, fontSize: 12, flex: 1 }}>{td.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>{td.fields.length}f</span>
                      </div>
                    </button>
                  </div>
                );
              })()}
              {activeSection.source && (
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {Object.values(tables).map(td => {
                    const Icon = TABLE_ICONS[td.icon] || Database;
                    const sel = tableKey === td.key;
                    return (
                      <button key={td.key} onClick={() => handleTableChange(td.key)} style={{
                        background: sel ? td.color : '#1e293b',
                        border: `1.5px solid ${sel ? td.color : '#334155'}`,
                        borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                        color: sel ? '#fff' : '#94a3b8', transition: 'all 0.15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon size={13} />
                          <span style={{ fontWeight: 700, fontSize: 12, flex: 1 }}>{td.label}</span>
                          <span style={{ fontSize: 10, opacity: 0.6 }}>{td.fields.length}f</span>
                        </div>
                        {sel && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 1.4 }}>{td.description}</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. Linked Data Sources */}
              {tableKey && (
                <>
                  <SectionHeader label="2. LINKED DATA" icon={Link} expanded={activeSection.links} onToggle={() => toggleSection('links')} color="#38bdf8" count={linkedTables.length} />
                  {activeSection.links && (
                    <div style={{ padding: 10 }}>
                      {linkedTables.length === 0 && (
                        <div style={{ fontSize: 12, color: '#475569', padding: '4px 0 8px', lineHeight: 1.5 }}>
                          Link additional tables for cross-table graphing.
                        </div>
                      )}
                      {linkedTables.map(lt => {
                        const td = tables[lt.tableKey];
                        if (!td) return null;
                        const Icon = TABLE_ICONS[td.icon] || Database;
                        return (
                          <div key={lt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, background: '#1e293b', borderRadius: 8, padding: '6px 8px' }}>
                            <Icon size={12} color={td.color} />
                            <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, flex: 1 }}>{td.label}</span>
                            <span style={{ fontSize: 10, color: '#475569' }}>via {tables[lt.joinFrom]?.label}</span>
                            <button onClick={() => removeLinkedTable(lt.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><X size={11} /></button>
                          </div>
                        );
                      })}
                      {Object.keys(availableLinks).length > 0 && !showLinkPicker && (
                        <button onClick={() => setShowLinkPicker(true)} style={{
                          background: 'none', border: '1px dashed #334155', borderRadius: 8,
                          padding: '6px 10px', color: '#38bdf8', cursor: 'pointer', fontSize: 11,
                          width: '100%', fontFamily: 'inherit', marginTop: 4,
                        }}><Plus size={11} /> Link Table</button>
                      )}
                      {showLinkPicker && (
                        <div style={{ background: '#1e293b', borderRadius: 8, padding: 8, marginTop: 6, border: '1px solid #334155' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>Available tables:</div>
                          {Object.entries(availableLinks).map(([tKey, sources]) => {
                            const td = tables[tKey];
                            const Icon = TABLE_ICONS[td?.icon] || Database;
                            return (
                              <button key={tKey} onClick={() => addLinkedTable(tKey, sources[0])} style={{
                                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                                background: 'none', border: '1px solid #334155', borderRadius: 6,
                                padding: '5px 8px', color: '#e2e8f0', cursor: 'pointer',
                                marginBottom: 4, fontFamily: 'inherit',
                              }}>
                                <Icon size={12} color={td?.color} />
                                <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>{td?.label}</span>
                                <span style={{ fontSize: 10, color: '#475569' }}>from {tables[sources[0]]?.label}</span>
                              </button>
                            );
                          })}
                          <button onClick={() => setShowLinkPicker(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 10, marginTop: 4 }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 3. Chart Type */}
              {tableKey && (
                <>
                  <SectionHeader label="3. CHART TYPE" icon={BarChart2} expanded={activeSection.chart} onToggle={() => toggleSection('chart')} color="#a78bfa" count={1} />
                  {activeSection.chart && (
                    <div style={{ padding: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                        {CHART_TYPES.map(ct => {
                          const Icon = ct.icon;
                          const sel = chartType === ct.key;
                          return (
                            <button key={ct.key} onClick={() => setChartType(ct.key)} style={{
                              background: sel ? '#3b82f6' : '#1e293b',
                              border: `1.5px solid ${sel ? '#3b82f6' : '#334155'}`,
                              borderRadius: 7, padding: '7px 8px', cursor: 'pointer',
                              color: sel ? '#fff' : '#94a3b8', fontSize: 11, fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                              transition: 'all 0.15s',
                            }}>
                              <Icon size={12} /> {ct.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 4. Axes & Series */}
              {tableKey && (
                <>
                  <SectionHeader label="4. AXES & SERIES" icon={TrendingUp} expanded={activeSection.axes} onToggle={() => toggleSection('axes')} color="#f59e0b" count={yAxes.length} />
                  {activeSection.axes && (
                    <div style={{ padding: 10 }}>
                      {/* X-Axis */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Type size={10} /> {chartType === 'pie' ? 'CATEGORY (slices)' : 'X-AXIS (categories)'}
                        </div>
                        <select value={xAxis ? `${xAxis.table}__${xAxis.field}` : ''} onChange={e => {
                          if (!e.target.value) { setXAxis(null); return; }
                          const [t, ...rest] = e.target.value.split('__');
                          const newX = { table: t, field: rest.join('__') };
                          setXAxis(newX);
                          // Auto-add a COUNT measure if no Y-axes exist yet
                          if (yAxes.length === 0) {
                            setYAxes([{
                              id: uid(), table: t, field: rest.join('__'),
                              agg: 'count', color: COLORS[0],
                              label: 'Count', chartType: chartType === 'composed' ? 'bar' : null,
                            }]);
                          }
                        }} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit' }}>
                          <option value="">Select field…</option>
                          {allFields.map(f => (
                            <option key={f.uid} value={f.uid}>{f.tableLabel} → {f.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Y-Axes (measures) */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <BarChart2 size={10} /> {chartType === 'pie' ? 'VALUE (size)' : 'Y-AXIS (measures)'}
                        </div>
                        {yAxes.map((y, i) => {
                          return (
                            <div key={y.id} style={{ background: '#1e293b', borderRadius: 7, padding: 8, marginBottom: 6, border: `1px solid ${y.color}33` }}>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                <select value={`${y.table}__${y.field}`} onChange={e => {
                                  const [t, ...rest] = e.target.value.split('__');
                                  updateYAxis(y.id, { table: t, field: rest.join('__') });
                                }} style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '4px 6px', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit' }}>
                                  {(y.agg === 'count' ? allFields : allFields.filter(f => f.type === 'number' || f.aggregable)).map(f => (
                                    <option key={f.uid} value={f.uid}>{f.tableLabel} → {f.label}</option>
                                  ))}
                                </select>
                                <select value={y.agg} onChange={e => updateYAxis(y.id, { agg: e.target.value })}
                                  style={{ width: 70, background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '4px 6px', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit' }}>
                                  {AGG_FUNCS.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                                </select>
                                <button onClick={() => removeYAxis(y.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><Trash2 size={11} /></button>
                              </div>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input type="color" value={y.color} onChange={e => updateYAxis(y.id, { color: e.target.value })}
                                  style={{ width: 24, height: 20, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                                <input placeholder="Label (optional)" value={y.label || ''} onChange={e => updateYAxis(y.id, { label: e.target.value })}
                                  style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '3px 6px', color: '#e2e8f0', fontSize: 10, fontFamily: 'inherit' }} />
                                {chartType === 'composed' && (
                                  <select value={y.chartType || 'bar'} onChange={e => updateYAxis(y.id, { chartType: e.target.value })}
                                    style={{ width: 60, background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '3px 6px', color: '#e2e8f0', fontSize: 10, fontFamily: 'inherit' }}>
                                    <option value="bar">Bar</option>
                                    <option value="line">Line</option>
                                    <option value="area">Area</option>
                                  </select>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={addYAxis} style={{
                          background: 'none', border: '1px dashed #334155', borderRadius: 7,
                          padding: '5px 10px', color: '#f59e0b', cursor: 'pointer', fontSize: 11,
                          width: '100%', fontFamily: 'inherit',
                        }}><Plus size={11} /> Add Measure</button>
                      </div>

                      {/* Group By (optional series split) */}
                      {chartType !== 'pie' && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Layers size={10} /> GROUP BY (optional series split)
                          </div>
                          <select value={groupByField ? `${groupByField.table}__${groupByField.field}` : ''} onChange={e => {
                            if (!e.target.value) { setGroupByField(null); return; }
                            const [t, ...rest] = e.target.value.split('__');
                            setGroupByField({ table: t, field: rest.join('__') });
                          }} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit' }}>
                            <option value="">None</option>
                            {categoricalFields.map(f => (
                              <option key={f.uid} value={f.uid}>{f.tableLabel} → {f.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 5. Filters */}
              {tableKey && (
                <>
                  <SectionHeader label="5. FILTERS" icon={Filter} expanded={activeSection.filters} onToggle={() => toggleSection('filters')} color="#ef4444" count={filters.length} />
                  {activeSection.filters && (
                    <div style={{ padding: 10 }}>
                      {filters.length > 1 && (
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                          {['AND', 'OR'].map(l => (
                            <button key={l} onClick={() => setFilterLogic(l)} style={{
                              background: filterLogic === l ? '#3b82f6' : '#1e293b',
                              border: `1px solid ${filterLogic === l ? '#3b82f6' : '#334155'}`,
                              borderRadius: 5, padding: '3px 10px', color: filterLogic === l ? '#fff' : '#94a3b8',
                              cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                            }}>{l}</button>
                          ))}
                        </div>
                      )}
                      {filters.map(f => {
                        const fd = resolveFieldDef(f.table, f.field);
                        const ops = OPS_BY_TYPE[fd?.type] || TEXT_OPS;
                        return (
                          <div key={f.id} style={{ background: '#1e293b', borderRadius: 7, padding: 8, marginBottom: 6 }}>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                              <select value={`${f.table}__${f.field}`} onChange={e => {
                                const [t, ...rest] = e.target.value.split('__');
                                updateFilter(f.id, { table: t, field: rest.join('__'), op: 'contains', value: '' });
                              }} style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '4px 6px', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit' }}>
                                {allFields.map(af => <option key={af.uid} value={af.uid}>{af.tableLabel} → {af.label}</option>)}
                              </select>
                              <button onClick={() => removeFilter(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><Trash2 size={11} /></button>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <select value={f.op} onChange={e => updateFilter(f.id, { op: e.target.value })}
                                style={{ width: 100, background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '4px 6px', color: '#e2e8f0', fontSize: 10, fontFamily: 'inherit' }}>
                                {ops.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
                              </select>
                              <div style={{ flex: 1 }}>
                                <FilterValueInput field={fd} op={f.op} value={f.value} onChange={v => updateFilter(f.id, { value: v })} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={addFilter} style={{
                        background: 'none', border: '1px dashed #334155', borderRadius: 7,
                        padding: '5px 10px', color: '#ef4444', cursor: 'pointer', fontSize: 11,
                        width: '100%', fontFamily: 'inherit',
                      }}><Plus size={11} /> Add Filter</button>
                    </div>
                  )}
                </>
              )}

              {/* 6. Display Options */}
              {tableKey && (
                <>
                  <SectionHeader label="6. OPTIONS" icon={Settings} expanded={activeSection.options} onToggle={() => toggleSection('options')} color="#64748b" count={0} />
                  {activeSection.options && (
                    <div style={{ padding: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
                          <input type="checkbox" checked={showLegend} onChange={e => setShowLegend(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
                          Show Legend
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
                          <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
                          Show Grid Lines
                        </label>
                        {(chartType === 'bar' || chartType === 'area' || chartType === 'stacked' || chartType === 'composed') && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
                            <input type="checkbox" checked={stacked} onChange={e => setStacked(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
                            Stacked
                          </label>
                        )}
                        {(chartType === 'line' || chartType === 'area' || chartType === 'composed') && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
                            <input type="checkbox" checked={smooth} onChange={e => setSmooth(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
                            Smooth Curves
                          </label>
                        )}
                        {chartType === 'pie' && (
                          <div>
                            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Inner Radius (0 = Pie, &gt;0 = Donut)</label>
                            <input type="range" min={0} max={100} value={innerRadius} onChange={e => setInnerRadius(Number(e.target.value))}
                              style={{ width: '100%', accentColor: '#3b82f6' }} />
                            <span style={{ fontSize: 10, color: '#475569' }}>{innerRadius}px</span>
                          </div>
                        )}
                        <div>
                          <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Max Data Points</label>
                          <input type="number" value={limit} onChange={e => setLimit(Math.max(1, Number(e.target.value)))}
                            style={{ width: 80, background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '4px 7px', color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Main content (chart preview) ─────────────────── */}
        <div className="rc-preview" style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {!tableKey && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)' }}>
              <BarChart2 size={64} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>Graph Builder</div>
              <div style={{ fontSize: 13, maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
                Select a data source from the sidebar, choose a chart type, configure your axes and measures, then click <strong style={{ color: '#22c55e' }}>Build Graph</strong>.
              </div>
            </div>
          )}

          {tableKey && !canRun && !results && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)' }}>
              <Settings size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Configure Your Graph</div>
              <div style={{ fontSize: 12, maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
                {!xAxis && 'Select an X-axis field in the Axes & Series section.'}
                {xAxis && yAxes.length === 0 && 'Add at least one Y-axis measure.'}
              </div>
            </div>
          )}

          {running && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <RefreshCw size={36} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Querying data…</div>
            </div>
          )}

          {runError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <AlertCircle size={24} color="#ef4444" style={{ marginBottom: 8 }} />
              <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>{runError}</div>
            </div>
          )}

          {results && !running && chartData.length > 0 && (
            <div>
              <div className="page-card" style={{ borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{graphName}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{chartData.length} data points · {results.total} total rows</span>
                </div>
                {renderChart()}
              </div>

              {/* Data table preview */}
              <div className="page-card" style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={13} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Data Preview</span>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                          {xAxis ? (resolveFieldDef(xAxis.table, xAxis.field)?.label || xAxis.field) : 'X'}
                        </th>
                        {yAxes.map((y, i) => (
                          <th key={y.id} style={{ padding: '8px 12px', textAlign: 'right', color: y.color, fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                            {y.label || resolveFieldDef(y.table, y.field)?.label || y.field} ({y.agg})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.slice(0, 50).map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 12px', color: 'var(--text-primary)' }}>{String(row._x)}</td>
                          {yAxes.map((y, i) => (
                            <td key={y.id} style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              {typeof row[`y${i}`] === 'number' ? row[`y${i}`].toLocaleString(undefined, { maximumFractionDigits: 2 }) : row[`y${i}`]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {results && !running && chartData.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)' }}>
              <Info size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>No data returned</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters or selecting different fields.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
