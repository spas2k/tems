/**
 * @file Searchable selection modal for picking related records.
 * @module LookupModal
 *
 * @param {boolean} props.open - Whether the modal is visible
 * @param {Function} props.onClose - Callback when the modal is dismissed
 * @param {Function} props.onSelect - Callback with the selected record
 * @param {string} props.title - Modal header title
 * @param {Array} props.data - Array of records to display
 * @param {Array} props.columns - Column definitions for the table
 * @param {Array} props.searchableKeys - Object keys to include in search filtering
 */
﻿import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

export default function LookupModal({
  open,
  onClose,
  onSelect,
  title,
  data, // Array of objects
  columns, // Array of { key, label, render(val, row) }
  searchableKeys = [] // keys to search on
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return data;
    const lower = search.toLowerCase();
    return data.filter(row =>
      searchableKeys.some(key => String(row[key] || '').toLowerCase().includes(lower))
    );
  }, [data, search, searchableKeys]);

  if (!open) return null;

  return (
    <>
      <style>{`
        .lookup-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 99999;
          backdrop-filter: blur(2px);
        }
        .lookup-modal {
          background-color: #0f172a; /* Matches left menu nav-sidebar */
          border: 1px solid #1e293b;
          border-radius: 12px;
          width: 90%;
          max-width: 650px;
          display: flex;
          flex-direction: column;
          height: 80vh;
          max-height: 800px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          font-family: inherit;
        }
        .lm-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 24px;
        }
        .lm-title {
          margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;
        }
        .lm-close-btn {
          background: rgba(255, 255, 255, 0.1); border: none; border-radius: 6px;
          padding: 6px; cursor: pointer; color: #cbd5e1; display: flex;
          align-items: center; justify-content: center; transition: 0.15s;
        }
        .lm-close-btn:hover { background: rgba(255, 255, 255, 0.2); color: #fff; }
        .lm-search-container {
          padding: 0 24px 16px;
        }
        .lm-search-wrapper {
          position: relative; width: 100%;
        }
        .lm-search-input {
          width: 100%; padding: 10px 12px 10px 40px; border-radius: 8px;
          background: #1e293b; border: 1px solid #334155;
          color: #ffffff; font-size: 14px; outline: none; transition: 0.15s;
        }
        .lm-search-input:focus { border-color: #3b82f6; }
        .lm-records { font-size: 12px; color: #94a3b8; margin-top: 10px; font-weight: 500; }
        .lm-table-container { flex: 1; overflow-y: auto; }
        .lm-table { width: 100%; border-collapse: collapse; }
        .lm-table th {
          position: sticky; top: 0; background: #0f172a; z-index: 10;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          color: #94a3b8; padding: 12px 24px; text-align: left;
          border-bottom: 1px solid #1e293b; letter-spacing: 0.5px;
        }
        .lm-table td {
          padding: 12px 24px; font-size: 14px; color: #e2e8f0;
          border-bottom: 1px solid #1e293b;
        }
        .lm-table tr { transition: background 0.1s; cursor: pointer; }
        .lm-table tr:hover { background: #334155; } /* Highlight row matches picture's blue tint */
        .lm-footer {
          padding: 16px 24px; display: flex; justify-content: space-between;
          align-items: center; border-top: 1px solid #1e293b; background: #0f172a;
        }
        .lm-footer-text { font-size: 13px; color: #64748b; }
        .lm-cancel-btn { background: transparent; border: none; color: #ffffff; font-weight: 500; cursor: pointer; font-size: 14px; }
        .lm-cancel-btn:hover { text-decoration: underline; }
      `}</style>

      <div className="lookup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="lookup-modal">
          
          {/* Header */}
          <div className="lm-header">
            <h2 className="lm-title">{title}</h2>
            <button className="lm-close-btn" onClick={onClose}><X size={18} /></button>
          </div>

          {/* Search */}
          <div className="lm-search-container">
            <div className="lm-search-wrapper">
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="lm-search-input"
                placeholder="Search..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                autoFocus 
              />
            </div>
            <div className="lm-records">{filtered.length} records</div>
          </div>

          {/* Table */}
          <div className="lm-table-container">
            <table className="lm-table">
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th key={col.key || i}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} onClick={() => { onSelect(row); onClose(); }}>
                    {columns.map((col, j) => (
                      <td key={col.key || j}>
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="lm-footer">
            <div className="lm-footer-text">Click a row to select</div>
            <button className="lm-cancel-btn" onClick={onClose}>Cancel</button>
          </div>

        </div>
      </div>
    </>
  );
}



