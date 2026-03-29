/**
 * @file Config-driven modal form for create/edit operations.
 * @module CrudModal
 *
 * @param {boolean} props.open - Whether the modal is visible
 * @param {string} props.title - Modal header title
 * @param {Function} props.onClose - Callback when the modal is dismissed
 * @param {Function} props.onSave - Callback when Save is clicked
 * @param {Object} props.form - Current form state object
 * @param {Function} props.setField - setField(fieldName, value) state setter
 * @param {Array} props.fields - Array of field config objects ({ key, label, type, options, ... })
 * @param {number} props.width - Modal width in pixels
 * @param {ReactNode} props.children - Additional content below auto-rendered fields
 */
import React from 'react';
import Modal from './Modal';
import { useLocation } from 'react-router-dom';
import FormInstructionBanner from './FormInstructionBanner';

/**
 * Shared CRUD modal with config-driven form fields.
 *
 * Field config shape:
 *   key         – form field name
 *   label       – display label
 *   type        – 'text' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox'
 *   options     – string[] or {value,label}[] (for select)
 *   half        – boolean  (pair consecutive half-fields into a row)
 *   placeholder – string   (also used as first <option> for selects)
 *   step        – string   (for number inputs)
 *   rows        – number   (for textarea, default 2)
 *   required    – boolean  (appends * to label)
 *   disabled    – boolean
 *   render      – (form, setField) => JSX  (fully custom field)
 */
export default function CrudModal({
  open, title, onClose, onSave,
  form, setField,
  fields = [],
  width,
  children,
}) {
  if (!open) return null;

  /* ── render one field ────────────────────────────────── */
  const renderField = (field) => {
    if (field.render) return field.render(form, setField);

    const { key, label, type = 'text', options, placeholder, step, rows, disabled } = field;
    const value = form[key] ?? '';

    if (type === 'checkbox') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox" id={key}
            checked={!!value}
            onChange={e => setField(key, e.target.checked)}
            style={{ width: 16, height: 16 }}
            disabled={disabled}
          />
          <label htmlFor={key} style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
            {label}
          </label>
        </div>
      );
    }

    const labelEl = (
      <label className="form-label">
        {label}{field.required && ' *'}
      </label>
    );

    if (type === 'select') {
      return (
        <div>
          {labelEl}
          <select
            className="form-input"
            value={value}
            onChange={e => setField(key, e.target.value)}
            disabled={disabled}
          >
            <option value="">{placeholder || 'Select…'}</option>
            {(options || []).map(opt => {
              const v = typeof opt === 'object' ? opt.value : opt;
              const l = typeof opt === 'object' ? opt.label : opt;
              return <option key={v} value={v}>{l}</option>;
            })}
          </select>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div>
          {labelEl}
          <textarea
            className="form-input"
            rows={rows || 2}
            value={value}
            onChange={e => setField(key, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      );
    }

    // text / number / date / etc.
    return (
      <div>
        {labelEl}
        <input
          className="form-input"
          type={type}
          step={step}
          value={value}
          onChange={e => setField(key, e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  };

  /* ── layout: pair consecutive half-width fields ──────── */
  const renderFields = () => {
    const els = [];
    let i = 0;
    while (i < fields.length) {
      const f = fields[i];
      if (f.half && i + 1 < fields.length && fields[i + 1].half) {
        els.push(
          <div className="form-row" key={`row-${i}`}>
            {renderField(f)}
            {renderField(fields[i + 1])}
          </div>
        );
        i += 2;
      } else {
        els.push(<React.Fragment key={`f-${i}`}>{renderField(f)}</React.Fragment>);
        i += 1;
      }
    }
    return els;
  };

  const location = useLocation();
  const formId = location.pathname.replace(/^\/([^/]+).*/, '$1');

  return (
    <Modal open={open} title={title} onClose={onClose} onSave={onSave} width={width}>
      {formId && <FormInstructionBanner formId={formId} />}
      {children || renderFields()}
    </Modal>
  );
}
