/**
 * @file Inline bulk-update form for selected DataTable rows.
 * @module BulkUpdatePanel
 *
 * @param {Array} props.fields - Array of editable field definitions
 * @param {number} props.selectedCount - Number of currently selected rows
 * @param {Function} props.onApply - Callback with { fieldName: newValue } for touched fields
 * @param {Function} props.onClose - Callback to dismiss the panel
 */
import React, { useState, useCallback } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import LookupField from './LookupField';

/**
 * Inline bulk-update panel that appears inside DataTable's bulk-actions bar.
 *
 * Field config shape (same as CrudModal fields, with optional lookup additions):
 *   key         – form field name (matches DB column)
 *   label       – display label
 *   type        – 'text' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox'
 *   options     – string[] or {value,label}[] for selects
 *   step        – for number inputs
 *   placeholder – placeholder text
 *   lookup      – { data, idKey, displayKey, modalTitle, columns, searchableKeys, placeholder }
 *                  If set, renders a LookupField instead of a plain select.
 *   bulkDisabled – if true, this field is excluded from bulk update
 */
export default function BulkUpdatePanel({ fields, selectedCount, onApply, onClose }) {
  const [values, setValues] = useState({});
  const [dirty, setDirty] = useState({});   // tracks which fields user has touched
  const [applying, setApplying] = useState(false);

  const setField = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => ({ ...prev, [key]: true }));
  }, []);

  const clearField = useCallback((key) => {
    setValues(prev => { const next = { ...prev }; delete next[key]; return next; });
    setDirty(prev => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const dirtyCount = Object.keys(dirty).length;

  const handleApply = async () => {
    if (dirtyCount === 0) return;
    // Build payload with only touched fields
    const updates = {};
    for (const key of Object.keys(dirty)) {
      updates[key] = values[key] ?? '';
    }
    setApplying(true);
    try {
      await onApply(updates);
    } finally {
      setApplying(false);
    }
  };

  const editableFields = fields.filter(f => !f.bulkDisabled && f.key);

  const renderField = (field) => {
    const { key, label, type = 'text', options, placeholder, step, lookup } = field;
    const value = values[key] ?? '';
    const isDirty = dirty[key];

    // Custom render function (same API as CrudModal: render(form, setField))
    if (field.render) {
      return (
        <div key={key} className="bulk-field">
          <div className="bulk-field-input-wrap" style={{ position: 'relative' }}>
            {field.render(values, setField)}
            {isDirty && (
              <button className="bulk-field-clear" onClick={() => clearField(key)} title="Clear"
                style={{ position: 'absolute', top: 28, right: 4 }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Lookup field (uses LookupModal)
    if (lookup) {
      const displayValue = lookup.data?.find(
        r => String(r[lookup.idKey]) === String(value)
      )?.[lookup.displayKey] || '';

      return (
        <div key={key} className="bulk-field">
          <label className="bulk-field-label">{label}</label>
          <div className="bulk-field-input-wrap">
            <LookupField
              value={value}
              onChange={row => setField(key, row[lookup.idKey])}
              onClear={() => clearField(key)}
              placeholder={lookup.placeholder || placeholder || `Select ${label}...`}
              modalTitle={lookup.modalTitle}
              data={lookup.data}
              columns={lookup.columns}
              searchableKeys={lookup.searchableKeys}
              displayValue={displayValue}
            />
            {isDirty && (
              <button className="bulk-field-clear" onClick={() => clearField(key)} title="Clear">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Select field
    if (type === 'select') {
      return (
        <div key={key} className="bulk-field">
          <label className="bulk-field-label">{label}</label>
          <div className="bulk-field-input-wrap">
            <select
              className="form-input bulk-field-input"
              value={value}
              onChange={e => setField(key, e.target.value)}
            >
              <option value="">— no change —</option>
              {(options || []).map(opt => {
                const v = typeof opt === 'object' ? opt.value : opt;
                const l = typeof opt === 'object' ? opt.label : opt;
                return <option key={v} value={v}>{l}</option>;
              })}
            </select>
            {isDirty && (
              <button className="bulk-field-clear" onClick={() => clearField(key)} title="Clear">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Date / Number / Text
    return (
      <div key={key} className="bulk-field">
        <label className="bulk-field-label">{label}</label>
        <div className="bulk-field-input-wrap">
          <input
            className="form-input bulk-field-input"
            type={type}
            step={step}
            placeholder={placeholder || `— no change —`}
            value={value}
            onChange={e => setField(key, e.target.value)}
          />
          {isDirty && (
            <button className="bulk-field-clear" onClick={() => clearField(key)} title="Clear">
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bulk-update-panel">
      <div className="bulk-update-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pencil size={14} />
          <span className="bulk-update-title">
            Bulk Update — {selectedCount} record{selectedCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {dirtyCount > 0 && (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {dirtyCount} field{dirtyCount !== 1 ? 's' : ''} to update
            </span>
          )}
          <button
            className="btn btn-primary btn-sm"
            disabled={dirtyCount === 0 || applying}
            onClick={handleApply}
          >
            <Check size={14} />
            {applying ? 'Applying…' : `Apply to ${selectedCount}`}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={14} /> Cancel
          </button>
        </div>
      </div>

      <div className="bulk-update-fields">
        {editableFields.map(renderField)}
      </div>
    </div>
  );
}
