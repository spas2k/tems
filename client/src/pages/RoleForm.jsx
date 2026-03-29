/**
 * @file New role creation form with color scheme picker.
 * @module RoleForm
 *
 * Manual form (not FormPage) for creating a new role with name, description, and color scheme selection.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, Check } from 'lucide-react';
import { createRole } from '../api';
import DetailHeader from '../components/DetailHeader';
import { COLOR_SCHEMES } from '../utils/roleColors';

const DEFAULT_COLOR = COLOR_SCHEMES[0].id;

export default function RoleForm() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', description: '', color: DEFAULT_COLOR });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedScheme = COLOR_SCHEMES.find(s => s.id === form.color) || COLOR_SCHEMES[0];

  const handleSave = async () => {
    if (!form.name.trim()) { setErrors(['Role name is required.']); return; }
    setSaving(true);
    setErrors([]);
    try {
      const res = await createRole({ name: form.name.trim(), description: form.description.trim(), color: form.color });
      navigate(`/roles/${res.data.roles_id}`);
    } catch (err) {
      const data = err.response?.data;
      if (data?.details?.length) {
        setErrors(data.details.map(e => e.message ? `${e.field}: ${e.message}` : String(e)));
      } else {
        setErrors([data?.error || 'Save failed. Please try again.']);
      }
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────── */}
      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-back" onClick={() => navigate('/roles')}>
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${selectedScheme.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}>
            <Shield size={18} color={selectedScheme.color} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>
              {form.name || 'New Role'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Create a custom role</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
          <Save size={14} /> {saving ? 'Creating…' : 'Create Role'}
        </button>
      </DetailHeader>

      {/* ── Errors ─────────────────────────────────────── */}
      {errors.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px' }}>
          {errors.map((e, i) => <div key={i} style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>{e}</div>)}
        </div>
      )}

      {/* ── Role Details ────────────────────────────────── */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Role Details</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Define the new role. Permissions can be assigned after creation.</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="form-label">Role Name *</label>
            <input className="form-input"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Auditor, Approver, Invoice Reviewer"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridRow: 'span 2' }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={4}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe what this role is for and who should be assigned to it…"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* ── Color Theme ─────────────────────────────────── */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Color Theme</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Selected:&nbsp;
            <span style={{ fontWeight: 700, color: selectedScheme.color }}>{selectedScheme.label}</span>
          </span>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {COLOR_SCHEMES.map(scheme => {
              const active = form.color === scheme.id;
              return (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => set('color', scheme.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '14px 10px', borderRadius: 12, cursor: 'pointer',
                    border: active ? `2px solid ${scheme.color}` : '2px solid #e2e8f0',
                    background: active ? scheme.bg : '#fafafa',
                    transition: 'all 0.15s',
                    outline: 'none',
                  }}
                >
                  {/* Swatch circle */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: scheme.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: active ? `0 0 0 3px ${scheme.bg}, 0 0 0 5px ${scheme.color}` : '0 2px 6px rgba(0,0,0,0.12)',
                    transition: 'box-shadow 0.15s',
                  }}>
                    {active && <Check size={18} color="#fff" strokeWidth={3} />}
                  </div>
                  {/* Label */}
                  <span style={{
                    fontSize: 11, fontWeight: active ? 700 : 500,
                    color: active ? scheme.text : '#64748b',
                    letterSpacing: 0.2,
                    transition: 'color 0.15s',
                  }}>
                    {scheme.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Preview badge */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Preview:</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 20,
              background: selectedScheme.bg,
              color: selectedScheme.text,
              fontWeight: 700, fontSize: 13,
              border: `1px solid ${selectedScheme.color}33`,
            }}>
              <Shield size={12} color={selectedScheme.color} />
              {form.name || 'Role Name'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

