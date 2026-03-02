import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import DetailHeader from './DetailHeader';

/**
 * Full-page form layout for creating new records.
 *
 * Props:
 *   title        – Page heading (e.g. "New Vendor Account")
 *   subtitle     – Optional subtext
 *   icon         – Lucide icon component
 *   sections     – [{ title, description?, fields | fields(related) }]
 *   emptyForm    – Initial form values object
 *   loadRelated  – async () => { accounts: [...], ... }
 *   defaultValues– (related) => overrides for form
 *   beforeSave   – (form) => transformed payload
 *   onSubmit     – async (payload) => axiosResponse
 *   backPath     – Route to navigate on cancel (e.g. '/accounts')
 *   redirectOnSave – (axiosRes) => route string, or null to go to backPath
 */
export default function FormPage({
  title,
  subtitle,
  icon: Icon,
  sections,
  emptyForm,
  loadRelated,
  defaultValues,
  beforeSave,
  onSubmit,
  backPath,
  redirectOnSave,
}) {
  const navigate = useNavigate();
  const [form, setForm]       = useState(emptyForm);
  const [related, setRelated] = useState({});
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState([]);
  const [loading, setLoading] = useState(!!loadRelated);

  const setField = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  /* ── Load related data (dropdowns) ───────────────────── */
  useEffect(() => {
    if (!loadRelated) { setLoading(false); return; }
    loadRelated().then(data => {
      setRelated(data);
      if (defaultValues) {
        setForm(prev => ({ ...prev, ...defaultValues(data) }));
      }
    }).finally(() => setLoading(false));
  }, []);

  /* ── Save handler ────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    try {
      let payload = { ...form };
      if (beforeSave) payload = beforeSave(payload);
      const res = await onSubmit(payload);
      if (redirectOnSave) navigate(redirectOnSave(res));
      else navigate(backPath);
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;
      if (data?.details?.length) {
        // express-validator field errors (400)
        setErrors(data.details.map(e => e.message ? `${e.field}: ${e.message}` : String(e)));
      } else if (data?.error) {
        setErrors([data.error]);
      } else if (status === 0 || !err.response) {
        setErrors(['Unable to reach the server. Please check your connection and try again.']);
      } else {
        setErrors([`Save failed (HTTP ${status || '?'}). Please check your input and try again.`]);
      }
      setSaving(false);
    }
  };

  /* ── Field renderer ──────────────────────────────────── */
  const renderField = (field) => {
    if (field.render) return field.render(form, setField, related);

    const { key, label, type = 'text', options, placeholder, step, rows, disabled } = field;
    const value = form[key] ?? '';

    if (type === 'checkbox') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28 }}>
          <input
            type="checkbox" id={`fp-${key}`}
            checked={!!value}
            onChange={e => setField(key, e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#2563eb' }}
            disabled={disabled}
          />
          <label htmlFor={`fp-${key}`} style={{ fontSize: 14, color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </label>
        </div>
      );
    }

    const labelEl = <label className="form-label">{label}</label>;

    if (type === 'select') {
      const opts = typeof options === 'function' ? options(related) : (options || []);
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
            {opts.map(opt => {
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
            rows={rows || 3}
            value={value}
            onChange={e => setField(key, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      );
    }

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

  /* ── Layout: pair consecutive half-width fields ──────── */
  const renderFields = (fields) => {
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

  /* ── Loading state ───────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sticky header */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(backPath)}>
            <ArrowLeft size={18} />
          </button>
          {Icon && <Icon size={22} style={{ color: '#60a5fa' }} />}
          <div>
            <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 17 }}>{title}</div>
            {subtitle && <div style={{ color: '#94a3b8', fontSize: 12 }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate(backPath)}
            style={{ color: '#94a3b8' }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}>
            <Save size={15} />
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </DetailHeader>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="form-page-errors">
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 13, fontWeight: 500 }}>{e}</div>
          ))}
        </div>
      )}

      {/* Form sections */}
      {sections.map((section, idx) => {
        const fields = typeof section.fields === 'function'
          ? section.fields(related)
          : section.fields;
        return (
          <div key={idx} className="form-page-section">
            <div className="form-page-section-header">
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{section.title}</div>
              {section.description && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{section.description}</div>
              )}
            </div>
            <div className="form-page-section-body">
              {renderFields(fields)}
            </div>
          </div>
        );
      })}

      {/* Bottom actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 20 }}>
        <button className="btn" onClick={() => navigate(backPath)}
          style={{ background: 'white', color: '#475569', border: '1.5px solid #cbd5e1' }}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}>
          <Save size={15} />
          {saving ? 'Saving…' : 'Create'}
        </button>
      </div>
    </div>
  );
}
