/**
 * @file Admin entity purge tool with cascade preview.
 * @module AdminPurge
 *
 * Allows administrators to preview and permanently delete entities (vendors, invoices, inventory) with full cascade dependency display. Supports pasting IDs from Excel.
 */
import React, { useState, useContext, useCallback, useRef } from 'react';
import { adminPurgePreview, adminPurgeEntity } from '../api';
import { PageTitleContext } from '../PageTitleContext';
import {
  Trash2, Search, CheckCircle2, XCircle, AlertTriangle,
  FileText, FileBox, Package, Database, Plus, X, Loader,
  Building2, ShoppingCart, Receipt,
} from 'lucide-react';

const ENTITY_CONFIG = {
  vendors:   { label: 'Vendor',    plural: 'Vendors',   icon: Building2, placeholder: 'e.g. 1, 5, 12 or vendor name' },
  invoices:  { label: 'Invoice',   plural: 'Invoices',  icon: Receipt,   placeholder: 'e.g. 1, 736226190, INV-ATT-202510-001' },
  inventory: { label: 'Inventory', plural: 'Inventory',  icon: Package,    placeholder: 'e.g. 50, 51 or circuit ID' },
};

const DEP_ICON = {
  accounts:   FileBox,
  invoices:   Receipt,
  inventory:  Package,
  line_items: FileText,
};

function DepIcon({ table }) {
  const Icon = DEP_ICON[table] || Database;
  return <Icon size={16} color="#dc2626" />;
}

