/**
 * @file Invoice reader profile management.
 * @module ReaderProfiles
 *
 * CRUD for auto-detection profiles with vendor matching, template binding, and file-match testing.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Plus, Pencil, Trash2, TestTube2, Upload, Check, X, ChevronDown, ChevronUp, FileUp } from 'lucide-react';
import {
  getReaderProfiles, createReaderProfile, updateReaderProfile, deleteReaderProfile,
  getReaderTemplates, getVendors, testProfileMatch,
} from '../api';
import { useAuth } from '../context/AuthContext';

const FORMAT_TYPES = ['EDI', 'Excel', 'CSV', 'PDF'];
const ERROR_POLICIES = [
  { value: 'create', label: 'Auto-create' },
  { value: 'queue_exception', label: 'Queue exception' },
  { value: 'skip', label: 'Skip silently' },
];

export default function ReaderProfiles() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('invoice_reader_uploads', 'create');
  const canDelete = hasPermission('invoice_reader_uploads', 'delete');
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | profile_id
  const [form, setForm] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [testFile, setTestFile] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, v] = await Promise.all([getReaderProfiles(), getReaderTemplates(), getVendors()]);
      setProfiles(p.data);
      setTemplates(t.data);
      setVendors(v.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const emptyForm = () => ({
    name: '', vendors_id: '', format_type: 'EDI', invoice_reader_templates_id: '',
    match_rules: { edi_sender_id: '', filename_pattern: '', header_fingerprint: '' },
    defaults: { vendors_id: '', accounts_id: '', status: '' },
    error_handling: { on_unknown_vendor: 'create', on_no_account: 'create', on_unknown_inventory: 'create' },
    status: 'Active',
  });

  const startNew = () => { setForm(emptyForm()); setEditing('new'); };
  const startEdit = (p) => {
    setForm({
      name: p.name,
      vendors_id: p.vendors_id || '',
      format_type: p.format_type,
      invoice_reader_templates_id: p.invoice_reader_templates_id || '',
      match_rules: { edi_sender_id: '', filename_pattern: '', header_fingerprint: '', ...(p.match_rules || {}) },
      defaults: { vendors_id: '', accounts_id: '', status: '', ...(p.defaults || {}) },
      error_handling: { on_unknown_vendor: 'create', on_no_account: 'create', on_unknown_inventory: 'create', ...(p.error_handling || {}) },
      status: p.status,
    });
    setEditing(p.invoice_reader_profiles_id);
  };
  const cancel = () => { setEditing(null); setForm({}); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        vendors_id: form.vendors_id || null,
        invoice_reader_templates_id: form.invoice_reader_templates_id || null,
      };
      if (editing === 'new') {
        await createReaderProfile(payload);
      } else {
        await updateReaderProfile(editing, payload);
      }
      setEditing(null);
      setForm({});
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this profile?')) return;
    try { await deleteReaderProfile(id); await load(); } catch { /* ignore */ }
  };

  const runTest = async () => {
    if (!testFile) return;
    try {
      const res = await testProfileMatch(testFile);
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ error: err.response?.data?.error || 'Test failed' });
    }
  };

  const setFormField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setNested = (section, key, val) =>
    setForm(f => ({ ...f, [section]: { ...f[section], [key]: val } }));

  const vendorName = (vid) => vendors.find(v => v.vendors_id === vid)?.name || '';
  const templateName = (tid) => templates.find(t => t.invoice_reader_templates_id === tid)?.name || '';

  const testFileRef = useRef(null);

  const FORMAT_BADGE = { EDI: 'badge-purple', Excel: 'badge-blue', CSV: 'badge-cyan', PDF: 'badge-orange' };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Test Match Card ── */}
      <div className="form-page-section">
        <div className="form-page-section-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <TestTube2 size={16} /> Test Profile Match
          </span>
        </div>
        <div className="form-page-section-body">
          <p style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', margin: 0 }}>
            Upload a sample file to see which profile it matches and what identifiers are extracted.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={testFileRef} type="file" style={{ display: 'none' }}
              onChange={e => { setTestFile(e.target.files?.[0] || null); setTestResult(null); }}
              accept=".xlsx,.xls,.csv,.edi,.txt,.pdf" />
            <button className="btn btn-outline" onClick={() => testFileRef.current?.click()}>
              <FileUp size={15} /> {testFile ? testFile.name : 'Choose file…'}
            </button>
            <button className="btn btn-primary" onClick={runTest} disabled={!testFile}>
              <TestTube2 size={14} /> Test
            </button>
            {testResult && (
              <span className={`badge ${testResult.error ? 'badge-red' : testResult.matched ? 'badge-green' : 'badge-orange'}`}
                style={{ fontSize: 12 }}>
                {testResult.error || (testResult.matched
                  ? `Matched: ${testResult.profile?.name}`
                  : 'No profile matched')}
              </span>
            )}
          </div>
          {testResult?.file_identifiers && (
            <pre style={{ fontSize: 12, background: 'var(--bg-muted, #f1f5f9)', padding: 12, borderRadius: 8, overflow: 'auto', margin: 0, border: '1px solid var(--border-color, #e2e8f0)' }}>
              {JSON.stringify(testResult.file_identifiers, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* ── Edit / New Form ── */}
      {editing !== null && (
        <div className="form-page-section">
          <div className="form-page-section-header">
            <span style={{ fontWeight: 700, fontSize: 14 }}>{editing === 'new' ? 'New Profile' : 'Edit Profile'}</span>
          </div>
          <div className="form-page-section-body">
            <div className="form-row">
              <div>
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name || ''} onChange={e => setFormField('name', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Format Type *</label>
                <select className="form-input" value={form.format_type || ''} onChange={e => setFormField('format_type', e.target.value)}>
                  {FORMAT_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label className="form-label">Vendor</label>
                <select className="form-input" value={form.vendors_id || ''} onChange={e => setFormField('vendors_id', e.target.value)}>
                  <option value="">— None —</option>
                  {vendors.map(v => <option key={v.vendors_id} value={v.vendors_id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Template</label>
                <select className="form-input" value={form.invoice_reader_templates_id || ''} onChange={e => setFormField('invoice_reader_templates_id', e.target.value)}>
                  <option value="">— None —</option>
                  {templates.map(t => <option key={t.invoice_reader_templates_id} value={t.invoice_reader_templates_id}>{t.name} ({t.format_type})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" style={{ maxWidth: 200 }} value={form.status || 'Active'} onChange={e => setFormField('status', e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Match Rules sub-section */}
          <div className="form-page-section-header" style={{ borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Match Rules</span>
          </div>
          <div className="form-page-section-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', margin: '-8px 0 0' }}>
              How files are auto-matched to this profile. All non-empty rules must match.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">EDI Sender ID (ISA06)</label>
                <input className="form-input" value={form.match_rules?.edi_sender_id || ''}
                  onChange={e => setNested('match_rules', 'edi_sender_id', e.target.value)}
                  placeholder="e.g. GRNT" />
              </div>
              <div>
                <label className="form-label">Filename Pattern (regex)</label>
                <input className="form-input" value={form.match_rules?.filename_pattern || ''}
                  onChange={e => setNested('match_rules', 'filename_pattern', e.target.value)}
                  placeholder="e.g. granite_.*\.edi" />
              </div>
              <div>
                <label className="form-label">Header Fingerprint</label>
                <input className="form-input" value={form.match_rules?.header_fingerprint || ''}
                  onChange={e => setNested('match_rules', 'header_fingerprint', e.target.value)}
                  placeholder="Col1|Col2|Col3 (pipe-separated)" />
              </div>
            </div>
          </div>

          {/* Defaults sub-section */}
          <div className="form-page-section-header" style={{ borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Default Values</span>
          </div>
          <div className="form-page-section-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', margin: '-8px 0 0' }}>
              Fallback values applied when not present in the file data.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Default Vendor</label>
                <select className="form-input" value={form.defaults?.vendors_id || ''} onChange={e => setNested('defaults', 'vendors_id', e.target.value)}>
                  <option value="">— None —</option>
                  {vendors.map(v => <option key={v.vendors_id} value={v.vendors_id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Default Account ID</label>
                <input className="form-input" type="number" value={form.defaults?.accounts_id || ''}
                  onChange={e => setNested('defaults', 'accounts_id', e.target.value)}
                  placeholder="accounts_id" />
              </div>
              <div>
                <label className="form-label">Default Invoice Status</label>
                <input className="form-input" value={form.defaults?.status || ''}
                  onChange={e => setNested('defaults', 'status', e.target.value)}
                  placeholder="e.g. Open" />
              </div>
            </div>
          </div>

          {/* Error Handling sub-section */}
          <div className="form-page-section-header" style={{ borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Error Handling Policies</span>
          </div>
          <div className="form-page-section-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', margin: '-8px 0 0' }}>
              What to do when the process encounters missing data.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Unknown Vendor</label>
                <select className="form-input" value={form.error_handling?.on_unknown_vendor || 'create'}
                  onChange={e => setNested('error_handling', 'on_unknown_vendor', e.target.value)}>
                  {ERROR_POLICIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">No Account Resolved</label>
                <select className="form-input" value={form.error_handling?.on_no_account || 'create'}
                  onChange={e => setNested('error_handling', 'on_no_account', e.target.value)}>
                  {ERROR_POLICIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Unknown Inventory</label>
                <select className="form-input" value={form.error_handling?.on_unknown_inventory || 'create'}
                  onChange={e => setNested('error_handling', 'on_unknown_inventory', e.target.value)}>
                  {ERROR_POLICIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name || !form.format_type}>
                <Check size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-ghost" onClick={cancel}><X size={14} /> Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profiles Table ── */}
      <div className="page-card">
        <div className="page-card-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <Settings size={16} /> Reader Profiles
          </span>
          {canCreate && <button className="btn btn-primary btn-sm" onClick={startNew}>
            <Plus size={14} /> New Profile
          </button>}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: 40 }}>Loading profiles…</p>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted, #94a3b8)' }}>
            <Settings size={48} style={{ marginBottom: 12, opacity: 0.25 }} />
            <p style={{ fontSize: 15, margin: 0 }}>No profiles configured yet.</p>
            <p style={{ fontSize: 13, margin: '6px 0 0' }}>Create a profile to enable automatic invoice file matching.</p>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Format</th>
                <th>Vendor</th>
                <th>Template</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <React.Fragment key={p.invoice_reader_profiles_id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === p.invoice_reader_profiles_id ? null : p.invoice_reader_profiles_id)}>
                    <td style={{ fontWeight: 600 }}>
                      {expandedId === p.invoice_reader_profiles_id
                        ? <ChevronUp size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        : <ChevronDown size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                      {p.name}
                    </td>
                    <td><span className={`badge ${FORMAT_BADGE[p.format_type] || 'badge-gray'}`}>{p.format_type}</span></td>
                    <td>{p.vendor_name || '—'}</td>
                    <td>{p.template_name || '—'}</td>
                    <td>
                      <span className={`badge ${p.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{p.status}</span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {canCreate && <button className="btn btn-sm btn-ghost btn-icon" onClick={() => startEdit(p)} title="Edit">
                          <Pencil size={14} />
                        </button>}
                        {canDelete && <button className="btn btn-sm btn-danger btn-icon" onClick={() => remove(p.invoice_reader_profiles_id)} title="Delete">
                          <Trash2 size={14} />
                        </button>}
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.invoice_reader_profiles_id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 13 }}>
                          <div>
                            <label className="form-label" style={{ marginBottom: 4 }}>Match Rules</label>
                            <pre style={{ margin: 0, fontSize: 12, background: 'var(--bg-muted, #f1f5f9)', padding: 10, borderRadius: 8, overflow: 'auto', border: '1px solid var(--border-color, #e2e8f0)' }}>
                              {JSON.stringify(p.match_rules, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <label className="form-label" style={{ marginBottom: 4 }}>Defaults</label>
                            <pre style={{ margin: 0, fontSize: 12, background: 'var(--bg-muted, #f1f5f9)', padding: 10, borderRadius: 8, overflow: 'auto', border: '1px solid var(--border-color, #e2e8f0)' }}>
                              {JSON.stringify(p.defaults, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <label className="form-label" style={{ marginBottom: 4 }}>Error Handling</label>
                            <pre style={{ margin: 0, fontSize: 12, background: 'var(--bg-muted, #f1f5f9)', padding: 10, borderRadius: 8, overflow: 'auto', border: '1px solid var(--border-color, #e2e8f0)' }}>
                              {JSON.stringify(p.error_handling, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
