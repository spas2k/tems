import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, FileText, FileCode, CheckCircle, AlertCircle,
  Loader, ArrowRight, ArrowLeft, Save, Play, Trash2, Settings, Eye,
  ChevronDown, X, Download, RefreshCw, List,
} from 'lucide-react';
import {
  parseInvoiceFile, processInvoiceFile, getReaderFields,
  getReaderTemplates, createReaderTemplate, deleteReaderTemplate,
  getReaderUploads, getAccounts,
} from '../api';

const FORMAT_ICONS = { Excel: FileSpreadsheet, PDF: FileText, EDI: FileCode };
const FORMAT_COLORS = { Excel: '#0d9488', PDF: '#dc2626', EDI: '#7c3aed' };

// ─────────────────────────────────────────────────────────────
//  Invoice Reader — multi-step wizard
//  Step 1: Upload file
//  Step 2: Preview parsed data & select template or map columns
//  Step 3: Review mappings
//  Step 4: Process & results
// ─────────────────────────────────────────────────────────────
export default function InvoiceReader() {
  const [step, setStep]           = useState(1);
  const [file, setFile]           = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [parsing, setParsing]     = useState(false);
  const [processing, setProcessing] = useState(false);
  const [parsed, setParsed]       = useState(null);   // parsed file data
  const [fields, setFields]       = useState(null);   // available target fields
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts]   = useState([]);
  const [uploads, setUploads]     = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAccount, setSelectedAccount]   = useState('');
  const [selectedSheet, setSelectedSheet]       = useState('');
  const [mappings, setMappings]   = useState({});     // { sourceCol: { field, table, type } }
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [tab, setTab]             = useState('upload'); // 'upload' | 'templates' | 'history'
  const [templateName, setTemplateName] = useState('');
  const fileInputRef = useRef(null);

  // Fetch fields, templates, accounts on mount
  useEffect(() => {
    getReaderFields().then(r => setFields(r.data)).catch(() => {});
    getReaderTemplates().then(r => setTemplates(r.data)).catch(() => {});
    getAccounts().then(r => setAccounts(r.data)).catch(() => {});
    getReaderUploads().then(r => setUploads(r.data)).catch(() => {});
  }, []);

  // ── File handling ──────────────────────────────────────────
  const processFileSelect = useCallback((f) => {
    if (!f) return;
    const valid = /\.(xlsx|xls|csv|edi|txt|pdf)$/i.test(f.name);
    if (!valid) {
      setError('Unsupported file type. Accepted: .xlsx, .xls, .csv, .edi, .txt, .pdf');
      return;
    }
    setFile(f);
    setError(null);
    setParsed(null);
    setResult(null);
    setMappings({});
    setSelectedTemplate(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    processFileSelect(f);
  }, [processFileSelect]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  // ── Parse uploaded file ────────────────────────────────────
  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const res = await parseInvoiceFile(file);
      setParsed(res.data);
      setStep(2);
      // Auto-select first sheet if Excel
      if (res.data.format === 'Excel' && res.data.sheets?.length) {
        setSelectedSheet(res.data.sheets[0].name);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  // ── Apply template mappings ────────────────────────────────
  const applyTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    if (tmpl.config?.columnMappings) {
      setMappings(tmpl.config.columnMappings);
    }
    if (tmpl.accounts_id) {
      setSelectedAccount(String(tmpl.accounts_id));
    }
  };

  // ── Save current mappings as template ──────────────────────
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { setError('Enter a template name'); return; }
    try {
      const res = await createReaderTemplate({
        name: templateName.trim(),
        accounts_id: selectedAccount || null,
        format_type: parsed?.format || 'Excel',
        config: {
          columnMappings: mappings,
          sheetName: selectedSheet || null,
        },
      });
      setTemplates(prev => [res.data, ...prev]);
      setSelectedTemplate(res.data);
      setTemplateName('');
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save template');
    }
  };

  // ── Process file ───────────────────────────────────────────
  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    try {
      const opts = {
        accounts_id: selectedAccount || null,
        mappings,
        sheet_name: selectedSheet || null,
      };
      if (selectedTemplate) opts.template_id = selectedTemplate.invoice_reader_templates_id;

      const res = await processInvoiceFile(file, opts);
      setResult(res.data);
      setStep(4);
      // Refresh history
      getReaderUploads().then(r => setUploads(r.data)).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  // ── Delete template ────────────────────────────────────────
  const handleDeleteTemplate = async (id) => {
    try {
      await deleteReaderTemplate(id);
      setTemplates(prev => prev.filter(t => t.invoice_reader_templates_id !== id));
      if (selectedTemplate?.invoice_reader_templates_id === id) setSelectedTemplate(null);
    } catch { /* ignore */ }
  };

  // ── Reset ──────────────────────────────────────────────────
  const handleReset = () => {
    setStep(1);
    setFile(null);
    setParsed(null);
    setResult(null);
    setError(null);
    setMappings({});
    setSelectedTemplate(null);
    setSelectedSheet('');
    setTemplateName('');
  };

  // ── Derived data ───────────────────────────────────────────
  const currentHeaders = (() => {
    if (!parsed) return [];
    if (parsed.format === 'Excel') {
      const sheet = parsed.sheets?.find(s => s.name === selectedSheet) || parsed.sheets?.[0];
      return sheet?.headers || [];
    }
    return parsed.headers || [];
  })();

  const currentPreview = (() => {
    if (!parsed) return [];
    if (parsed.format === 'Excel') {
      const sheet = parsed.sheets?.find(s => s.name === selectedSheet) || parsed.sheets?.[0];
      return sheet?.previewRows || [];
    }
    return parsed.previewRows || [];
  })();

  const allTargetFields = fields
    ? [...(fields.invoiceFields || []), ...(fields.lineItemFields || [])]
    : [];

  const mappedCount = Object.values(mappings).filter(m => m?.field).length;

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--border-color, #e2e8f0)' }}>
        {[
          { key: 'upload', label: 'Upload & Process', icon: Upload },
          { key: 'templates', label: 'Saved Templates', icon: Settings },
          { key: 'history', label: 'Upload History', icon: List },
        ].map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400,
              background: active ? 'var(--accent-bg, rgba(37,99,235,0.08))' : 'transparent',
              color: active ? 'var(--accent-color, #2563eb)' : 'var(--text-muted, #64748b)',
              borderBottom: active ? '2px solid var(--accent-color, #2563eb)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          color: '#991b1b', marginBottom: 16, fontSize: 14,
        }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <X size={14} style={{ cursor: 'pointer' }} onClick={() => setError(null)} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: Upload & Process                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'upload' && (
        <div>
          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
            {[
              { num: 1, label: 'Upload File' },
              { num: 2, label: 'Map Columns' },
              { num: 3, label: 'Review' },
              { num: 4, label: 'Results' },
            ].map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 20,
                  background: step === s.num ? 'var(--accent-color, #2563eb)' : step > s.num ? '#10b981' : 'var(--bg-muted, #f1f5f9)',
                  color: step >= s.num ? '#fff' : 'var(--text-muted, #94a3b8)',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {step > s.num ? <CheckCircle size={14} /> : <span>{s.num}</span>}
                  {s.label}
                </div>
                {i < 3 && <div style={{ width: 40, height: 2, background: step > s.num ? '#10b981' : 'var(--border-color, #e2e8f0)' }} />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Upload ───────────────────────────────── */}
          {step === 1 && (
            <div>
              {/* Account selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                  Account / Vendor (Optional)
                </label>
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  style={{
                    width: '100%', maxWidth: 400, padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--border-color, #d1d5db)', fontSize: 14,
                    background: 'var(--input-bg, #fff)', color: 'var(--text-color, #1e293b)',
                  }}
                >
                  <option value="">— Select Account —</option>
                  {accounts.map(a => (
                    <option key={a.accounts_id} value={a.accounts_id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-color, #2563eb)' : 'var(--border-color, #cbd5e1)'}`,
                  borderRadius: 12, padding: '48px 24px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: dragOver ? 'var(--accent-bg, rgba(37,99,235,0.04))' : 'var(--bg-subtle, #fafbfc)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.edi,.txt,.pdf"
                  onChange={e => processFileSelect(e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
                <Upload size={36} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: 12 }} />
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  Drop invoice file here or click to browse
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                  Supports Excel (.xlsx, .xls, .csv), EDI (.edi, .txt), and PDF (.pdf) — up to 20 MB
                </p>
              </div>

              {/* Selected file info */}
              {file && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginTop: 16,
                  padding: '14px 18px', borderRadius: 10,
                  background: 'var(--bg-muted, #f1f5f9)', border: '1px solid var(--border-color, #e2e8f0)',
                }}>
                  <FileSpreadsheet size={20} style={{ color: '#0d9488' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)',
                  }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Existing template quick-apply */}
              {templates.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                    Apply Saved Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate?.invoice_reader_templates_id || ''}
                    onChange={e => {
                      const t = templates.find(t => t.invoice_reader_templates_id === Number(e.target.value));
                      if (t) applyTemplate(t); else setSelectedTemplate(null);
                    }}
                    style={{
                      width: '100%', maxWidth: 400, padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border-color, #d1d5db)', fontSize: 14,
                      background: 'var(--input-bg, #fff)', color: 'var(--text-color, #1e293b)',
                    }}
                  >
                    <option value="">— New Mapping —</option>
                    {templates.map(t => (
                      <option key={t.invoice_reader_templates_id} value={t.invoice_reader_templates_id}>
                        {t.name} ({t.format_type}) {t.account_name ? `— ${t.account_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parse button */}
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button
                  onClick={handleParse}
                  disabled={!file || parsing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 28px', borderRadius: 8, border: 'none',
                    background: !file ? '#94a3b8' : 'var(--accent-color, #2563eb)',
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: file ? 'pointer' : 'not-allowed',
                    opacity: parsing ? 0.7 : 1,
                  }}
                >
                  {parsing ? <Loader size={16} className="spin" /> : <Eye size={16} />}
                  {parsing ? 'Parsing...' : 'Parse & Preview'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Map Columns ──────────────────────────── */}
          {step === 2 && parsed && (
            <div>
              {/* Format badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                {(() => { const Icon = FORMAT_ICONS[parsed.format] || FileText; return <Icon size={20} style={{ color: FORMAT_COLORS[parsed.format] || '#64748b' }} />; })()}
                <span style={{
                  padding: '4px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: FORMAT_COLORS[parsed.format] + '18', color: FORMAT_COLORS[parsed.format],
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {parsed.format}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)' }}>
                  {parsed.format === 'Excel' && parsed.sheets && `${parsed.sheets.length} sheet(s)`}
                  {parsed.format === 'EDI' && `${parsed.invoiceCount} invoice(s), ${parsed.segments} segments`}
                  {parsed.format === 'PDF' && `${parsed.pages} page(s), ${parsed.totalLines} lines`}
                </span>
              </div>

              {/* Sheet selector for Excel */}
              {parsed.format === 'Excel' && parsed.sheets?.length > 1 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, marginRight: 10 }}>Sheet:</label>
                  <select
                    value={selectedSheet}
                    onChange={e => setSelectedSheet(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color, #d1d5db)', fontSize: 13 }}
                  >
                    {parsed.sheets.map(s => (
                      <option key={s.name} value={s.name}>{s.name} ({s.totalRows} rows)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Column mapping UI */}
              <div style={{
                border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10,
                overflow: 'hidden', marginBottom: 20,
              }}>
                <div style={{
                  padding: '12px 18px', fontWeight: 700, fontSize: 14,
                  background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Column Mapping — {currentHeaders.length} columns detected</span>
                  <span style={{ fontSize: 12, color: mappedCount > 0 ? '#10b981' : 'var(--text-muted, #94a3b8)' }}>
                    {mappedCount} mapped
                  </span>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-muted, #f8fafc)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Source Column</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Sample Value</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)', minWidth: 220 }}>Map To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentHeaders.map((header, idx) => {
                        const sampleVal = currentPreview[0]?.[header] ?? '';
                        const mapped = mappings[header];
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{header}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted, #64748b)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {String(sampleVal ?? '')}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <select
                                value={mapped?.field ? `${mapped.table}.${mapped.field}` : ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (!val) {
                                    setMappings(prev => { const copy = { ...prev }; delete copy[header]; return copy; });
                                  } else {
                                    const target = allTargetFields.find(f => `${f.table}.${f.field}` === val);
                                    if (target) {
                                      setMappings(prev => ({
                                        ...prev,
                                        [header]: { field: target.field, table: target.table, type: target.type },
                                      }));
                                    }
                                  }
                                }}
                                style={{
                                  width: '100%', padding: '6px 10px', borderRadius: 6,
                                  border: `1px solid ${mapped?.field ? '#10b981' : 'var(--border-color, #d1d5db)'}`,
                                  fontSize: 13, background: mapped?.field ? 'rgba(16,185,129,0.04)' : 'var(--input-bg, #fff)',
                                  color: 'var(--text-color, #1e293b)',
                                }}
                              >
                                <option value="">— Skip —</option>
                                <optgroup label="Invoice Fields">
                                  {(fields?.invoiceFields || []).map(f => (
                                    <option key={`invoices.${f.field}`} value={`invoices.${f.field}`}>
                                      {f.label} {f.required ? '*' : ''}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Line Item Fields">
                                  {(fields?.lineItemFields || []).map(f => (
                                    <option key={`line_items.${f.field}`} value={`line_items.${f.field}`}>
                                      {f.label} {f.required ? '*' : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview data table */}
              {currentPreview.length > 0 && (
                <div style={{
                  border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10,
                  overflow: 'hidden', marginBottom: 20,
                }}>
                  <div style={{
                    padding: '12px 18px', fontWeight: 700, fontSize: 14,
                    background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  }}>
                    Data Preview (first {currentPreview.length} rows)
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr>
                          {currentHeaders.map((h, i) => (
                            <th key={i} style={{
                              padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                              background: 'var(--bg-muted, #f1f5f9)',
                              borderBottom: '1px solid var(--border-color, #e2e8f0)',
                              position: 'sticky', top: 0,
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentPreview.map((row, ri) => (
                          <tr key={ri}>
                            {currentHeaders.map((h, ci) => (
                              <td key={ci} style={{
                                padding: '6px 12px',
                                borderBottom: '1px solid var(--border-color, #f1f5f9)',
                                maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PDF raw text preview */}
              {parsed.format === 'PDF' && parsed.rawText && (
                <details style={{ marginBottom: 20 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: '8px 0' }}>
                    Raw PDF Text (first 5000 chars)
                  </summary>
                  <pre style={{
                    padding: 16, borderRadius: 8, fontSize: 11,
                    background: 'var(--bg-muted, #f1f5f9)', overflow: 'auto', maxHeight: 300,
                    border: '1px solid var(--border-color, #e2e8f0)', whiteSpace: 'pre-wrap',
                  }}>
                    {parsed.rawText}
                  </pre>
                </details>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                <button onClick={() => { setStep(1); setParsed(null); }} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border-color, #d1d5db)',
                  background: 'transparent', color: 'var(--text-color, #1e293b)', fontSize: 14, cursor: 'pointer',
                }}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={mappedCount === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 8, border: 'none',
                    background: mappedCount === 0 ? '#94a3b8' : 'var(--accent-color, #2563eb)',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: mappedCount === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Review Mappings <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review & Confirm ────────────────────── */}
          {step === 3 && (
            <div>
              {/* Mapping summary */}
              <div style={{
                border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10,
                overflow: 'hidden', marginBottom: 20,
              }}>
                <div style={{
                  padding: '12px 18px', fontWeight: 700, fontSize: 14,
                  background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)',
                }}>
                  Mapping Summary
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-muted, #f8fafc)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Source Column</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Target Table</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Target Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mappings).filter(([, m]) => m?.field).map(([src, m]) => {
                      const target = allTargetFields.find(f => f.field === m.field && f.table === m.table);
                      return (
                        <tr key={src} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>{src}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                              background: m.table === 'invoices' ? 'rgba(37,99,235,0.1)' : 'rgba(16,185,129,0.1)',
                              color: m.table === 'invoices' ? '#2563eb' : '#10b981',
                            }}>
                              {m.table}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>{target?.label || m.field}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Account & file info */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20,
              }}>
                <div style={{
                  padding: 16, borderRadius: 10,
                  background: 'var(--bg-muted, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginBottom: 4 }}>File</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{file?.name}</div>
                </div>
                <div style={{
                  padding: 16, borderRadius: 10,
                  background: 'var(--bg-muted, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginBottom: 4 }}>Account</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {selectedAccount ? accounts.find(a => a.accounts_id === Number(selectedAccount))?.name || '—' : 'Not selected'}
                  </div>
                </div>
              </div>

              {/* Save as template */}
              {!selectedTemplate && (
                <div style={{
                  padding: 16, borderRadius: 10, marginBottom: 20,
                  background: 'var(--bg-muted, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)',
                }}>
                  <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'block' }}>
                    Save as Template (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      placeholder="e.g., AT&T Monthly Invoice"
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 6,
                        border: '1px solid var(--border-color, #d1d5db)', fontSize: 13,
                        background: 'var(--input-bg, #fff)', color: 'var(--text-color, #1e293b)',
                      }}
                    />
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 6, border: 'none',
                        background: templateName.trim() ? '#0d9488' : '#94a3b8',
                        color: '#fff', fontSize: 13, fontWeight: 600, cursor: templateName.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Save size={14} /> Save Template
                    </button>
                  </div>
                </div>
              )}

              {selectedTemplate && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
                  borderRadius: 10, marginBottom: 20,
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: 13, fontWeight: 600, color: '#0d9488',
                }}>
                  <Settings size={16} /> Using template: {selectedTemplate.name}
                </div>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                <button onClick={() => setStep(2)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border-color, #d1d5db)',
                  background: 'transparent', color: 'var(--text-color, #1e293b)', fontSize: 14, cursor: 'pointer',
                }}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 28px', borderRadius: 8, border: 'none',
                    background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: processing ? 'wait' : 'pointer', opacity: processing ? 0.7 : 1,
                  }}
                >
                  {processing ? <Loader size={16} className="spin" /> : <Play size={16} />}
                  {processing ? 'Processing...' : 'Process & Import'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Results ──────────────────────────────── */}
          {step === 4 && result && (
            <div>
              <div style={{
                padding: 24, borderRadius: 12, textAlign: 'center', marginBottom: 24,
                background: result.error_count && !result.invoices_created
                  ? '#fef2f2' : result.error_count ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${result.error_count && !result.invoices_created
                  ? '#fecaca' : result.error_count ? '#fde68a' : '#bbf7d0'}`,
              }}>
                {result.invoices_created > 0 ? (
                  <CheckCircle size={40} style={{ color: '#10b981', marginBottom: 12 }} />
                ) : (
                  <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: 12 }} />
                )}
                <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>
                  {result.invoices_created > 0 ? 'Import Complete' : 'Import Failed'}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted, #64748b)' }}>
                  Processed {result.total_rows} rows from file
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Rows', val: result.total_rows, color: '#64748b' },
                  { label: 'Invoices Created', val: result.invoices_created, color: '#2563eb' },
                  { label: 'Line Items Created', val: result.line_items_created, color: '#10b981' },
                  { label: 'Errors', val: result.error_count, color: result.error_count ? '#ef4444' : '#10b981' },
                ].map(s => (
                  <div key={s.label} style={{
                    padding: 16, borderRadius: 10, textAlign: 'center',
                    background: 'var(--bg-muted, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Errors list */}
              {result.errors?.length > 0 && (
                <div style={{
                  border: '1px solid #fecaca', borderRadius: 10, overflow: 'hidden', marginBottom: 20,
                }}>
                  <div style={{
                    padding: '10px 16px', fontWeight: 700, fontSize: 13,
                    background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#991b1b',
                  }}>
                    Errors ({result.errors.length}{result.error_count > result.errors.length ? ` of ${result.error_count}` : ''})
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', padding: '8px 16px' }}>
                    {result.errors.map((err, i) => (
                      <div key={i} style={{ padding: '4px 0', fontSize: 12, color: '#991b1b', borderBottom: '1px solid #fef2f2' }}>
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleReset} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--accent-color, #2563eb)', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  <RefreshCw size={16} /> Upload Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: Saved Templates                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'templates' && (
        <div>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted, #94a3b8)' }}>
              <Settings size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No templates saved yet. Upload and map a file to create your first template.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {templates.map(t => {
                const Icon = FORMAT_ICONS[t.format_type] || FileText;
                const color = FORMAT_COLORS[t.format_type] || '#64748b';
                const colCount = t.config?.columnMappings ? Object.keys(t.config.columnMappings).length : 0;
                return (
                  <div key={t.invoice_reader_templates_id} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    borderRadius: 10, border: '1px solid var(--border-color, #e2e8f0)',
                    background: 'var(--bg-subtle, #fff)',
                  }}>
                    <Icon size={24} style={{ color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                        {t.format_type} — {colCount} column{colCount !== 1 ? 's' : ''} mapped
                        {t.account_name && <span> — {t.account_name}</span>}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: t.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: t.status === 'Active' ? '#10b981' : '#ef4444',
                    }}>
                      {t.status}
                    </span>
                    <button
                      onClick={() => { applyTemplate(t); setTab('upload'); setStep(1); }}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: 'var(--accent-color, #2563eb)', color: '#fff',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Use
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.invoice_reader_templates_id)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6,
                        border: 'none', background: 'transparent', color: '#ef4444',
                        cursor: 'pointer', opacity: 0.7,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: Upload History                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div>
          {uploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted, #94a3b8)' }}>
              <List size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No uploads yet.</p>
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10, overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-muted, #f8fafc)' }}>
                    {['File', 'Format', 'Account', 'Template', 'Status', 'Rows', 'Invoices', 'Line Items', 'Errors', 'Date'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left',
                        borderBottom: '1px solid var(--border-color, #e2e8f0)', fontWeight: 600,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(u => {
                    const statusColors = {
                      Completed: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
                      Failed: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
                      Processing: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
                      Pending: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
                    };
                    const sc = statusColors[u.status] || statusColors.Pending;
                    return (
                      <tr key={u.invoice_reader_uploads_id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.file_name}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: (FORMAT_COLORS[u.format_type] || '#64748b') + '18',
                            color: FORMAT_COLORS[u.format_type] || '#64748b',
                          }}>
                            {u.format_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{u.account_name || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{u.template_name || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: sc.bg, color: sc.color,
                          }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{u.total_rows}</td>
                        <td style={{ padding: '10px 12px' }}>{u.inserted_invoices}</td>
                        <td style={{ padding: '10px 12px' }}>{u.inserted_line_items}</td>
                        <td style={{ padding: '10px 12px', color: u.error_count ? '#ef4444' : 'inherit' }}>
                          {u.error_count}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