export default function AdminPurge() {
  const { setTitle } = useContext(PageTitleContext) || {};
  const [entity, setEntity] = useState('vendors');
  const [idsInput, setIdsInput] = useState('');
  const [items, setItems] = useState([]); // { id, status, preview, result, error }
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [confirmState, setConfirmState] = useState(null); // { message, detail, onConfirm, onCancel }
  const resolveRef = useRef(null);

  const confirm = useCallback((message, detail = '') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        message,
        detail,
        onConfirm: () => { setConfirmState(null); resolve(true); },
        onCancel:  () => { setConfirmState(null); resolve(false); },
      });
    });
  }, []);

  useState(() => { setTitle?.('Purge Tool'); }, [setTitle]);

  // Parse IDs from any delimiter: commas, tabs, spaces, newlines, semicolons
  const parseIds = (raw) => {
    return [...new Set(
      raw.split(/[\s,;\t\r\n]+/)
        .map(s => s.trim())
        .filter(Boolean)
    )];
  };

  // Scan all entered IDs
  // Map label back to entity key for auto-detect
  const LABEL_TO_ENTITY = { Vendor: 'vendors', Invoice: 'invoices', Inventory: 'inventory' };

  const handleScan = async () => {
    const ids = parseIds(idsInput);
    if (ids.length === 0) return;

    setScanning(true);
    const newItems = ids.map(id => ({ id, status: 'scanning', preview: null, result: null, error: null }));
    setItems(newItems);

    const results = await Promise.allSettled(
      ids.map(id => adminPurgePreview(entity, id))
    );

    // Check for cross-entity suggestions and auto-retry
    const mapped = ids.map((id, i) => {
      const r = results[i];
      if (r.status === 'fulfilled') {
        return { id, status: 'previewed', preview: r.value.data, result: null, error: null, suggestedEntity: null };
      }
      const msg = r.reason?.response?.data?.error || r.reason?.message || 'Failed to scan';
      const match = msg.match(/found as (\w+) \(switch entity type\)/);
      const suggestedEntity = match ? LABEL_TO_ENTITY[match[1]] : null;
      return { id, status: 'error', preview: null, result: null, error: msg, suggestedEntity };
    });

    // If every failed item points to the same entity, auto-switch and retry
    const failedWithSuggestion = mapped.filter(m => m.suggestedEntity);
    const uniqueSuggestions = [...new Set(failedWithSuggestion.map(m => m.suggestedEntity))];
    if (failedWithSuggestion.length > 0 && uniqueSuggestions.length === 1) {
      const correctEntity = uniqueSuggestions[0];
      setEntity(correctEntity);

      // Re-scan everything with the correct entity
      const retryResults = await Promise.allSettled(
        ids.map(id => adminPurgePreview(correctEntity, id))
      );
      setItems(ids.map((id, i) => {
        const r = retryResults[i];
        if (r.status === 'fulfilled') {
          return { id, status: 'previewed', preview: r.value.data, result: null, error: null };
        }
        const msg = r.reason?.response?.data?.error || r.reason?.message || 'Failed to scan';
        return { id, status: 'error', preview: null, result: null, error: msg };
      }));
    } else {
      setItems(mapped.map(({ suggestedEntity, ...rest }) => rest));
    }
    setScanning(false);
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Delete a single item
  const deleteOne = async (idx) => {
    const item = items[idx];
    if (!item?.preview) return;

    const msg = item.preview.totalDependentRecords > 0
      ? `Delete "${item.preview.name}" and ${item.preview.totalDependentRecords} dependent records?`
      : `Delete "${item.preview.name}"?`;
    if (!(await confirm(msg, 'This action cannot be undone.'))) return;

    setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'deleting' } : it));
    try {
      const r = await adminPurgeEntity(entity, item.id);
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'deleted', result: r.data } : it));
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'error', error: msg } : it));
    }
  };

  // Delete all previewed items
  const deleteAll = async () => {
    const previewed = items.filter(i => i.status === 'previewed' && i.preview);
    if (previewed.length === 0) return;

    const totalDeps = previewed.reduce((s, i) => s + (i.preview?.totalDependentRecords || 0), 0);
    const msg = `Permanently delete ${previewed.length} ${previewed.length !== 1 ? ENTITY_CONFIG[entity].plural.toLowerCase() : ENTITY_CONFIG[entity].label.toLowerCase()} and ${totalDeps} total dependent records?`;
    if (!(await confirm(msg, 'This action cannot be undone.'))) return;

    setDeleting(true);
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (item.status !== 'previewed' || !item.preview) continue;

      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'deleting' } : it));
      try {
        const r = await adminPurgeEntity(entity, item.id);
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'deleted', result: r.data } : it));
      } catch (e) {
        const msg = e.response?.data?.error || e.message;
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'error', error: msg } : it));
      }
    }
    setDeleting(false);
  };

  const previewedItems = items.filter(i => i.status === 'previewed');
  const deletedItems = items.filter(i => i.status === 'deleted');
  const errorItems = items.filter(i => i.status === 'error');
  const EntityIcon = ENTITY_CONFIG[entity].icon;

  // Aggregate dependency totals across all previewed items
  const aggregatedDeps = {};
  previewedItems.forEach(item => {
    (item.preview?.dependencies || []).forEach(dep => {
      aggregatedDeps[dep.table] = aggregatedDeps[dep.table] || { table: dep.table, label: dep.label, count: 0 };
      aggregatedDeps[dep.table].count += dep.count;
    });
  });
  const aggregatedDepsList = Object.values(aggregatedDeps).sort((a, b) => b.count - a.count);
  const totalAggDeps = aggregatedDepsList.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
        borderRadius: 16, padding: '28px 32px', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={24} color="#fca5a5" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Cascade Purge Tool</h1>
            <p style={{ fontSize: 13, color: '#fecaca', margin: 0 }}>
              Remove vendors, invoices, or inventory with all dependent records
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(252,165,165,0.3)' }}>
          <AlertTriangle size={14} color="#fca5a5" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>Destructive — cannot be undone</span>
        </div>
      </div>

      {/* Input Section */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Search size={15} /> Select & Scan
          </span>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Entity type selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Entity Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(ENTITY_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const active = entity === key;
                  return (
                    <button key={key} onClick={() => { setEntity(key); setItems([]); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
                        background: active ? '#eff6ff' : '#fff',
                        color: active ? '#1d4ed8' : '#64748b',
                        transition: 'all 0.15s',
                      }}>
                      <Icon size={15} /> {cfg.plural}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* IDs input */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                {ENTITY_CONFIG[entity].label} IDs
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <textarea
                  value={idsInput}
                  onChange={e => setIdsInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleScan(); } }}
                  placeholder={ENTITY_CONFIG[entity].placeholder}
                  className="form-input"
                  rows={2}
                  style={{ fontSize: 13, padding: '8px 12px', flex: 1, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <button className="btn btn-primary" onClick={handleScan}
                  disabled={scanning || !idsInput.trim()}
                  style={{ fontSize: 13, whiteSpace: 'nowrap', marginTop: 2 }}>
                  <Search size={14} /> {scanning ? 'Scanning...' : 'Scan All'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Paste from Excel or type IDs / numbers separated by commas, spaces, tabs, or newlines
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {items.length > 0 && (
        <>
          {/* Aggregate Summary */}
          {previewedItems.length > 0 && (
            <div style={{
              padding: '16px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
              border: '1px solid #fecaca',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
                  {previewedItems.length} {previewedItems.length !== 1 ? ENTITY_CONFIG[entity].plural.toLowerCase() : ENTITY_CONFIG[entity].label.toLowerCase()} ready for deletion
                </div>
                {aggregatedDepsList.length > 0 && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {aggregatedDepsList.map(dep => (
                      <span key={dep.table}>
                        <strong>{dep.count}</strong> {dep.label}
                      </span>
                    ))}
                    <span style={{ fontWeight: 800, color: '#dc2626' }}>({totalAggDeps} total dependent)</span>
                  </div>
                )}
              </div>
              <button className="btn btn-danger" onClick={deleteAll}
                disabled={deleting}
                style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                <Trash2 size={14} />
                {deleting ? 'Deleting...' : `Delete All ${previewedItems.length} Items`}
              </button>
            </div>
          )}

          {/* Item Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="page-card" style={{
                opacity: item.status === 'deleted' ? 0.55 : 1,
                borderLeft: `4px solid ${
                  item.status === 'deleted' ? '#10b981' :
                  item.status === 'error' ? '#ef4444' :
                  item.status === 'deleting' || item.status === 'scanning' ? '#3b82f6' :
                  item.preview?.totalDependentRecords > 0 ? '#f59e0b' : '#e2e8f0'
                }`,
              }}>
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    {/* Left: entity info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: item.status === 'deleted' ? '#f0fdf4' :
                                    item.status === 'error' ? '#fef2f2' : '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.status === 'scanning' || item.status === 'deleting' ? (
                          <Loader size={18} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : item.status === 'deleted' ? (
                          <CheckCircle2 size={18} color="#10b981" />
                        ) : item.status === 'error' ? (
                          <XCircle size={18} color="#ef4444" />
                        ) : (
                          <EntityIcon size={18} color="#64748b" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          {item.preview?.name || item.result?.name || `${ENTITY_CONFIG[entity].label} #${item.id}`}
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', marginLeft: 6 }}>ID: {item.id}</span>
                        </div>
                        {/* Status line */}
                        {item.status === 'scanning' && (
                          <span style={{ fontSize: 12, color: '#3b82f6' }}>Scanning dependencies...</span>
                        )}
                        {item.status === 'deleting' && (
                          <span style={{ fontSize: 12, color: '#3b82f6' }}>Deleting...</span>
                        )}
                        {item.status === 'previewed' && item.preview && (
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            {item.preview.totalDependentRecords > 0
                              ? <span style={{ color: '#dc2626', fontWeight: 700 }}>{item.preview.totalDependentRecords} dependent records</span>
                              : <span style={{ color: '#10b981' }}>No dependencies</span>
                            }
                            {item.preview.dependencies.length > 0 && (
                              <span style={{ marginLeft: 8 }}>
                                ({item.preview.dependencies.map(d => `${d.count} ${d.label}`).join(', ')})
                              </span>
                            )}
                          </span>
                        )}
                        {item.status === 'deleted' && item.result && (
                          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                            Deleted — {item.result.dependentsDeleted} dependent records removed
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span style={{ fontSize: 12, color: '#ef4444' }}>{item.error}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.status === 'previewed' && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteOne(idx)}
                          style={{ fontSize: 11 }}>
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                      {(item.status === 'previewed' || item.status === 'error') && (
                        <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.id)}
                          style={{ fontSize: 11, color: '#94a3b8' }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded dependency detail for previewed items */}
                  {item.status === 'previewed' && item.preview?.dependencies.length > 0 && (
                    <div style={{
                      marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9',
                      display: 'flex', gap: 8, flexWrap: 'wrap',
                    }}>
                      {item.preview.dependencies.map(dep => (
                        <div key={dep.table} style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                          borderRadius: 6, background: '#fef2f2', fontSize: 11,
                        }}>
                          <DepIcon table={dep.table} />
                          <span style={{ fontWeight: 700 }}>{dep.count}</span>
                          <span style={{ color: '#64748b' }}>{dep.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Completion summary */}
          {deletedItems.length > 0 && previewedItems.length === 0 && (
            <div style={{
              padding: '16px 20px', borderRadius: 12,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle2 size={20} color="#10b981" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
                  Purge complete — {deletedItems.length} {deletedItems.length !== 1 ? ENTITY_CONFIG[entity].plural.toLowerCase() : ENTITY_CONFIG[entity].label.toLowerCase()} deleted
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {deletedItems.reduce((s, i) => s + (i.result?.dependentsDeleted || 0), 0)} total dependent records removed
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm Dialog */}
      {confirmState && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={confirmState.onCancel}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px',
            maxWidth: 440, width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            animation: 'purge-confirm-in 0.15s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Confirm Deletion</div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, marginBottom: 8 }}>
              {confirmState.message}
            </div>
            {confirmState.detail && (
              <div style={{
                fontSize: 12, color: '#dc2626', fontWeight: 600,
                padding: '8px 12px', borderRadius: 8,
                background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <AlertTriangle size={13} /> {confirmState.detail}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn" onClick={confirmState.onCancel}
                style={{ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmState.onConfirm}
                style={{ fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes purge-confirm-in { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
