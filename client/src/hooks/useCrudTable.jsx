/**
 * @file Universal CRUD list-page hook for data tables.
 * @module useCrudTable
 *
 * Handles API data loading, related lookups, client-side multi-operator
 * filtering, sorting, pagination, CRUD modal state, bulk update, toast
 * notifications, saved filters (localStorage), and assembles a tableProps
 * object ready for <DataTable>.
 *
 * @param {Object} config - Configuration object
 * @param {Object} config.api - { list, create?, update?, delete? } — API functions
 * @param {string} config.idKey - Primary key field name (default "id")
 * @param {Object} config.emptyForm - Template for new record form state
 * @param {Array} config.filterConfig - Filter field definitions for the DataTable filter row
 * @param {Array} config.related - Array of { key, api } for loading related lookup data
 * @param {Object} config.defaultValues - Default field values for new records
 * @param {Function} config.beforeSave - Transform function called on form data before API submit
 * @param {string} config.resourceName - Permission resource name for canWrite checks
 *
 * @returns {Object} { data, related, loading, processedData, paginatedData, filters, setFilter, clearFilters, hasActiveFilters, showFilters, setShowFilters, sort, toggleSort, arrow, page, setPage, pageSize, setPageSize, modal, setModal, editing, form, setField, openNew, openEdit, handleSave, handleDelete, handleBulkUpdate, toast, showToast, renderToast, load, tableProps }
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { bulkUpdate as bulkUpdateApi } from '../api';

// ── Filter engine ─────────────────────────────────────────────────────────────

/** Default operator for each filter type */
const DEFAULT_OP = { text: 'contains', select: 'equals', date: 'on', boolean: 'equals', number: 'equals' };

/** Operators that are active with no value (no text input needed) */
const NO_VALUE_OPS = new Set([
  'is_empty', 'not_empty', 'this_week', 'this_month', 'this_quarter', 'this_year',
]);

/**
 * Normalise a stored filter value (old plain-string or new {op,value} object)
 * into { op, value }.
 */
function normalizeFilter(f, type = 'text') {
  if (!f && f !== 0) return { op: DEFAULT_OP[type] || 'contains', value: '' };
  if (typeof f === 'string') return { op: DEFAULT_OP[type] || 'contains', value: f };
  return { op: f.op || DEFAULT_OP[type] || 'contains', value: f.value ?? '' };
}

/** Returns true if this filter should actually narrow results */
function isFilterActive(f, type) {
  const { op, value } = normalizeFilter(f, type);
  if (NO_VALUE_OPS.has(op)) return true;
  return value !== '';
}

