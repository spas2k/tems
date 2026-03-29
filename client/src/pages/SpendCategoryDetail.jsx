/**
 * @file Spend category detail page with editable form fields.
 * @module SpendCategoryDetail
 *
 * Shows spend category info with inline editing, notes, and change history.
 */
import React, { useContext, useEffect, useState } from 'react';
import { PageTitleContext } from '../PageTitleContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSpendCategory, updateSpendCategory, getSpendCategories } from '../api';
import DetailHeader from '../components/DetailHeader';
import StatusToggle from '../components/StatusToggle';
import ChangeHistory from '../components/ChangeHistory';

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function SpendCategoryDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useContext(PageTitleContext);
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('spend_categories', 'update');

  const [category,    setCategory]    = useState(null);
  const [form,        setFormData]    = useState(null);
  const [parents,     setParents]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [historyKey,  setHistoryKey]  = useState(0);
  const [dirty,       setDirty]       = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getSpendCategory(id), getSpendCategories()])
      .then(([res, allRes]) => {
        const d = res.data;
        setCategory(d);
        setPageTitle(d.name);
        setParents(allRes.data.filter(c => c.spend_categories_id !== Number(id)));
        setFormData({
          name:        d.name        || '',
          code:        d.code        || '',
          description: d.description || '',
          parent_id:   d.parent_id   ? String(d.parent_id) : '',
          is_active:   d.is_active != null ? String(d.is_active) : 'true',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => { setFormData(p => ({ ...p, [k]: v })); setDirty(true); };

  const toggleActive = async (v) => {
    const newVal = v === 'Active';
    try {
      const payload = { ...form, parent_id: form.parent_id || null, is_active: newVal };
      const updated = await updateSpendCategory(id, payload);
      setCategory(updated.data);
      setFormData(p => ({ ...p, is_active: String(newVal) }));
      setHistoryKey(k => k + 1);
      showToast(newVal ? 'Category activated.' : 'Category deactivated.');
    } catch {
      showToast('Failed to update status.', false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, parent_id: form.parent_id || null, is_active: form.is_active === 'true' };
      const updated = await updateSpendCategory(id, payload);
      setCategory(updated.data);
      setDirty(false);
      setHistoryKey(k => k + 1);
      showToast('Category saved successfully.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading category…</div>;
  if (!category) return <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>Category not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? 'var(--bg-success)' : 'var(--bg-error)',
          color: toast.ok ? 'var(--text-success)' : 'var(--text-error)',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      <DetailHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-back" onClick={() => navigate('/spend-categories')}>
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--icon-bg-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{category.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {category.code || 'No code'}{category.parent_name ? ` · Parent: ${category.parent_name}` : ''}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved changes</span>}
          {canUpdate && (
            <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!dirty || saving) ? 0.5 : 1 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </DetailHeader>

      {/* Category Details */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Category Details</span>
          <StatusToggle value={form.is_active === 'true' ? 'Active' : 'Inactive'} onChange={toggleActive} disabled={!canUpdate} />
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Category Name *">
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Code">
            <input className="form-input" value={form.code} onChange={e => set('code', e.target.value)} />
          </Field>
          <Field label="Parent Category">
            <select className="form-input" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
              <option value="">— None —</option>
              {parents.map(p => <option key={p.spend_categories_id} value={String(p.spend_categories_id)}>{p.name}</option>)}
            </select>
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Description">
              <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Change History */}
      <ChangeHistory resource="spend_categories" resourceId={id} refreshKey={historyKey} />
    </div>
  );
}
