import { useState, useMemo, useEffect, useCallback } from 'react';

/**
 * Shared hook for all CRUD list pages.
 *
 * @param {Object}   api           - { list, create?, update?, delete? }
 * @param {string}   idKey         - Primary key field name, e.g. 'orders_id'
 * @param {Object}   emptyForm     - Default form values for "New" modal
 * @param {Object}   filterConfig  - { fieldKey: 'text'|'select'|'date'|'boolean' }
 * @param {Object}   related       - { accounts: getAccountsFn, ... }
 * @param {Function} defaultValues - (related) => overrides for openNew
 * @param {Function} beforeSave    - (form, editing) => transformed payload
 */
export default function useCrudTable({
  api,
  idKey,
  emptyForm = {},
  filterConfig = {},
  related = {},
  defaultValues,
  beforeSave,
}) {
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
    () => Object.fromEntries(Object.keys(filterConfig).map(k => [k, ''])),
    [] // filterConfig is static per page
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(filterInit);
  const setFilter    = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const clearFilters = ()     => setFilters(filterInit);
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

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
  const [pageSize, setPageSize] = useState(10);

  /* ── processed data (filter → sort) ──────────────────── */
  const processedData = useMemo(() => {
    let result = data.filter(row =>
      Object.entries(filters).every(([key, val]) => {
        if (!val) return true;
        const cell = row[key];
        const type = filterConfig[key] || 'text';
        if (type === 'select')  return cell === val;
        if (type === 'date')    return (cell || '').includes(val);
        if (type === 'boolean') return val === 'yes' ? !!cell : !cell;
        // text — case-insensitive includes
        return (cell ?? '').toString().toLowerCase().includes(val.toLowerCase());
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
    if (pageSize === 'all') return processedData;
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(id);
      load();
      showToast('Record deleted.');
    } catch {
      showToast('Delete failed.', false);
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
    setFilters(filtersObj);
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
    openNew, openEdit, handleSave, handleDelete,
    // toast
    toast, showToast, renderToast,
    // misc
    load, tableProps,
  };
}