/** Core per-cell predicate */
function applyFilter(cell, op, value, type) {
  // ops with no value
  if (op === 'is_empty')  return cell === null || cell === undefined || cell === '';
  if (op === 'not_empty') return cell !== null  && cell !== undefined && cell !== '';

  // boolean shortcut
  if (type === 'boolean') {
    if (value === 'true')  return !!cell;
    if (value === 'false') return !cell;
    return true;
  }

  // date relative ops (no text value needed)
  if (op === 'this_week') {
    if (!cell) return false;
    const d = new Date(cell), now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
    const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  }
  if (op === 'this_month') {
    if (!cell) return false;
    const d = new Date(cell), now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (op === 'this_quarter') {
    if (!cell) return false;
    const d = new Date(cell), now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
  }
  if (op === 'this_year') {
    if (!cell) return false;
    return new Date(cell).getFullYear() === new Date().getFullYear();
  }

  // between (value encoded as "from|to")
  if (op === 'between') {
    const [from, to] = value.split('|');
    const cv = type === 'number' ? Number(cell) : String(cell ?? '');
    if (from && to)  return cv >= (type === 'number' ? Number(from) : from) && cv <= (type === 'number' ? Number(to) : to);
    if (from)        return cv >= (type === 'number' ? Number(from) : from);
    if (to)          return cv <= (type === 'number' ? Number(to)   : to);
    return true;
  }

  // number comparisons
  if (type === 'number') {
    const cv = Number(cell), val = Number(value);
    if (op === 'equals')     return cv === val;
    if (op === 'not_equals') return cv !== val;
    if (op === 'gt')         return cv > val;
    if (op === 'gte')        return cv >= val;
    if (op === 'lt')         return cv < val;
    if (op === 'lte')        return cv <= val;
  }

  // string ops
  const str = (cell ?? '').toString().toLowerCase();
  const val = value.toLowerCase();
  switch (op) {
    case 'contains':     return str.includes(val);
    case 'not_contains': return !str.includes(val);
    case 'starts_with':  return str.startsWith(val);
    case 'ends_with':    return str.endsWith(val);
    case 'equals':       return str === val;
    case 'not_equals':   return str !== val;
    case 'on':           return str.includes(val);
    case 'not_on':       return !str.includes(val);
    case 'before':       return cell && String(cell) < value;
    case 'after':        return cell && String(cell) > value;
    case 'in_set': {
      const set = value.split(/[,\n]/).map(v => v.trim().toLowerCase()).filter(Boolean);
      return set.length === 0 || set.includes(str);
    }
    case 'not_in_set': {
      const set = value.split(/[,\n]/).map(v => v.trim().toLowerCase()).filter(Boolean);
      return set.length === 0 || !set.includes(str);
    }
    default: return str.includes(val);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Shared hook for all CRUD list pages.
 *
 * @param {Object}   api           - { list, create?, update?, delete? }
 * @param {string}   idKey         - Primary key field name, e.g. 'orders_id'
 * @param {Object}   emptyForm     - Default form values for "New" modal
 * @param {Object}   filterConfig  - { fieldKey: 'text'|'select'|'date'|'boolean'|'number' }
 * @param {Object}   related       - { accounts: getAccountsFn, ... }
 * @param {Function} defaultValues - (related) => overrides for openNew
 * @param {Function} beforeSave    - (form, editing) => transformed payload
 * @param {string}   resourceName  - API resource path segment, e.g. 'vendors' — enables bulk update
 */
export default function useCrudTable({
  api,
  idKey,
  emptyForm = {},
  filterConfig = {},
  related = {},
  defaultValues,
  beforeSave,
  resourceName,
}) {
  /* ── confirm dialog ───────────────────────────────────── */
  const confirm = useConfirm();
  const { user } = useAuth();

  /* ── core data ───────────────────────────────────────── */
  const [data, setData] = useState([]);
  const [relatedData, setRelatedData] = useState(
    Object.fromEntries(Object.keys(related).map(k => [k, []]))
  );
  const [loading, setLoading] = useState(true);

  /* ── CRUD state ──────────────────────────────────────── */
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(emptyForm);
  const [toast, setToast]     = useState(null);

  /* ── filters ─────────────────────────────────────────── */
  const filterInit = useMemo(
    () => Object.fromEntries(
      Object.keys(filterConfig).map(k => [k, { op: DEFAULT_OP[filterConfig[k]] || 'contains', value: '' }])
    ),
    [] // filterConfig is static per page
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(filterInit);
  const setFilter    = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const clearFilters = ()     => setFilters(filterInit);
  const hasActiveFilters = Object.entries(filters).some(([k, f]) =>
    isFilterActive(f, filterConfig[k] || 'text')
  );

  /* ── apply pre-set filters from navigation state ── */
  /* Runs whenever location.key changes so same-page favorite switches work */
  const location = useLocation();
  useEffect(() => {
    if (location.state?.filters) {
      // migrate plain-string values from navigation state into {op,value} objects
      const wrapped = Object.fromEntries(
        Object.entries(location.state.filters).map(([k, v]) => [
          k,
          typeof v === 'object' && v !== null && 'op' in v
            ? v
            : { op: DEFAULT_OP[filterConfig[k] || 'text'] || 'contains', value: String(v) },
        ])
      );
      // Reset to defaults first so filters not in the favorite are cleared
      setFilters({ ...filterInit, ...wrapped });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  /* ── sort ────────────────────────────────────────────── */
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const toggleSort = key =>
    setSort(p => p.key === key
      ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' });
  const arrow = key =>
    sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  /* ── pagination ──────────────────────────────────────── */
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(() => user?.preferences?.rows_per_page || 26);

  /* ── processed data (filter → sort) ──────────────────── */
  const processedData = useMemo(() => {
    let result = data.filter(row =>
      Object.entries(filters).every(([key, filterObj]) => {
        const type = filterConfig[key] || 'text';
        const { op, value } = normalizeFilter(filterObj, type);
        // skip inactive filters
        if (!NO_VALUE_OPS.has(op) && value === '') return true;
        return applyFilter(row[key], op, value, type);
      })
    );
    if (sort.key) {
      result = [...result].sort((a, b) => {
        let av = a[sort.key] ?? '', bv = b[sort.key] ?? '';
        const an = Number(av), bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn) && av !== '' && bv !== '')
          return sort.dir === 'asc' ? an - bn : bn - an;
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [data, filters, sort]);

  /* ── paginated slice ─────────────────────────────────── */
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize]);

  // reset to page 1 on filter change
  const filterKey = JSON.stringify(filters);
  useEffect(() => { setPage(1); }, [filterKey]);

  /* ── data loading ────────────────────────────────────── */
  const load = useCallback(() => {
    setLoading(true);
    const relPromises = Object.entries(related).map(([key, fn]) =>
      fn().then(r => [key, r.data])
    );
    Promise.all([api.list(), ...relPromises])
      .then(([listRes, ...relResults]) => {
        setData(listRes.data);
        setRelatedData(Object.fromEntries(relResults));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, []);

  /* ── form helpers ────────────────────────────────────── */
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  /* ── CRUD handlers ───────────────────────────────────── */
  const openNew = (overrides = {}) => {
    setEditing(null);
    const defaults = defaultValues ? defaultValues(relatedData) : {};
    setForm({ ...emptyForm, ...defaults, ...overrides });
    setModal(true);
  };

  const openEdit = (rec) => {
    const cleaned = { ...rec };
    // Auto-trim ISO date strings → YYYY-MM-DD for <input type="date">
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(cleaned[key])) {
        cleaned[key] = cleaned[key].split('T')[0];
      }
    });
    setEditing(rec);
    setForm(cleaned);
    setModal(true);
  };

  const handleSave = async () => {
    try {
      let payload = { ...form };
      if (beforeSave) payload = beforeSave(payload, editing);
      if (editing) await api.update(editing[idKey], payload);
      else         await api.create(payload);
      setModal(false);
      load();
      showToast(editing ? 'Record updated.' : 'Record created.');
    } catch {
      showToast('Save failed.', false);
    }
  };

  const handleDelete = async (id, { skipConfirm = false } = {}) => {
    if (!skipConfirm && !(await confirm('Delete this record?'))) return;
    try {
      await api.delete(id);
      load();
      showToast('Record deleted.');
    } catch {
      showToast('Delete failed.', false);
    }
  };

  /* ── bulk update handler ────────────────────────────── */
  const handleBulkUpdate = async (ids, updates) => {
    if (!resourceName) return;
    try {
      const res = await bulkUpdateApi(resourceName, ids, updates);
      load();
      showToast(`Updated ${res.data.updated} record${res.data.updated !== 1 ? 's' : ''}.`);
    } catch {
      showToast('Bulk update failed.', false);
    }
  };

  /* ── toast renderer ──────────────────────────────────── */
  const renderToast = () =>
    toast
      ? <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`}>{toast.msg}</div>
      : null;

  /* ── saved filters ─────────────────────────────────── */
  const storageKey = `tems-saved-filters-${idKey}`;
  const [savedFilters, setSavedFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
  });
  const saveFilter = (name, filtersObj) => {
    const updated = [...savedFilters.filter(f => f.name !== name), { name, filters: filtersObj }];
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };
  const deleteFilter = (name) => {
    const updated = savedFilters.filter(f => f.name !== name);
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };
  const loadFilter = (filtersObj) => {
    // migrate old plain-string format from localStorage
    const migrated = Object.fromEntries(
      Object.entries(filtersObj).map(([k, v]) => [
        k,
        typeof v === 'object' && v !== null && 'op' in v
          ? v
          : { op: DEFAULT_OP[filterConfig[k] || 'text'] || 'contains', value: String(v || '') },
      ])
    );
    setFilters(migrated);
    setShowFilters(true);
  };

  /* ── convenience: all props DataTable needs ──────────── */
  const tableProps = {
    idKey,
    loading,
    data: paginatedData,
    allData: processedData,
    totalItems: processedData.length,
    rawTotal: data.length,
    sort, toggleSort, arrow,
    showFilters, setShowFilters,
    filters, setFilter, clearFilters, hasActiveFilters,
    page, pageSize,
    onPageChange: setPage,
    onPageSizeChange: v => { setPageSize(v); setPage(1); },
    onEdit:   api.update ? openEdit : undefined,
    onDelete: api.delete ? row => handleDelete(row[idKey]) : undefined,
    savedFilters,
    onSaveFilter: saveFilter,
    onDeleteFilter: deleteFilter,
    onLoadFilter: loadFilter,
    onBulkUpdate: resourceName ? handleBulkUpdate : undefined,
  };

  return {
    // raw
    data, related: relatedData, loading,
    processedData, paginatedData,
    // filter / sort / pagination
    filters, setFilter, clearFilters, hasActiveFilters,
    showFilters, setShowFilters,
    sort, toggleSort, arrow,
    page, setPage, pageSize, setPageSize,
    // CRUD
    modal, setModal, editing,
    form, setField,
    openNew, openEdit, handleSave, handleDelete, handleBulkUpdate,
    // toast
    toast, showToast, renderToast,
    // misc
    load, tableProps,
  };
}
