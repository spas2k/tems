import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader, ChevronDown, Info, X } from 'lucide-react';
import { getBatchTables, downloadBatchTemplate, uploadBatchFile } from '../api';

export default function BatchUpload() {
  const [tables, setTables]               = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [loading, setLoading]             = useState(true);
  const [downloading, setDownloading]     = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const [result, setResult]               = useState(null);     // success or error
  const [file, setFile]                   = useState(null);
  const fileInputRef                      = useRef(null);

  // Fetch available tables on mount
  useEffect(() => {
    getBatchTables()
      .then(res => { setTables(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectedDef = tables.find(t => t.key === selectedTable);

  /* ── Template download ─────────────────── */
  const handleDownload = async () => {
    if (!selectedTable) return;
    setDownloading(true);
    try {
      const res = await downloadBatchTemplate(selectedTable);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `TEMS_Template_${selectedDef?.label?.replace(/\s+/g, '_') || selectedTable}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setResult({ type: 'error', message: 'Failed to download template' });
    } finally {
      setDownloading(false);
    }
  };

  /* ── File handling ─────────────────────── */
  const processFile = useCallback((f) => {
    if (!f) return;
    const valid = /\.(xlsx|xls)$/i.test(f.name);
    if (!valid) {
      setResult({ type: 'error', message: 'Only .xlsx and .xls files are accepted' });
      return;
    }
    setFile(f);
    setResult(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    processFile(f);
  }, [processFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = ()  => setDragOver(false);

  const handleFileSelect = (e) => {
    processFile(e.target.files?.[0]);
    e.target.value = '';
  };

  /* ── Upload ────────────────────────────── */
  const handleUpload = async () => {
    if (!selectedTable || !file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await uploadBatchFile(selectedTable, file);
      setResult({
        type: 'success',
        message: `Successfully inserted ${res.data.inserted} row${res.data.inserted !== 1 ? 's' : ''} into ${res.data.tableLabel}`,
        data: res.data,
      });
      setFile(null);
    } catch (err) {
      const d = err.response?.data;
      if (d?.details) {
        setResult({
          type: 'error',
          message: d.error || 'Upload failed',
          details: d.details,
          validRows: d.validRows,
          errorCount: d.errorCount,
          totalRows: d.totalRows,
        });
      } else {
        setResult({ type: 'error', message: d?.error || 'Upload failed — please check your file and try again' });
      }
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => { setFile(null); setResult(null); };

  /* ── Render ────────────────────────────── */
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Page header card */}
      <div className="page-card" style={{ borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
        <div className="page-card-header" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Upload size={22} />
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 17 }}>Batch Upload</span>
        </div>

        <div style={{ padding: 24 }}>
          {/* Step 1: Select table */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div className="batch-step-number">1</div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Select Target Table</span>
            </div>
            <div style={{ position: 'relative', maxWidth: 400 }}>
              <select
                className="batch-select"
                value={selectedTable}
                onChange={e => { setSelectedTable(e.target.value); setFile(null); setResult(null); }}
                disabled={loading}
              >
                <option value="">— Choose a table —</option>
                {tables.map(t => (
                  <option key={t.key} value={t.key}>{t.label} ({t.columnCount} columns)</option>
                ))}
              </select>
              <ChevronDown size={16} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: '#94a3b8',
              }} />
            </div>

            {/* Required fields info */}
            {selectedDef && selectedDef.requiredColumns.length > 0 && (
              <div className="batch-info-box" style={{ marginTop: 12 }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Required fields:</strong>{' '}
                  {selectedDef.requiredColumns.join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Download template */}
          {selectedTable && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div className="batch-step-number">2</div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Download Template</span>
              </div>
              <button
                className="batch-btn-primary"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? <Loader size={16} className="spin" /> : <Download size={16} />}
                {downloading ? 'Generating...' : `Download ${selectedDef?.label} Template`}
              </button>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                Fill in the template and save as .xlsx before uploading.
              </p>
            </div>
          )}

          {/* Step 3: Upload file */}
          {selectedTable && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div className="batch-step-number">3</div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Upload Completed File</span>
              </div>

              {/* Drop zone */}
              <div
                className={`batch-dropzone${dragOver ? ' batch-dropzone-active' : ''}${file ? ' batch-dropzone-has-file' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <FileSpreadsheet size={36} color="#16a34a" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {(file.size / 1024).toFixed(1)} KB — Ready to upload
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="batch-btn-icon"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Upload size={40} color="#94a3b8" style={{ marginBottom: 8 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      Drag & drop your file here
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      or click to browse — .xlsx / .xls only (max 5 MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Upload button */}
              {file && (
                <button
                  className="batch-btn-upload"
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{ marginTop: 16 }}
                >
                  {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
                  {uploading ? 'Uploading...' : `Upload to ${selectedDef?.label}`}
                </button>
              )}
            </div>
          )}

          {/* Result feedback */}
          {result && (
            <div className={`batch-result ${result.type === 'success' ? 'batch-result-success' : 'batch-result-error'}`}
              style={{ marginTop: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {result.type === 'success'
                  ? <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{result.message}</div>
                  {result.data && (
                    <div style={{ fontSize: 12 }}>
                      {result.data.inserted} of {result.data.totalRows} rows inserted
                    </div>
                  )}
                  {result.details && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        {result.validRows} valid / {result.errorCount} errors out of {result.totalRows} rows
                      </div>
                      <div className="batch-error-list" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {result.details.map((d, i) => (
                          <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
