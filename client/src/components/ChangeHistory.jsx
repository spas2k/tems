import React, { useState, useEffect } from 'react';
import { Clock, PlusCircle, Edit3, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { getAuditHistory } from '../api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

// ── Config ────────────────────────────────────────────────
const ACTION_CONFIG = {
  CREATE: { color: '#16a34a', bg: '#f0fdf4', label: 'Created', Icon: PlusCircle },
  UPDATE: { color: '#2563eb', bg: '#eff6ff', label: 'Updated', Icon: Edit3      },
  DELETE: { color: '#dc2626', bg: '#fef2f2', label: 'Deleted', Icon: Trash2     },
};

const SKIP_FIELDS = new Set([
  'updated_at', 'created_at', 'password_hash', 'sso_subject',
  'accounts_id', 'cir_id', 'contracts_id', 'disputes_id',
  'invoices_id', 'orders_id', 'usoc_codes_id', 'locations_id',
  'vendor_remit_id', 'audit_log_id',
]);

function fieldLabel(key) {
  return key.replace(/_id$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatVal(key, val) {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if ((key.endsWith('_at') || key.endsWith('_date')) && dayjs(val).isValid()) {
    return dayjs(val).format('MMM D, YYYY');
  }
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function getDiff(oldObj, newObj) {
  if (!oldObj || !newObj) return [];
  const changes = [];
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of keys) {
    if (SKIP_FIELDS.has(key)) continue;
    const o = oldObj[key];
    const n = newObj[key];
    if (String(o ?? '') !== String(n ?? '')) {
      changes.push({ key, old: o, new: n });
    }
  }
  changes.sort((a, b) => (b.key === 'status' ? 1 : 0) - (a.key === 'status' ? 1 : 0));
  return changes;
}

// ── Single table row ──────────────────────────────────────
function HistoryRow({ entry }) {
  const [open, setOpen] = useState(false);
  const cfg = ACTION_CONFIG[entry.action] || ACTION_CONFIG.UPDATE;
  const Icon = cfg.Icon;

  const oldValues = typeof entry.old_values === 'string' ? JSON.parse(entry.old_values) : entry.old_values;
  const newValues = typeof entry.new_values === 'string' ? JSON.parse(entry.new_values) : entry.new_values;
  const diff = entry.action === 'UPDATE' ? getDiff(oldValues, newValues) : [];
  const statusChange = diff.find(d => d.key === 'status');
  const user = entry.display_name || entry.email || 'System';

  return (
    <>
      <tr>
        {/* Action badge */}
        <td style={{ whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 99 }}>
            <Icon size={11} />
            {cfg.label}
          </span>
        </td>

        {/* Summary */}
        <td>
          {entry.action === 'CREATE' && <span style={{ color: '#94a3b8' }}>Record created</span>}
          {entry.action === 'DELETE' && <span style={{ color: '#94a3b8' }}>Record deleted</span>}
          {entry.action === 'UPDATE' && diff.length === 0 && <span style={{ color: '#94a3b8' }}>No field changes detected</span>}
          {entry.action === 'UPDATE' && diff.length > 0 && (
            statusChange
              ? <>Status <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{formatVal('status', statusChange.old)}</span>{' → '}<span style={{ color: cfg.color, fontWeight: 700 }}>{formatVal('status', statusChange.new)}</span>{diff.length > 1 ? <span style={{ opacity: 0.5 }}> +{diff.length - 1} more</span> : null}</>
              : <>{diff.length} field{diff.length !== 1 ? 's' : ''} changed</>
          )}
        </td>

        {/* User */}
        <td style={{ whiteSpace: 'nowrap' }}>{user}</td>

        {/* Timestamp */}
        <td style={{ whiteSpace: 'nowrap', opacity: 0.7 }} title={dayjs(entry.created_at).format('MMM D, YYYY h:mm A')}>
          {dayjs(entry.created_at).fromNow()}
        </td>

        {/* Expand toggle */}
        <td style={{ width: 32, padding: '4px' }}>
          {diff.length > 0 && (
            <button
              onClick={() => setOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 }}
              title={open ? 'Collapse' : 'Expand changes'}
            >
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded diff row */}
      {open && diff.length > 0 && (
        <tr>
          <td colSpan={5} style={{ padding: '8px 16px 10px 28px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 560 }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'left', padding: '2px 12px 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'none', border: 'none' }}>Field</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'left', padding: '2px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'none', border: 'none' }}>Before</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'left', padding: '2px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'none', border: 'none' }}>After</th>
                </tr>
              </thead>
              <tbody>
                {diff.map(({ key, old: o, new: n }) => (
                  <tr key={key}>
                    <td style={{ fontSize: 12, fontWeight: 600, padding: '3px 12px 3px 0', whiteSpace: 'nowrap', background: 'none', border: 'none' }}>{fieldLabel(key)}</td>
                    <td style={{ fontSize: 12, color: '#dc2626', padding: '3px 12px', textDecoration: 'line-through', background: 'none', border: 'none' }}>{formatVal(key, o)}</td>
                    <td style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, padding: '3px 12px', background: 'none', border: 'none' }}>{formatVal(key, n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────
export default function ChangeHistory({ resource, resourceId, refreshKey = 0 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resourceId) return;
    setLoading(true);
    getAuditHistory(resource, resourceId)
      .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [resource, resourceId, refreshKey]);

  return (
    <div className="page-card" style={{ marginTop: 16 }}>
      <div className="page-card-header">
        <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color="#64748b" />
          Change History
        </span>
        <span className="filter-count">{history.length} event{history.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
      ) : history.length === 0 ? (
        <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          <Clock size={22} style={{ marginBottom: 8, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 600, marginBottom: 2 }}>No history yet</div>
          <div style={{ fontSize: 11 }}>Changes made to this record will appear here.</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Summary</th>
              <th>By</th>
              <th>When</th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {history.map(entry => (
              <HistoryRow key={entry.audit_log_id} entry={entry} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
