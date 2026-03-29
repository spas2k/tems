/**
 * @file Interactive report builder with save/load support.
 * @module CreateReport
 *
 * Full report builder: select type, pick columns, add filters, choose sort, preview results, export to Excel/CSV, and save/load configurations.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText, Play, Save, Download, Plus, Trash2, ChevronUp, ChevronDown,
  X, Check, Filter, SortAsc, SortDesc, Layers, Database, AlertCircle,
  RefreshCw, BookOpen, FolderOpen, Eye, Settings, Grip, Copy,
  ChevronRight, ChevronLeft, BarChart2, Info, Search, Link,
  Network, Receipt, Building2, ShoppingCart, DollarSign, ShieldAlert,
  PieChart, ChevronsUpDown, List, Tag, CreditCard, MapPin, Ticket, Coins,
  Mail, Clock, CheckCircle, Loader, FileDown,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  getReportCatalog, runReport,
  getSavedReports, getSavedReport, saveReport, updateSavedReport, deleteSavedReport,
  createReportJob, getReportJobs, getReportJob, downloadReportJob, deleteReportJob,
} from '../api';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';

// ── Operator sets ─────────────────────────────────────────────────────────────
const TEXT_OPS = [
  { op: 'contains',      label: 'Contains'      },
  { op: 'not_contains',  label: 'Not contains'  },
  { op: 'starts_with',   label: 'Starts with'   },
  { op: 'ends_with',     label: 'Ends with'     },
  { op: 'equals',        label: 'Equals'        },
  { op: 'not_equals',    label: 'Not equals'    },
  { op: 'in_set',        label: 'In set'        },
  { op: 'not_in_set',    label: 'Not in set'    },
  { op: 'is_empty',      label: 'Is empty'      },
  { op: 'not_empty',     label: 'Not empty'     },
];
const SELECT_OPS = [
  { op: 'equals',     label: 'Is'         },
  { op: 'not_equals', label: 'Is not'     },
  { op: 'in_set',     label: 'In set'     },
  { op: 'not_in_set', label: 'Not in set' },
  { op: 'is_empty',   label: 'Is empty'   },
  { op: 'not_empty',  label: 'Not empty'  },
];
const DATE_OPS = [
  { op: 'on',           label: 'On'           },
  { op: 'not_on',       label: 'Not on'       },
  { op: 'before',       label: 'Before'       },
  { op: 'after',        label: 'After'        },
  { op: 'between',      label: 'Between'      },
  { op: 'this_week',    label: 'This week'    },
  { op: 'this_month',   label: 'This month'   },
  { op: 'this_quarter', label: 'This quarter' },
  { op: 'this_year',    label: 'This year'    },
  { op: 'is_empty',     label: 'Is empty'     },
  { op: 'not_empty',    label: 'Not empty'    },
];
const NUMBER_OPS = [
  { op: 'equals',     label: '= Equals'       },
  { op: 'not_equals', label: '≠ Not equals'   },
  { op: 'gt',         label: '> Greater than' },
  { op: 'gte',        label: '≥ At least'     },
  { op: 'lt',         label: '< Less than'    },
  { op: 'lte',        label: '≤ At most'      },
  { op: 'between',    label: 'Between'        },
  { op: 'is_empty',   label: 'Is empty'       },
  { op: 'not_empty',  label: 'Not empty'      },
];
const OPS_BY_TYPE = { text: TEXT_OPS, select: SELECT_OPS, date: DATE_OPS, number: NUMBER_OPS, boolean: SELECT_OPS };
const NO_VALUE_OPS = new Set(['is_empty','not_empty','this_week','this_month','this_quarter','this_year']);
const AGG_FUNCS = ['sum','avg','min','max','count'];

const TABLE_ICONS = {
  Network, Receipt, Building2, Layers, FileText, ShoppingCart, ShieldAlert,
  DollarSign, PieChart, Database, Tag, CreditCard, MapPin, Ticket,
  CircleDollarSign: Coins,
};

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Legacy config conversion ──────────────────────────────────────────────────
const CROSS_TABLE_MAP = {
  account_name:     { table: 'accounts',  field: 'name' },
  contract_number:  { table: 'contracts', field: 'contract_number' },
  order_number:     { table: 'orders',    field: 'order_number' },
  invoice_number:   { table: 'invoices',  field: 'invoice_number' },
  invoice_date:     { table: 'invoices',  field: 'invoice_date' },
  inventoryItem_number:   { table: 'inventory',  field: 'inventory_number' },
  inventoryItem_location: { table: 'inventory',  field: 'location' },
};

function convertLegacyConfig(cfg, catalog) {
  if (!cfg.fields?.length || typeof cfg.fields[0] !== 'string') return cfg;
  const pk = cfg.tableKey;
  const primaryKeys = new Set((catalog.tables[pk]?.fields || []).map(f => f.key));
  const rels = catalog.relationships || {};
  const neededTables = new Set();
  const newFields = [];
  for (const fkey of cfg.fields) {
    if (primaryKeys.has(fkey)) {
      newFields.push({ table: pk, field: fkey });
    } else if (CROSS_TABLE_MAP[fkey] && CROSS_TABLE_MAP[fkey].table !== pk) {
      newFields.push(CROSS_TABLE_MAP[fkey]);
      neededTables.add(CROSS_TABLE_MAP[fkey].table);
    }
  }
  const linkedTables = [];
  const selected = new Set([pk]);
  for (const t of neededTables) {
    for (const s of selected) {
      if ((rels[s] || []).includes(t)) { linkedTables.push({ tableKey: t, joinFrom: s }); selected.add(t); break; }
    }
  }
  const convertRef = (fkey) => {
    if (primaryKeys.has(fkey)) return { table: pk, field: fkey };
    if (CROSS_TABLE_MAP[fkey]) return CROSS_TABLE_MAP[fkey];
    return { table: pk, field: fkey };
  };
  return {
    ...cfg, linkedTables, fields: newFields,
    filters: (cfg.filters || []).map(f => ({ ...f, ...convertRef(f.field) })),
    sorts: (cfg.sorts || []).map(s => ({ ...s, ...convertRef(s.field) })),
    groupBy: (cfg.groupBy || []).map(g => typeof g === 'string' ? convertRef(g) : (g.table ? g : convertRef(g.field))),
    aggregations: (cfg.aggregations || []).map(a => a.table ? a : { ...a, ...convertRef(a.field) }),
  };
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ label, icon: Icon, count = 0, expanded, onToggle, color = '#60a5fa' }) {
  return (
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      background: '#1e293b', border: 'none', padding: '10px 14px',
      cursor: 'pointer', color: '#e2e8f0', borderBottom: '1px solid #334155', flexShrink: 0,
    }}>
      {Icon && <Icon size={14} color={color} />}
      <span style={{ flex: 1, fontWeight: 700, fontSize: 12, textAlign: 'left', letterSpacing: 0.5 }}>
        {label}
        {count > 0 && (
          <span style={{ marginLeft: 6, background: color, color: 'var(--text-color)', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>
            {count}
          </span>
        )}
      </span>
      <ChevronRight size={13} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5 }} />
    </button>
  );
}

// ── FilterValueInput ──────────────────────────────────────────────────────────
function FilterValueInput({ field, op, value, onChange }) {
  const NO_VAL  = NO_VALUE_OPS.has(op);
  const BETWEEN = op === 'between';
  const IN_SET  = op === 'in_set' || op === 'not_in_set';
  const [p1, p2] = String(value || '').split('|');
  if (NO_VAL) return <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>no value needed</span>;
  if (BETWEEN) {
    const isDate = field?.type === 'date';
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input className="form-input" type={isDate ? 'date' : 'number'} value={p1 || ''} placeholder="From"
          style={{ fontSize: 12, padding: '4px 8px' }}
          onChange={e => onChange(`${e.target.value}|${p2 || ''}`)} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>–</span>
        <input className="form-input" type={isDate ? 'date' : 'number'} value={p2 || ''} placeholder="To"
          style={{ fontSize: 12, padding: '4px 8px' }}
          onChange={e => onChange(`${p1 || ''}|${e.target.value}`)} />
      </div>
    );
  }
  if (IN_SET) return (
    <textarea className="form-input" placeholder="one per line" rows={3}
      value={(value || '').split(',').join('\n')}
      style={{ fontSize: 12, padding: '4px 8px', resize: 'vertical', fontFamily: 'monospace' }}
      onChange={e => onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean).join(','))} />
  );
  if (field?.type === 'select' || field?.type === 'boolean') {
    const opts = field.options || (field.type === 'boolean' ? ['true','false'] : []);
    return (
      <select className="form-input" value={value || ''} style={{ fontSize: 12, padding: '4px 8px' }}
        onChange={e => onChange(e.target.value)}>
        <option value="">— Any —</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field?.type === 'date') return (
    <input className="form-input" type="date" value={value || ''} style={{ fontSize: 12, padding: '4px 8px' }}
      onChange={e => onChange(e.target.value)} />
  );
  if (field?.type === 'number') return (
    <input className="form-input" type="number" placeholder="Value" value={value || ''} style={{ fontSize: 12, padding: '4px 8px' }}
      onChange={e => onChange(e.target.value)} />
  );
  return (
    <input className="form-input" placeholder="Value…" value={value || ''} style={{ fontSize: 12, padding: '4px 8px' }}
      onChange={e => onChange(e.target.value)} />
  );
}

// ── Cell formatter ────────────────────────────────────────────────────────────
function formatCell(value, fieldMeta) {
  if (value === null || value === undefined) return '—';
  if (fieldMeta?.format === 'currency')
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (fieldMeta?.format === 'date') return String(value).split('T')[0];
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// ── Report templates (multi-table format) ─────────────────────────────────────
const TEMPLATES = [
  {
    name: 'Active InventoryItem Summary',
    description: 'All active inventory with vendor, location, and monthly cost',
    config: {
      tableKey: 'inventory', reportName: 'Active InventoryItem Summary',
      linkedTables: [{ tableKey: 'accounts', joinFrom: 'inventory' }],
      fields: [
        { table: 'inventory', field: 'inventory_number' }, { table: 'accounts', field: 'name' },
        { table: 'inventory', field: 'location' }, { table: 'inventory', field: 'type' },
        { table: 'inventory', field: 'bandwidth' }, { table: 'inventory', field: 'contracted_rate' },
        { table: 'inventory', field: 'status' },
      ],
      filters: [{ id: 't1', table: 'inventory', field: 'status', op: 'equals', value: 'Active' }],
      filterLogic: 'AND', sorts: [{ id: 's1', table: 'inventory', field: 'contracted_rate', direction: 'desc' }],
      groupBy: [], aggregations: [], limit: 1000, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Invoice Aging Report',
    description: 'Open and overdue invoices by vendor with amounts',
    config: {
      tableKey: 'invoices', reportName: 'Invoice Aging Report',
      linkedTables: [{ tableKey: 'accounts', joinFrom: 'invoices' }],
      fields: [
        { table: 'invoices', field: 'invoice_number' }, { table: 'accounts', field: 'name' },
        { table: 'invoices', field: 'invoice_date' }, { table: 'invoices', field: 'due_date' },
        { table: 'invoices', field: 'total_amount' }, { table: 'invoices', field: 'status' },
      ],
      filters: [{ id: 't1', table: 'invoices', field: 'status', op: 'in_set', value: 'Open,Overdue' }],
      filterLogic: 'AND', sorts: [{ id: 's1', table: 'invoices', field: 'due_date', direction: 'asc' }],
      groupBy: [], aggregations: [], limit: 1000, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Billing Variance Analysis',
    description: 'Line items where billed amount differs from contracted rate',
    config: {
      tableKey: 'line_items', reportName: 'Billing Variance Analysis',
      linkedTables: [
        { tableKey: 'invoices', joinFrom: 'line_items' },
        { tableKey: 'accounts', joinFrom: 'invoices' },
        { tableKey: 'inventory', joinFrom: 'line_items' },
      ],
      fields: [
        { table: 'invoices', field: 'invoice_number' }, { table: 'accounts', field: 'name' },
        { table: 'inventory', field: 'inventory_number' }, { table: 'line_items', field: 'description' },
        { table: 'line_items', field: 'amount' }, { table: 'line_items', field: 'contracted_rate' },
        { table: 'line_items', field: 'variance' }, { table: 'line_items', field: 'audit_status' },
      ],
      filters: [{ id: 't1', table: 'line_items', field: 'audit_status', op: 'equals', value: 'Variance' }],
      filterLogic: 'AND', sorts: [{ id: 's1', table: 'line_items', field: 'variance', direction: 'desc' }],
      groupBy: [], aggregations: [], limit: 1000, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Spend by Vendor (Grouped)',
    description: 'Total billed amount grouped by vendor',
    config: {
      tableKey: 'invoices', reportName: 'Spend by Vendor',
      linkedTables: [{ tableKey: 'accounts', joinFrom: 'invoices' }],
      fields: [],
      filters: [], filterLogic: 'AND',
      sorts: [{ id: 's1', table: 'invoices', field: 'total_amount', direction: 'desc' }],
      groupBy: [{ table: 'accounts', field: 'name' }],
      aggregations: [{ id: 'a1', table: 'invoices', field: 'total_amount', func: 'sum' }],
      limit: 500, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Open Disputes',
    description: 'All disputes not yet closed with amounts and vendors',
    config: {
      tableKey: 'disputes', reportName: 'Open Disputes',
      linkedTables: [
        { tableKey: 'accounts', joinFrom: 'disputes' },
        { tableKey: 'invoices', joinFrom: 'disputes' },
      ],
      fields: [
        { table: 'accounts', field: 'name' }, { table: 'invoices', field: 'invoice_number' },
        { table: 'disputes', field: 'dispute_type' }, { table: 'disputes', field: 'amount' },
        { table: 'disputes', field: 'status' }, { table: 'disputes', field: 'filed_date' },
      ],
      filters: [{ id: 't1', table: 'disputes', field: 'status', op: 'not_equals', value: 'Closed' }],
      filterLogic: 'AND', sorts: [{ id: 's1', table: 'disputes', field: 'filed_date', direction: 'desc' }],
      groupBy: [], aggregations: [], limit: 1000, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Contract Expiry Watch',
    description: 'Active contracts with end dates (soonest first)',
    config: {
      tableKey: 'contracts', reportName: 'Contract Expiry Watch',
      linkedTables: [{ tableKey: 'accounts', joinFrom: 'contracts' }],
      fields: [
        { table: 'contracts', field: 'contract_number' }, { table: 'contracts', field: 'name' },
        { table: 'accounts', field: 'name' }, { table: 'contracts', field: 'start_date' },
        { table: 'contracts', field: 'end_date' }, { table: 'contracts', field: 'term_months' },
        { table: 'contracts', field: 'status' }, { table: 'contracts', field: 'auto_renew' },
      ],
      filters: [
        { id: 't1', table: 'contracts', field: 'status', op: 'equals', value: 'Active' },
        { id: 't2', table: 'contracts', field: 'end_date', op: 'not_empty', value: '' },
      ],
      filterLogic: 'AND', sorts: [{ id: 's1', table: 'contracts', field: 'end_date', direction: 'asc' }],
      groupBy: [], aggregations: [], limit: 500, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Cost Savings Opportunities',
    description: 'Identified and in-progress savings with projections',
    config: {
      tableKey: 'cost_savings', reportName: 'Cost Savings Opportunities',
      linkedTables: [{ tableKey: 'accounts', joinFrom: 'cost_savings' }],
      fields: [
        { table: 'accounts', field: 'name' }, { table: 'cost_savings', field: 'category' },
        { table: 'cost_savings', field: 'description' }, { table: 'cost_savings', field: 'status' },
        { table: 'cost_savings', field: 'identified_date' }, { table: 'cost_savings', field: 'projected_savings' },
        { table: 'cost_savings', field: 'realized_savings' },
      ],
      filters: [{ id: 't1', table: 'cost_savings', field: 'status', op: 'not_equals', value: 'Resolved' }],
      filterLogic: 'AND', sorts: [{ id: 's1', table: 'cost_savings', field: 'projected_savings', direction: 'desc' }],
      groupBy: [], aggregations: [], limit: 500, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Allocation by Department',
    description: 'Allocated costs grouped by department',
    config: {
      tableKey: 'allocations', reportName: 'Allocation by Department',
      linkedTables: [],
      fields: [],
      filters: [], filterLogic: 'AND', sorts: [],
      groupBy: [{ table: 'allocations', field: 'department' }],
      aggregations: [{ id: 'a1', table: 'allocations', field: 'allocated_amount', func: 'sum' }],
      limit: 500, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Full Invoice Audit (Multi-Table)',
    description: 'Invoices with line items, inventory, and vendor — full audit chain',
    config: {
      tableKey: 'invoices', reportName: 'Full Invoice Audit',
      linkedTables: [
        { tableKey: 'accounts', joinFrom: 'invoices' },
        { tableKey: 'line_items', joinFrom: 'invoices' },
        { tableKey: 'inventory', joinFrom: 'line_items' },
      ],
      fields: [
        { table: 'accounts', field: 'name' }, { table: 'invoices', field: 'invoice_number' },
        { table: 'invoices', field: 'invoice_date' }, { table: 'invoices', field: 'total_amount' },
        { table: 'line_items', field: 'description' }, { table: 'line_items', field: 'amount' },
        { table: 'line_items', field: 'audit_status' }, { table: 'inventory', field: 'inventory_number' },
        { table: 'inventory', field: 'location' },
      ],
      filters: [], filterLogic: 'AND', sorts: [{ id: 's1', table: 'invoices', field: 'invoice_date', direction: 'desc' }],
      groupBy: [], aggregations: [], limit: 1000, distinct: false, colOverrides: {},
    },
  },
  {
    name: 'Contract Rate Card',
    description: 'All USOC rates per contract with rate details',
    config: {
      tableKey: 'contracts', reportName: 'Contract Rate Card',
      linkedTables: [
        { tableKey: 'accounts', joinFrom: 'contracts' },
        { tableKey: 'contract_rates', joinFrom: 'contracts' },
        { tableKey: 'usoc_codes', joinFrom: 'contract_rates' },
      ],
      fields: [
        { table: 'accounts', field: 'name' }, { table: 'contracts', field: 'contract_number' },
        { table: 'usoc_codes', field: 'usoc_code' }, { table: 'usoc_codes', field: 'description' },
        { table: 'contract_rates', field: 'mrc' }, { table: 'contract_rates', field: 'nrc' },
        { table: 'contract_rates', field: 'effective_date' },
      ],
      filters: [{ id: 't1', table: 'contracts', field: 'status', op: 'equals', value: 'Active' }],
      filterLogic: 'AND', sorts: [{ id: 's1', table: 'contracts', field: 'contract_number', direction: 'asc' }],
      groupBy: [], aggregations: [], limit: 1000, distinct: false, colOverrides: {},
    },
  },
];

// ══════════════════════════════════════════════════════════════════════════════
//  Main component
// ══════════════════════════════════════════════════════════════════════════════
export default function CreateReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('reports', 'create');
  const canUpdate = hasPermission('reports', 'update');
  const canDelete = hasPermission('reports', 'delete');

  // Catalog: { tables: {}, relationships: {} }
  const [catalog, setCatalog]       = useState(null);
  const [catalogErr, setCatalogErr] = useState(null);

  // Report config
  const [reportName, setReportName]     = useState('Untitled Report');
  const [reportDesc, setReportDesc]     = useState('');
  const [tableKey, setTableKey]         = useState('');
  const [linkedTables, setLinkedTables] = useState([]);   // [{id, tableKey, joinFrom}]
  const [fields, setFields]             = useState([]);   // [{table, field}]
  const [filters, setFilters]           = useState([]);   // [{id, table, field, op, value}]
  const [filterLogic, setFilterLogic]   = useState('AND');
  const [sorts, setSorts]               = useState([]);   // [{id, table, field, direction}]
  const [groupBy, setGroupBy]           = useState([]);   // [{table, field}]
  const [aggregations, setAggregations] = useState([]);   // [{id, table, field, func}]
  const [limit, setLimit]               = useState(500);
  const [distinct, setDistinct]         = useState(false);
  const [colOverrides, setColOverrides] = useState({});

  // UI
  const [activeSection, setActiveSection] = useState({ source: true, links: true, fields: true, filters: true, sort: false, group: false, options: false });
  const [fieldSearch, setFieldSearch]     = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLinkPicker, setShowLinkPicker]         = useState(false);
  const [expandedFieldTables, setExpandedFieldTables] = useState(new Set());

  // Results
  const [results, setResults]       = useState(null);
  const [running, setRunning]       = useState(false);
  const [runError, setRunError]     = useState(null);
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_SIZE                = 50;

  // Saved reports
  const [savedReports, setSavedReports]     = useState([]);
  const [showSaved, setShowSaved]           = useState(false);
  const [saveModal, setSaveModal]           = useState(false);
  const [saveLoading, setSaveLoading]       = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState(null);
  const [saveError, setSaveError]           = useState('');

  // Export job modal
  const [exportModal, setExportModal]       = useState(false);
  const [exportFormat, setExportFormat]     = useState('csv');
  const [exportEmail, setExportEmail]       = useState('');
  const [exportSending, setExportSending]   = useState(false);
  const [exportJobs, setExportJobs]         = useState([]);
  const [showExportHistory, setShowExportHistory] = useState(false);
  const exportPollRef = useRef(null);

  // Templates & toast
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast]                 = useState(null);
  const toastTimer     = useRef(null);
  const dragKey        = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const autoRunPending = useRef(false);
  const pendingConfig  = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Load catalog ──────────────────────────────────────────
  useEffect(() => {
    getReportCatalog()
      .then(r => setCatalog(r.data))
      .catch(e => setCatalogErr(e.response?.data?.error || e.message || 'Failed to load catalog'));
  }, []);

  // ── Load saved report from ?id= ──────────────────────────
  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    getSavedReport(id)
      .then(r => {
        const row = r.data;
        const cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
        pendingConfig.current = cfg;
        setCurrentSavedId(row.saved_reports_id);
        autoRunPending.current = true;
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Apply pending config after catalog loads ──────────────
  useEffect(() => {
    if (!catalog || !pendingConfig.current) return;
    const cfg = convertLegacyConfig(pendingConfig.current, catalog);
    pendingConfig.current = null;
    applyConfig(cfg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // ── Auto-run after config is applied ──────────────────────
  useEffect(() => {
    if (catalog && tableKey && autoRunPending.current) {
      autoRunPending.current = false;
      setTimeout(() => handleRun(), 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, tableKey]);

  // ── Load saved reports list ───────────────────────────────
  const loadSaved = useCallback(() => {
    getSavedReports().then(r => setSavedReports(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  // ── Derived ───────────────────────────────────────────────
  const tables = catalog?.tables || {};
  const rels   = catalog?.relationships || {};

  const selectedTableKeys = useMemo(() => {
    if (!tableKey) return [];
    return [tableKey, ...linkedTables.map(lt => lt.tableKey)];
  }, [tableKey, linkedTables]);

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

  const aggregableFields = useMemo(() => allFields.filter(f => f.aggregable), [allFields]);
  const isGrouped = groupBy.length > 0 || aggregations.length > 0;
  const canRun    = !!tableKey && (isGrouped ? groupBy.length > 0 : fields.length > 0);

  // Available link targets
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

  const availableLinkCount = Object.keys(availableLinks).length;

  const filteredAvailable = useMemo(() => {
    const q = fieldSearch.toLowerCase();
    const sel = new Set(fields.map(f => `${f.table}__${f.field}`));
    return allFields.filter(f => !sel.has(f.uid) && (!q || f.label.toLowerCase().includes(q) || f.key.includes(q) || f.tableLabel.toLowerCase().includes(q)));
  }, [allFields, fields, fieldSearch]);

  const selectedFieldDefs = useMemo(() =>
    fields.map(f => {
      const td = tables[f.table];
      const fd = td?.fields?.find(ff => ff.key === f.field);
      if (!fd) return null;
      return { ...fd, table: f.table, tableLabel: td.label, uid: `${f.table}__${f.field}` };
    }).filter(Boolean),
  [fields, tables]);

  // ── Config helpers ────────────────────────────────────────
  const buildConfig = useCallback(() => ({
    tableKey,
    linkedTables: linkedTables.map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
    reportName, reportDesc: reportDesc || undefined,
    fields, filters: filters.map(f => ({ id: f.id, table: f.table, field: f.field, op: f.op, value: f.value })),
    filterLogic,
    sorts: sorts.map(s => ({ id: s.id, table: s.table, field: s.field, direction: s.direction })),
    groupBy, aggregations: aggregations.map(a => ({ id: a.id, table: a.table, field: a.field, func: a.func })),
    limit, distinct, colOverrides,
  }), [tableKey, linkedTables, reportName, reportDesc, fields, filters, filterLogic, sorts, groupBy, aggregations, limit, distinct, colOverrides]);

  const applyConfig = useCallback((cfg) => {
    setTableKey(cfg.tableKey || '');
    setReportName(cfg.reportName || 'Untitled Report');
    setReportDesc(cfg.reportDesc || '');
    setLinkedTables((cfg.linkedTables || []).map(lt => ({ ...lt, id: lt.id || uid() })));
    setFields(cfg.fields || []);
    setFilters((cfg.filters || []).map(f => ({ ...f, id: f.id || uid() })));
    setFilterLogic(cfg.filterLogic || 'AND');
    setSorts((cfg.sorts || []).map(s => ({ ...s, id: s.id || uid() })));
    setGroupBy(cfg.groupBy || []);
    setAggregations((cfg.aggregations || []).map(a => ({ ...a, id: a.id || uid() })));
    setLimit(cfg.limit || 500);
    setDistinct(!!cfg.distinct);
    setColOverrides(cfg.colOverrides || {});
    setResults(null); setRunError(null); setPreviewPage(1);
  }, []);

  // ── Table change ──────────────────────────────────────────
  const handleTableChange = useCallback((key) => {
    setTableKey(key); setLinkedTables([]); setFields([]); setFilters([]); setFilterLogic('AND');
    setSorts([]); setGroupBy([]); setAggregations([]);
    setColOverrides({}); setResults(null); setRunError(null); setFieldSearch('');
    setShowLinkPicker(false); setExpandedFieldTables(new Set([key]));
    setActiveSection(p => ({ ...p, source: false, fields: true }));
  }, []);

  // ── Linked table operations ───────────────────────────────
  const addLinkedTable = (targetTable, joinFrom) => {
    setLinkedTables(prev => [...prev, { id: uid(), tableKey: targetTable, joinFrom }]);
    setShowLinkPicker(false);
    setExpandedFieldTables(prev => new Set([...prev, targetTable]));
    setActiveSection(p => ({ ...p, fields: true }));
  };

  const removeLinkedTable = (id) => {
    const lt = linkedTables.find(l => l.id === id);
    if (!lt) return;
    // Find all tables that depend on this one (cascading removal)
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
    setFields(prev => prev.filter(f => !removing.has(f.table)));
    setFilters(prev => prev.filter(f => !removing.has(f.table)));
    setSorts(prev => prev.filter(s => !removing.has(s.table)));
    setGroupBy(prev => prev.filter(g => !removing.has(g.table)));
    setAggregations(prev => prev.filter(a => !removing.has(a.table)));
  };

  // ── Field operations ──────────────────────────────────────
  const addField = (table, field) => setFields(prev => prev.some(f => f.table === table && f.field === field) ? prev : [...prev, { table, field }]);
  const addAllFields = () => {
    const all = [];
    for (const tk of selectedTableKeys) {
      for (const f of (tables[tk]?.fields || [])) all.push({ table: tk, field: f.key });
    }
    setFields(all);
  };
  const clearFields = () => { setFields([]); setResults(null); setRunError(null); };
  const removeField = (table, field) => {
    const fuid = `${table}__${field}`;
    setFields(p => p.filter(f => `${f.table}__${f.field}` !== fuid));
    setGroupBy(p => p.filter(g => `${g.table}__${g.field}` !== fuid));
    setAggregations(p => p.filter(a => `${a.table}__${a.field}` !== fuid));
    setSorts(p => p.filter(s => `${s.table}__${s.field}` !== fuid));
  };
  const moveField = (idx, dir) => setFields(prev => {
    const swap = idx + dir;
    if (swap < 0 || swap >= prev.length) return prev;
    const next = [...prev];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    return next;
  });

  // ── Filter operations ─────────────────────────────────────
  const addFilter = () => {
    const first = allFields[0];
    if (!first) return;
    setFilters(p => [...p, { id: uid(), table: first.table, field: first.key, op: 'contains', value: '' }]);
  };
  const removeFilter = id => setFilters(p => p.filter(f => f.id !== id));
  const updateFilter = (id, patch) => setFilters(p => p.map(f => f.id === id ? { ...f, ...patch } : f));

  // ── Sort operations ───────────────────────────────────────
  const addSort = () => {
    const first = allFields[0];
    if (!first) return;
    setSorts(p => [...p, { id: uid(), table: first.table, field: first.key, direction: 'asc' }]);
  };
  const removeSort = id => setSorts(p => p.filter(s => s.id !== id));
  const updateSort = (id, patch) => setSorts(p => p.map(s => s.id === id ? { ...s, ...patch } : s));

  // ── Group by operations ───────────────────────────────────
  const toggleGroupBy = (table, field) => {
    setGroupBy(prev => {
      const exists = prev.some(g => g.table === table && g.field === field);
      return exists ? prev.filter(g => !(g.table === table && g.field === field)) : [...prev, { table, field }];
    });
  };

  // ── Aggregation operations ────────────────────────────────
  const addAggregation = () => {
    const first = aggregableFields[0];
    if (!first) return;
    setAggregations(p => [...p, { id: uid(), table: first.table, field: first.key, func: 'sum' }]);
  };
  const removeAggregation = id => setAggregations(p => p.filter(a => a.id !== id));
  const updateAggregation = (id, patch) => setAggregations(p => p.map(a => a.id === id ? { ...a, ...patch } : a));

  // ── Run ───────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!tableKey) return;
    setRunning(true); setRunError(null); setResults(null); setPreviewPage(1);
    try {
      const res = await runReport({
        tableKey,
        linkedTables: linkedTables.map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
        fields: isGrouped ? [] : fields,
        filters: filters.map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
        filterLogic,
        sorts: sorts.map(s => ({ table: s.table, field: s.field, direction: s.direction })),
        groupBy,
        aggregations: aggregations.map(a => ({ table: a.table, field: a.field, func: a.func })),
        limit: Math.min(limit, 10000), offset: 0, distinct,
      });
      setResults(res.data);
    } catch (e) {
      setRunError(e.response?.data?.error || e.message || 'Query failed');
    } finally { setRunning(false); }
  }, [tableKey, linkedTables, fields, filters, filterLogic, sorts, groupBy, aggregations, limit, distinct, isGrouped]);

  // ── Export ────────────────────────────────────────────────
  const handleExport = useCallback(async (fmt) => {
    if (!results?.data?.length) return;
    const cols = results.fields || [];
    const headers = cols.map(c => colOverrides[c.key]?.label || c.label);
    const rows = results.data.map(row =>
      cols.map(c => formatCell(row[c.key], { ...c, format: colOverrides[c.key]?.format || c.format }))
    );
    const fname = reportName || 'Report';
    if (fmt === 'csv') {
      const escape = v => { const s = String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
      const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
      saveAs(new Blob([csv], { type: 'text/csv' }), `${fname}.csv`);
    } else {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      ws.addRow(headers);
      rows.forEach(r => ws.addRow(r));
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${fname}.xlsx`);
    }
  }, [results, reportName, colOverrides]);

  // ── Export All (background job) ───────────────────────────
  const loadExportJobs = useCallback(async () => {
    try { const res = await getReportJobs(); setExportJobs(res.data || []); } catch {}
  }, []);

  const handleExportAll = useCallback(async () => {
    setExportSending(true);
    try {
      const cfg = buildConfig();
      await createReportJob({
        name: reportName || 'Report Export',
        config: cfg,
        format: exportFormat,
        emailTo: exportEmail.trim() || undefined,
      });
      showToast('Export job started — check Export History for progress');
      setExportModal(false);
      setExportEmail('');
      loadExportJobs();
    } catch (e) {
      showToast(e.response?.data?.error || 'Export failed', 'error');
    } finally { setExportSending(false); }
  }, [buildConfig, reportName, exportFormat, exportEmail, showToast, loadExportJobs]);

  const handleDeleteJob = useCallback(async (id) => {
    try { await deleteReportJob(id); loadExportJobs(); } catch {}
  }, [loadExportJobs]);

  // Poll running jobs
  useEffect(() => {
    if (!showExportHistory) return;
    loadExportJobs();
    const hasRunning = exportJobs.some(j => j.status === 'queued' || j.status === 'running');
    if (hasRunning) {
      exportPollRef.current = setInterval(loadExportJobs, 3000);
    }
    return () => { if (exportPollRef.current) clearInterval(exportPollRef.current); };
  }, [showExportHistory, exportJobs.length, loadExportJobs]);

  // ── Save ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaveLoading(true); setSaveError('');
    try {
      const cfg = buildConfig();
      if (currentSavedId) {
        await updateSavedReport(currentSavedId, { name: reportName, description: reportDesc, config: cfg });
        showToast('Report updated');
      } else {
        const res = await saveReport({ name: reportName, description: reportDesc, config: cfg });
        setCurrentSavedId(res.data.saved_reports_id);
        showToast('Report saved');
      }
      setSaveModal(false); loadSaved();
    } catch (e) {
      setSaveError(e.response?.data?.error || e.message || 'Save failed');
    } finally { setSaveLoading(false); }
  }, [buildConfig, currentSavedId, reportName, reportDesc, showToast, loadSaved]);

  const handleDeleteSaved = useCallback(async (id) => {
    if (!(await confirm('Delete this saved report?'))) return;
    await deleteSavedReport(id);
    if (currentSavedId === id) setCurrentSavedId(null);
    loadSaved(); showToast('Deleted', 'error');
  }, [currentSavedId, loadSaved, showToast]);

  // ── Preview pagination ────────────────────────────────────
  const previewData = useMemo(() => {
    if (!results?.data) return [];
    const start = (previewPage - 1) * PREVIEW_SIZE;
    return results.data.slice(start, start + PREVIEW_SIZE);
  }, [results, previewPage]);
  const totalPages = results ? Math.ceil(results.total / PREVIEW_SIZE) : 0;

  const summaryRow = useMemo(() => {
    if (!results?.data?.length || !results.fields) return null;
    const out = {};
    results.fields.forEach(f => {
      if (f.type === 'number' || f.format === 'currency') {
        out[f.key] = results.data.reduce((s, r) => s + Number(r[f.key] || 0), 0);
      }
    });
    return Object.keys(out).length ? out : null;
  }, [results]);

  // ── Drag reorder ──────────────────────────────────────────
  const onDragStart = (e, idx) => { dragKey.current = idx; e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver  = (e, idx) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (idx !== undefined) setDragOverIdx(idx); };
  const onDragEnd   = () => { dragKey.current = null; setDragOverIdx(null); };
  const onDrop      = idx => {
    if (dragKey.current === null || dragKey.current === idx) return;
    setFields(prev => {
      const next = [...prev];
      const [item] = next.splice(dragKey.current, 1);
      next.splice(idx, 0, item);
      setTimeout(() => {
        // Persist to DB when editing a saved report
        if (currentSavedId) {
          const cfg = { ...buildConfig(), fields: next };
          updateSavedReport(currentSavedId, { name: reportName, description: reportDesc, config: cfg })
            .then(() => showToast('Column order saved'))
            .catch(() => {});
        }
        // Re-run report with new field order whenever results are showing
        if (results && tableKey) {
          setRunning(true); setRunError(null); setResults(null); setPreviewPage(1);
          runReport({
            tableKey,
            linkedTables: linkedTables.map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
            fields: isGrouped ? [] : next,
            filters: filters.map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
            filterLogic,
            sorts: sorts.map(s => ({ table: s.table, field: s.field, direction: s.direction })),
            groupBy,
            aggregations: aggregations.map(a => ({ table: a.table, field: a.field, func: a.func })),
            limit: Math.min(limit, 10000), offset: 0, distinct,
          })
            .then(r => setResults(r.data))
            .catch(e => setRunError(e.response?.data?.error || e.message || 'Query failed'))
            .finally(() => setRunning(false));
        }
      }, 0);
      return next;
    });
    dragKey.current = null;
    setDragOverIdx(null);
  };

  const toggleSection = k => setActiveSection(p => ({ ...p, [k]: !p[k] }));

  // Helper: resolve a filter/sort field reference to its field def
  const resolveFieldDef = (table, field) => {
    const td = tables[table];
    return td?.fields?.find(f => f.key === field) || null;
  };

  // ── Render guards ─────────────────────────────────────────
  if (catalogErr) return (
    <div className="page-card" style={{ padding: 40, textAlign: 'center' }}>
      <AlertCircle size={36} color="var(--text-error)" style={{ marginBottom: 12 }} />
      <p style={{ color: 'var(--text-error)', fontSize: 14 }}>{catalogErr}</p>
    </div>
  );
  if (!catalog) return (
    <div className="page-card" style={{ padding: 40, textAlign: 'center' }}>
      <RefreshCw size={32} color="var(--text-faint)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading report builder…</p>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="report-creator" style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 80px)', minHeight: 640, position: 'relative' }}>

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

      {/* ── Top bar ──────────────────────────────────────────── */}
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
        <input value={reportName} onChange={e => setReportName(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 16, fontWeight: 700, minWidth: 180, flex: 1, borderBottom: '1px solid transparent' }}
          onFocus={e => (e.target.style.borderBottomColor = '#60a5fa')}
          onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
          placeholder="Report Name…" />
        {currentSavedId && (
          <span style={{ fontSize: 11, color: '#93c5fd', background: 'rgba(59,130,246,0.2)', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>Saved</span>
        )}

        {[
          { label: 'Templates', icon: BookOpen, onClick: () => setShowTemplates(p => !p) },
          { label: `Saved${savedReports.length ? ` (${savedReports.length})` : ''}`, icon: FolderOpen, onClick: () => setShowSaved(p => !p) },
          { label: 'Save', icon: Save, onClick: () => setSaveModal(true), disabled: !tableKey || !(currentSavedId ? canUpdate : canCreate) },
        ].map(({ label, icon: Icon, onClick, disabled }) => (
          <button key={label} onClick={onClick} disabled={disabled}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 11px', color: disabled ? '#475569' : '#e2e8f0', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
            <Icon size={13} />{label}
          </button>
        ))}
        {results?.data?.length > 0 && (
          <>
            <button onClick={() => handleExport('csv')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 11px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <Download size={13} /> CSV
            </button>
            <button onClick={() => handleExport('xlsx')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 11px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <Download size={13} /> XLSX
            </button>
            <button onClick={() => setExportModal(true)} title="Export all rows (up to 100k) in the background" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 7, padding: '5px 11px', color: '#4ade80', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <FileDown size={13} /> Export All
            </button>
          </>
        )}
        <button onClick={() => { setShowExportHistory(p => !p); }} title="Export History" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '5px 11px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
          <Clock size={13} /> Exports
        </button>
        <button onClick={handleRun} disabled={!canRun || running}
          style={{ background: canRun && !running ? 'var(--accent-color)' : '#334155', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', cursor: canRun && !running ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', flexShrink: 0 }}>
          {running
            ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
            : <><Play size={13} fill="currentColor" /> Run Report</>}
        </button>
      </div>

      {/* Flyout: Templates */}
      {showTemplates && (
        <div className="rc-flyout" style={{ position: 'absolute', top: 54, right: 16, zIndex: 300, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', width: 370, maxHeight: 520, overflowY: 'auto' }}>
          <div className="rc-flyout-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
            <span className="rc-flyout-title" style={{ fontWeight: 700, fontSize: 14 }}><BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Report Templates</span>
            <button onClick={() => setShowTemplates(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>
          {TEMPLATES.map(t => (
            <div key={t.name} className="rc-flyout-item" onClick={() => { applyConfig(t.config); setCurrentSavedId(null); setShowTemplates(false); showToast(`Template loaded: ${t.name}`); }}
              style={{ padding: '11px 16px', cursor: 'pointer' }}>
              <div className="rc-flyout-item-title" style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{t.name}</div>
              <div className="rc-flyout-item-desc" style={{ fontSize: 12 }}>{t.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Flyout: Saved */}
      {showSaved && (
        <div className="rc-flyout" style={{ position: 'absolute', top: 54, right: 16, zIndex: 300, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', width: 370, maxHeight: 520, overflowY: 'auto' }}>
          <div className="rc-flyout-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
            <span className="rc-flyout-title" style={{ fontWeight: 700, fontSize: 14 }}><FolderOpen size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Saved Reports</span>
            <button onClick={() => setShowSaved(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>
          {savedReports.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No saved reports yet.</div>}
          {savedReports.map(r => (
            <div key={r.saved_reports_id} className="rc-flyout-item" style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => {
                  const cfg = typeof r.config === 'string' ? JSON.parse(r.config) : r.config;
                  const converted = convertLegacyConfig(cfg, catalog);
                  applyConfig(converted); setCurrentSavedId(r.saved_reports_id); setShowSaved(false); showToast(`Loaded: ${r.name}`);
                }}>
                <div className="rc-flyout-item-title" style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                {r.description && <div className="rc-flyout-item-desc" style={{ fontSize: 12, marginTop: 1 }}>{r.description}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
                  {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : ''}{r.created_by_name ? ` · ${r.created_by_name}` : ''}
                </div>
              </div>
              {canDelete && <button onClick={() => handleDeleteSaved(r.saved_reports_id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>}
            </div>
          ))}
        </div>
      )}

      {/* ── Main layout ───────────────────────────────────────── */}
      <div className="rc-main" style={{ display: 'flex', flex: 1, overflow: 'hidden', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>

        {/* ── Left Sidebar ─────────────────────────────────────── */}
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
                    const sel  = tableKey === td.key;
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
                  <SectionHeader label="2. LINKED DATA SOURCES" icon={Link} expanded={activeSection.links} onToggle={() => toggleSection('links')} color="#38bdf8" count={linkedTables.length} />
                  {activeSection.links && (
                    <div style={{ padding: 10 }}>
                      {linkedTables.length === 0 && (
                        <div style={{ fontSize: 12, color: '#475569', padding: '4px 0 8px', lineHeight: 1.5 }}>
                          Link additional tables to pull fields across related data.
                        </div>
                      )}
                      {linkedTables.map(lt => {
                        const td = tables[lt.tableKey];
                        const fromTd = tables[lt.joinFrom];
                        const Icon = TABLE_ICONS[td?.icon] || Database;
                        return (
                          <div key={lt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid #334155', borderRadius: 7, padding: '7px 8px', marginBottom: 4 }}>
                            <Icon size={13} color={td?.color || '#64748b'} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#e2e8f0' }}>{td?.label}</div>
                              <div style={{ fontSize: 10, color: '#475569' }}>
                                via <span style={{ color: fromTd?.color || '#64748b' }}>{fromTd?.label}</span>
                              </div>
                            </div>
                            <button onClick={() => removeLinkedTable(lt.id)}
                              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}>
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add link picker */}
                      {availableLinkCount > 0 && (
                        <>
                          <button onClick={() => setShowLinkPicker(p => !p)}
                            style={{ width: '100%', background: 'none', border: '1px dashed #334155', borderRadius: 6, padding: 6, color: '#64748b', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                            <Plus size={12} /> Add Data Source Link
                          </button>
                          {showLinkPicker && (
                            <div style={{ marginTop: 6, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' }}>
                              {Object.entries(availableLinks).map(([targetKey, fromKeys]) => {
                                const td = tables[targetKey];
                                const Icon = TABLE_ICONS[td?.icon] || Database;
                                return (
                                  <div key={targetKey}>
                                    {fromKeys.length === 1 ? (
                                      <button onClick={() => addLinkedTable(targetKey, fromKeys[0])}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'none', border: 'none', borderBottom: '1px solid #0f172a', cursor: 'pointer', color: '#94a3b8', textAlign: 'left' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8'; }}>
                                        <Icon size={13} color={td?.color} />
                                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{td?.label}</span>
                                        <span style={{ fontSize: 10, color: '#475569' }}>via {tables[fromKeys[0]]?.label}</span>
                                      </button>
                                    ) : (
                                      fromKeys.map(fk => (
                                        <button key={`${targetKey}-${fk}`} onClick={() => addLinkedTable(targetKey, fk)}
                                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'none', border: 'none', borderBottom: '1px solid #0f172a', cursor: 'pointer', color: '#94a3b8', textAlign: 'left' }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8'; }}>
                                          <Icon size={13} color={td?.color} />
                                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{td?.label}</span>
                                          <span style={{ fontSize: 10, color: tables[fk]?.color || '#475569' }}>via {tables[fk]?.label}</span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {availableLinkCount === 0 && linkedTables.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '6px 0', textAlign: 'center' }}>All reachable tables linked</div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 3. Columns */}
              <SectionHeader label={`${tableKey ? '3' : '2'}. COLUMNS`} icon={Copy} expanded={activeSection.fields} onToggle={() => toggleSection('fields')} color="#34d399" count={fields.length} />
              {activeSection.fields && tableKey && (
                <div style={{ padding: 10 }}>
                  <div style={{ position: 'relative', marginBottom: 7 }}>
                    <Search size={11} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                    <input value={fieldSearch} onChange={e => setFieldSearch(e.target.value)} placeholder="Search fields…"
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '5px 7px 5px 22px', color: '#e2e8f0', fontSize: 12, outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <button onClick={addAllFields} style={{ flex: 1, background: 'none', border: '1px solid #334155', borderRadius: 5, padding: '3px 6px', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>+ All</button>
                    <button onClick={clearFields} style={{ flex: 1, background: 'none', border: '1px solid #334155', borderRadius: 5, padding: '3px 6px', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>Clear</button>
                  </div>

                  {/* Available fields — collapsible per-table categories */}
                  {selectedTableKeys.map(tk => {
                    const td = tables[tk];
                    if (!td) return null;
                    const avail = filteredAvailable.filter(f => f.table === tk);
                    // If a search is active and this table has no matches, hide it
                    if (fieldSearch && avail.length === 0) return null;
                    const allAdded = avail.length === 0;
                    const isExpanded = expandedFieldTables.has(tk) || (!!fieldSearch && avail.length > 0);
                    const toggleExpand = () => setExpandedFieldTables(prev => {
                      const next = new Set(prev);
                      if (next.has(tk)) next.delete(tk); else next.add(tk);
                      return next;
                    });
                    return (
                      <div key={tk} style={{ marginBottom: 4 }}>
                        <button onClick={toggleExpand} style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                          background: isExpanded ? '#162032' : '#1e293b',
                          border: `1px solid ${isExpanded ? td.color : '#334155'}`,
                          borderRadius: isExpanded ? '6px 6px 0 0' : 6,
                          padding: '7px 9px', cursor: 'pointer',
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: td.color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: isExpanded ? '#e2e8f0' : '#94a3b8', textAlign: 'left' }}>
                            {td.label}
                          </span>
                          {allAdded
                            ? <span style={{ fontSize: 10, color: '#334155', fontStyle: 'italic' }}>all added</span>
                            : <span style={{ fontSize: 10, fontWeight: 700, color: td.color, background: '#0f172a', borderRadius: 8, padding: '1px 6px' }}>{avail.length}</span>
                          }
                          <ChevronRight size={11} color="#475569" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                        </button>
                        {isExpanded && (
                          <div style={{ background: '#0c1629', border: `1px solid ${td.color}`, borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden', marginBottom: 0 }}>
                            {allAdded
                              ? <div style={{ fontSize: 11, color: '#475569', padding: '8px 10px', fontStyle: 'italic' }}>All fields from this table are already selected.</div>
                              : avail.map(f => (
                                <button key={f.uid} onClick={() => addField(f.table, f.key)} style={{
                                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                                  borderBottom: '1px solid #1a2540', padding: '5px 10px', cursor: 'pointer', color: '#94a3b8',
                                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#e2e8f0'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8'; }}>
                                  <Plus size={11} color={td.color} style={{ flexShrink: 0 }} />
                                  <span style={{ flex: 1 }}>{f.label}</span>
                                  <span style={{ fontSize: 9, color: '#334155', textTransform: 'uppercase' }}>{f.type}</span>
                                </button>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredAvailable.length === 0 && !fieldSearch && <div style={{ fontSize: 12, color: '#475569', padding: '4px 2px' }}>All fields selected</div>}
                  {filteredAvailable.length === 0 && fieldSearch && <div style={{ fontSize: 12, color: '#475569', padding: '4px 2px' }}>No fields match search</div>}

                  {/* Selected columns */}
                  {fields.length > 0 && (
                    <div style={{ marginTop: 10, borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>
                        Selected ({fields.length}) — drag to reorder
                      </div>
                      {selectedFieldDefs.map((f, idx) => {
                        const ovKey = `${f.table}__${f.key}`;
                        const ov = colOverrides[ovKey] || {};
                        const multiTable = linkedTables.length > 0;
                        return (
                          <div key={f.uid}
                            draggable onDragStart={e => onDragStart(e, idx)} onDragOver={e => onDragOver(e, idx)} onDragEnd={onDragEnd} onDrop={() => onDrop(idx)}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '5px 5px', marginBottom: 3, cursor: 'grab' }}>
                            <Grip size={11} color="#334155" style={{ flexShrink: 0, marginTop: 4 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {multiTable && (
                                <div style={{ fontSize: 9, color: tables[f.table]?.color || '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 }}>
                                  {f.tableLabel}
                                </div>
                              )}
                              <input value={ov.label !== undefined ? ov.label : f.label}
                                onChange={e => setColOverrides(p => ({ ...p, [ovKey]: { ...(p[ovKey] || {}), label: e.target.value } }))}
                                style={{ background: 'none', border: 'none', color: '#e2e8f0', fontSize: 12, fontWeight: 600, width: '100%', outline: 'none', padding: 0 }}
                                placeholder={f.label} />
                              <select value={ov.format || f.format || ''}
                                onChange={e => setColOverrides(p => ({ ...p, [ovKey]: { ...(p[ovKey] || {}), format: e.target.value } }))}
                                style={{ background: '#0f172a', border: 'none', color: '#475569', fontSize: 10, outline: 'none', width: '100%' }}>
                                <option value="">Auto format</option>
                                <option value="currency">Currency ($)</option>
                                <option value="date">Date only</option>
                                <option value="number">Plain number</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              <button onClick={() => moveField(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? '#1e293b' : '#475569', cursor: idx === 0 ? 'default' : 'pointer', padding: 1 }}><ChevronUp size={11} /></button>
                              <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} style={{ background: 'none', border: 'none', color: idx === fields.length-1 ? '#1e293b' : '#475569', cursor: idx === fields.length-1 ? 'default' : 'pointer', padding: 1 }}><ChevronDown size={11} /></button>
                            </div>
                            <button onClick={() => removeField(f.table, f.key)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}><X size={11} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Filters */}
              <SectionHeader label={`${tableKey ? '4' : '3'}. FILTERS`} icon={Filter} expanded={activeSection.filters} onToggle={() => toggleSection('filters')} color="#f59e0b" count={filters.length} />
              {activeSection.filters && tableKey && (
                <div style={{ padding: 10 }}>
                  {filters.length > 1 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                      {['AND','OR'].map(l => (
                        <button key={l} onClick={() => setFilterLogic(l)} style={{
                          flex: 1, padding: '4px', fontSize: 11, fontWeight: 700, borderRadius: 5, cursor: 'pointer',
                          background: filterLogic === l ? '#2563eb' : '#1e293b',
                          border: `1px solid ${filterLogic === l ? '#2563eb' : '#334155'}`,
                          color: filterLogic === l ? '#fff' : '#64748b',
                        }}>{l}</button>
                      ))}
                      <span style={{ fontSize: 10, color: '#475569', marginLeft: 2 }}>logic</span>
                    </div>
                  )}
                  {filters.map((f, fi) => {
                    const fd = resolveFieldDef(f.table, f.field);
                    const ops = OPS_BY_TYPE[fd?.type || 'text'] || TEXT_OPS;
                    return (
                      <div key={f.id} style={{ background: '#1e293b', borderRadius: 7, padding: 8, marginBottom: 5, border: '1px solid #334155' }}>
                        {fi > 0 && <div style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', marginBottom: 4 }}>{filterLogic}</div>}
                        <select value={`${f.table}||${f.field}`}
                          onChange={e => {
                            const [t, fld] = e.target.value.split('||');
                            const newFd = resolveFieldDef(t, fld);
                            const defOp = (OPS_BY_TYPE[newFd?.type || 'text'] || TEXT_OPS)[0].op;
                            updateFilter(f.id, { table: t, field: fld, op: defOp, value: '' });
                          }}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '4px 6px', color: '#e2e8f0', fontSize: 12, marginBottom: 4, outline: 'none' }}>
                          {selectedTableKeys.map(tk => {
                            const td = tables[tk];
                            return (
                              <optgroup key={tk} label={td?.label || tk}>
                                {(td?.fields || []).map(af => (
                                  <option key={`${tk}||${af.key}`} value={`${tk}||${af.key}`}>{af.label}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        <select value={f.op}
                          onChange={e => updateFilter(f.id, { op: e.target.value, value: NO_VALUE_OPS.has(e.target.value) ? '' : f.value })}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 5, padding: '4px 6px', color: '#94a3b8', fontSize: 11, marginBottom: 4, outline: 'none' }}>
                          {ops.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
                        </select>
                        <FilterValueInput field={fd} op={f.op} value={f.value} onChange={v => updateFilter(f.id, { value: v })} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
                          <button onClick={() => removeFilter(f.id)} style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Trash2 size={11} /> Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={addFilter} disabled={!allFields.length} style={{ width: '100%', background: 'none', border: '1px dashed #334155', borderRadius: 6, padding: 6, color: '#64748b', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Plus size={12} /> Add Filter
                  </button>
                </div>
              )}

              {/* 5. Sort */}
              <SectionHeader label={`${tableKey ? '5' : '4'}. SORT ORDER`} icon={ChevronsUpDown} expanded={activeSection.sort} onToggle={() => toggleSection('sort')} color="#a78bfa" count={sorts.length} />
              {activeSection.sort && tableKey && (
                <div style={{ padding: 10 }}>
                  {sorts.map((s, si) => (
                    <div key={s.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: '#475569', width: 14, textAlign: 'center', fontWeight: 700 }}>{si + 1}</span>
                      <select value={`${s.table}||${s.field}`}
                        onChange={e => { const [t, fld] = e.target.value.split('||'); updateSort(s.id, { table: t, field: fld }); }}
                        style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '4px 5px', color: '#e2e8f0', fontSize: 11, outline: 'none' }}>
                        {selectedTableKeys.map(tk => (
                          <optgroup key={tk} label={tables[tk]?.label || tk}>
                            {(tables[tk]?.fields || []).map(f => (
                              <option key={`${tk}||${f.key}`} value={`${tk}||${f.key}`}>{f.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button onClick={() => updateSort(s.id, { direction: s.direction === 'asc' ? 'desc' : 'asc' })}
                        title={s.direction === 'asc' ? 'Ascending' : 'Descending'}
                        style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '4px 7px', color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}>
                        {s.direction === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />}
                      </button>
                      <button onClick={() => removeSort(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: 3 }}><X size={11} /></button>
                    </div>
                  ))}
                  <button onClick={addSort} disabled={!allFields.length}
                    style={{ width: '100%', background: 'none', border: '1px dashed #334155', borderRadius: 6, padding: 6, color: '#64748b', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Plus size={12} /> Add Sort
                  </button>
                </div>
              )}

              {/* 6. Group & Aggregate */}
              <SectionHeader label={`${tableKey ? '6' : '5'}. GROUP & AGGREGATE`} icon={Layers} expanded={activeSection.group} onToggle={() => toggleSection('group')} color="#f472b6" count={groupBy.length + aggregations.length} />
              {activeSection.group && tableKey && (
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Group By</div>
                  {selectedTableKeys.map(tk => {
                    const td = tables[tk];
                    if (!td) return null;
                    return (
                      <div key={tk} style={{ marginBottom: 6 }}>
                        {selectedTableKeys.length > 1 && (
                          <div style={{ fontSize: 9, fontWeight: 700, color: td.color || '#475569', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{td.label}</div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {td.fields.map(f => {
                            const active = groupBy.some(g => g.table === tk && g.field === f.key);
                            return (
                              <button key={`${tk}__${f.key}`} onClick={() => toggleGroupBy(tk, f.key)} style={{
                                padding: '3px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                                background: active ? '#7c3aed' : '#1e293b',
                                border: `1px solid ${active ? '#7c3aed' : '#334155'}`,
                                color: active ? '#fff' : '#64748b',
                              }}>{f.label}</button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {aggregableFields.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 10 }}>Aggregations</div>
                      {aggregations.map(ag => (
                        <div key={ag.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 5 }}>
                          <select value={ag.func} onChange={e => updateAggregation(ag.id, { func: e.target.value })}
                            style={{ width: 66, background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '4px 4px', color: '#f472b6', fontSize: 11, fontWeight: 700, outline: 'none' }}>
                            {AGG_FUNCS.map(fn => <option key={fn} value={fn}>{fn.toUpperCase()}</option>)}
                          </select>
                          <select value={`${ag.table}||${ag.field}`}
                            onChange={e => { const [t, fld] = e.target.value.split('||'); updateAggregation(ag.id, { table: t, field: fld }); }}
                            style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '4px 5px', color: '#e2e8f0', fontSize: 11, outline: 'none' }}>
                            {selectedTableKeys.map(tk => {
                              const aggFields = (tables[tk]?.fields || []).filter(f => f.aggregable);
                              if (!aggFields.length) return null;
                              return (
                                <optgroup key={tk} label={tables[tk]?.label || tk}>
                                  {aggFields.map(f => (
                                    <option key={`${tk}||${f.key}`} value={`${tk}||${f.key}`}>{f.label}</option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                          <button onClick={() => removeAggregation(ag.id)} style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: 2 }}><X size={11} /></button>
                        </div>
                      ))}
                      <button onClick={addAggregation}
                        style={{ width: '100%', background: 'none', border: '1px dashed #334155', borderRadius: 6, padding: 6, color: '#64748b', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Plus size={12} /> Add Aggregation
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* 7. Options */}
              <SectionHeader label={`${tableKey ? '7' : '6'}. OPTIONS`} icon={Settings} expanded={activeSection.options} onToggle={() => toggleSection('options')} color="#94a3b8" />
              {activeSection.options && (
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Max Rows</div>
                    <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 12, outline: 'none' }}>
                      {[100,250,500,1000,2500,5000,10000].map(n => <option key={n} value={n}>{n.toLocaleString()} rows</option>)}
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>
                    <input type="checkbox" checked={distinct} onChange={e => setDistinct(e.target.checked)} />
                    Distinct rows only
                  </label>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Description</div>
                    <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows={3} placeholder="Describe this report…"
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 5, padding: '5px 8px', color: '#94a3b8', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Right: Preview ──────────────────────────────────── */}
        <div className="rc-preview" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ── Selected Column Chips ─────────────────────────── */}
          {fields.length > 0 && (
            <div className="rc-chips" style={{ margin: '16px 16px 0', padding: '10px 14px', borderRadius: 10, flexShrink: 0 }}>
              {currentSavedId && reportName && (
                <div className="rc-chips-title" style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{reportName}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span className="rc-chips-title" style={{ fontSize: 13, fontWeight: 700 }}>Selected Report Columns</span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 2 }}>({fields.length})</span>
                <button onClick={clearFields} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10 }}>Clear all</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>Order the report columns by drag and dropping the icons.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {selectedFieldDefs.map((f, idx) => {
                  const color = tables[f.table]?.color || '#64748b';
                  const isDragOver = dragOverIdx === idx && dragKey.current !== null && dragKey.current !== idx;
                  const multiTable = linkedTables.length > 0;
                  return (
                    <div key={f.uid}
                      draggable
                      onDragStart={e => onDragStart(e, idx)}
                      onDragOver={e => onDragOver(e, idx)}
                      onDragEnd={onDragEnd}
                      onDrop={() => onDrop(idx)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: color,
                        border: `1.5px solid ${color}`,
                        borderLeft: isDragOver ? '3px solid var(--bg-primary)' : `1.5px solid ${color}`,
                        borderRadius: 14, padding: '5px 6px 5px 9px',
                        fontSize: 12, fontWeight: 600, color: '#fff',
                        cursor: 'grab', userSelect: 'none', whiteSpace: 'nowrap',
                        transition: 'border-left 0.1s',
                      }}>
                      {multiTable && <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.75, marginRight: 1 }}>{f.tableLabel} ·</span>}
                      {f.label}
                      <button onClick={() => removeField(f.table, f.key)}
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 1px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!tableKey && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32, color: 'var(--text-faint)' }}>
              <BarChart2 size={60} strokeWidth={1} color="#cbd5e1" />
              <div style={{ textAlign: 'center' }}>
                <div className="rc-results-count" style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Build a Custom Report</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 460, lineHeight: 1.7 }}>
                  Select a data source, link related tables to pull fields across your data, add columns and filters, then run the report. Or load a template to get started!
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setShowTemplates(true)}>
                  <BookOpen size={14} /> Browse Templates
                </button>
                <button className="btn btn-ghost" onClick={() => { toggleSection('source'); setSidebarCollapsed(false); }} style={{ border: '1.5px solid var(--border-strong)' }}>
                  <Database size={14} /> Choose Data Source
                </button>
              </div>
            </div>
          )}

          {tableKey && !results && !running && !runError && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <div className="rc-empty-card" style={{ borderRadius: 16, padding: 36, textAlign: 'center', maxWidth: 480 }}>
                <Eye size={44} color="#3b82f6" style={{ margin: '0 auto 16px' }} />
                <div className="rc-empty-title" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                  {tables[tableKey]?.label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{tables[tableKey]?.description}</div>
                {linkedTables.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', margin: '8px 0' }}>
                    {linkedTables.map(lt => (
                      <span key={lt.id} style={{ fontSize: 11, background: tables[lt.tableKey]?.color || '#64748b', color: '#fff', borderRadius: 10, padding: '2px 9px', fontWeight: 600 }}>
                        + {tables[lt.tableKey]?.label}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'inline-flex', gap: 16, fontSize: 13, color: 'var(--text-faint)', margin: '10px 0 20px' }}>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>{fields.length}</strong> column{fields.length !== 1 ? 's' : ''}</span>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>{filters.length}</strong> filter{filters.length !== 1 ? 's' : ''}</span>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>{linkedTables.length}</strong> link{linkedTables.length !== 1 ? 's' : ''}</span>
                </div>
                <button className="btn btn-primary" onClick={handleRun} disabled={!canRun} style={{ fontSize: 14, padding: '9px 24px' }}>
                  <Play size={14} fill="currentColor" /> {canRun ? 'Run Report' : 'Select at least one column'}
                </button>
              </div>
            </div>
          )}

          {running && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
              <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Executing query…</span>
            </div>
          )}

          {runError && !running && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <div className="rc-error-card" style={{ borderRadius: 14, padding: 28, maxWidth: 500, textAlign: 'center' }}>
                <AlertCircle size={36} color="var(--text-error)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-error)', marginBottom: 8, fontSize: 16 }}>Query Error</div>
                <div className="rc-error-msg" style={{ fontSize: 13, fontFamily: 'monospace', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>{runError}</div>
                <button className="btn btn-ghost" onClick={() => setRunError(null)}>Dismiss</button>
              </div>
            </div>
          )}

          {results && !running && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="rc-results-bar" style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
                <span className="rc-results-count" style={{ fontSize: 13, fontWeight: 700 }}>
                  {results.total.toLocaleString()} row{results.total !== 1 ? 's' : ''}
                </span>
                {results.total > PREVIEW_SIZE && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    showing {((previewPage - 1) * PREVIEW_SIZE) + 1}–{Math.min(previewPage * PREVIEW_SIZE, results.total)}
                  </span>
                )}
                {linkedTables.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-info)', background: 'var(--bg-info)', borderRadius: 10, padding: '2px 9px', fontWeight: 600 }}>
                    {linkedTables.length + 1} tables
                  </span>
                )}
                {filters.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--accent-color)', background: 'var(--icon-bg-blue)', borderRadius: 10, padding: '2px 9px', fontWeight: 600 }}>
                    {filters.length} filter{filters.length !== 1 ? 's' : ''}
                  </span>
                )}
                {isGrouped && (
                  <span style={{ fontSize: 11, color: '#7c3aed', background: 'var(--icon-bg-purple)', borderRadius: 10, padding: '2px 9px', fontWeight: 600 }}>Grouped</span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-ghost" onClick={handleRun} style={{ fontSize: 12 }}><RefreshCw size={12} /> Refresh</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleExport('csv')} style={{ fontSize: 12 }}><Download size={12} /> CSV</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleExport('xlsx')} style={{ fontSize: 12 }}><Download size={12} /> XLSX</button>
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {results.data.length === 0 ? (
                  <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-faint)' }}>
                    <Info size={36} style={{ margin: '0 auto 14px', opacity: 0.5 }} />
                    <div className="rc-empty-title" style={{ fontWeight: 600, marginBottom: 6 }}>No records match your filters</div>
                    <div style={{ fontSize: 13 }}>Try adjusting or removing some filters</div>
                  </div>
                ) : (
                  <table className="data-table" style={{ width: '100%', tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        {(results.fields || []).map(col => {
                          const ov = colOverrides[col.key] || {};
                          const label = (ov.label !== undefined && ov.label !== '') ? ov.label : col.label;
                          const isNum = col.type === 'number' || (ov.format || col.format) === 'currency';
                          return <th key={col.key} style={{ textAlign: isNum ? 'right' : 'left', cursor: 'default' }}>{label}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, ri) => (
                        <tr key={ri}>
                          {(results.fields || []).map(col => {
                            const ov  = colOverrides[col.key] || {};
                            const fm  = { ...col, format: ov.format || col.format };
                            const raw = row[col.key];
                            const isNum = col.type === 'number' || fm.format === 'currency';
                            const isNeg = isNum && Number(raw) < 0;
                            return (
                              <td key={col.key} style={{ textAlign: isNum ? 'right' : 'left', color: isNeg ? 'var(--text-error)' : undefined, whiteSpace: 'nowrap' }}>
                                {formatCell(raw, fm)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {summaryRow && (
                        <tr>
                          {(results.fields || []).map((col, ci) => {
                            const has = summaryRow[col.key] !== undefined;
                            const ov  = colOverrides[col.key] || {};
                            const fm  = { ...col, format: ov.format || col.format };
                            const isNum = col.type === 'number' || fm.format === 'currency';
                            return (
                              <td key={col.key} style={{ fontWeight: 800, background: 'var(--bg-primary)', color: has ? '#60a5fa' : 'var(--text-secondary)', textAlign: isNum ? 'right' : 'left', whiteSpace: 'nowrap', borderTop: '2px solid var(--border-color)' }}>
                                {ci === 0 && !has ? 'TOTALS' : (has ? formatCell(summaryRow[col.key], fm) : '')}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {totalPages > 1 && (
                <div className="rc-pagination" style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setPreviewPage(1)} disabled={previewPage === 1}>«</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setPreviewPage(p => Math.max(1, p - 1))} disabled={previewPage === 1}>‹</button>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>Page {previewPage} of {totalPages}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))} disabled={previewPage === totalPages}>›</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setPreviewPage(totalPages)} disabled={previewPage === totalPages}>»</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Save Modal ─────────────────────────────────────────── */}
      {saveModal && (
        <div className="modal-overlay" onClick={() => setSaveModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><Save size={17} style={{ verticalAlign: 'middle', marginRight: 7 }} />Save Report</span>
              <button onClick={() => setSaveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div>
                <label className="form-label">Report Name *</label>
                <input className="form-input" value={reportName} onChange={e => setReportName(e.target.value)} placeholder="My Report" autoFocus />
              </div>
              <div>
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input" value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows={3}
                  placeholder="What does this report show?" style={{ resize: 'vertical' }} />
              </div>
              {saveError && (
                <div style={{ background: 'var(--bg-error)', color: 'var(--text-error)', borderRadius: 8, padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} className="rc-error-msg">
                  <AlertCircle size={14} />{saveError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSaveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveLoading || !reportName.trim()}>
                {saveLoading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                {currentSavedId ? 'Update' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export All Modal ───────────────────────────────────── */}
      {exportModal && (
        <div className="modal-overlay" onClick={() => setExportModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><FileDown size={17} style={{ verticalAlign: 'middle', marginRight: 7 }} />Export All Rows</span>
              <button onClick={() => setExportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#93c5fd' }}>
                This will export <strong>all matching rows</strong> (up to 100,000) in the background.
                {results?.total != null && results.total > 0 && (
                  <span> Current query matches <strong>{results.total.toLocaleString()}</strong> rows.</span>
                )}
                {results?.total > 100000 && (
                  <div style={{ marginTop: 6, color: '#fbbf24' }}>
                    <AlertCircle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Results exceed 100,000 row limit. The export will be capped.
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Format</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['csv', 'xlsx'].map(fmt => (
                    <label key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                      <input type="radio" name="exportFmt" value={fmt} checked={exportFormat === fmt} onChange={() => setExportFormat(fmt)} />
                      {fmt.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Email when ready (optional)</label>
                <input className="form-input" type="email" value={exportEmail} onChange={e => setExportEmail(e.target.value)}
                  placeholder="user@example.com" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <Mail size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                  Leave blank to download manually from Export History.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setExportModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleExportAll} disabled={exportSending || !tableKey}>
                {exportSending ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</> : <><FileDown size={13} /> Start Export</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export History Panel ────────────────────────────────── */}
      {showExportHistory && (
        <div className="rc-flyout" style={{ position: 'absolute', top: 54, right: 16, zIndex: 310, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', width: 440, maxHeight: 520, overflowY: 'auto' }}>
          <div className="rc-flyout-header" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
            <span className="rc-flyout-title" style={{ fontWeight: 700, fontSize: 14 }}><Clock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Export History</span>
            <button onClick={() => setShowExportHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>
          {exportJobs.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No exports yet. Use "Export All" to start one.</div>
          )}
          {exportJobs.map(job => (
            <div key={job.report_jobs_id} style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{job.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
                  background: job.status === 'completed' ? 'rgba(34,197,94,0.15)' : job.status === 'failed' ? 'rgba(239,68,68,0.15)' : job.status === 'running' ? 'rgba(59,130,246,0.15)' : 'rgba(250,204,21,0.15)',
                  color: job.status === 'completed' ? '#4ade80' : job.status === 'failed' ? '#f87171' : job.status === 'running' ? '#60a5fa' : '#facc15',
                }}>
                  {job.status === 'running' && <Loader size={10} style={{ verticalAlign: 'middle', marginRight: 3, animation: 'spin 1s linear infinite' }} />}
                  {job.status === 'completed' && <CheckCircle size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />}
                  {job.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{job.format?.toUpperCase()}</span>
                {job.total_rows != null && <span>{job.total_rows.toLocaleString()} rows</span>}
                {job.file_size != null && <span>{(job.file_size / 1024).toFixed(0)} KB</span>}
                <span>{new Date(job.created_at).toLocaleString()}</span>
              </div>
              {job.error_message && (
                <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '4px 8px' }}>{job.error_message}</div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {job.status === 'completed' && job.file_path && (
                  <a href={downloadReportJob(job.report_jobs_id)} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                    <Download size={12} /> Download
                  </a>
                )}
                {job.email_sent && (
                  <span style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Mail size={11} /> Emailed
                  </span>
                )}
                <button onClick={() => handleDeleteJob(job.report_jobs_id)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
