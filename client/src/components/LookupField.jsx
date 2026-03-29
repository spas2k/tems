/**
 * @file Read-only input that opens a LookupModal for record selection.
 * @module LookupField
 *
 * @param {string} props.label - Field label text
 * @param {number|string|null} props.value - Currently selected record ID
 * @param {Function} props.onChange - Callback with selected record ID
 * @param {Function} props.onClear - Callback to clear the selection
 * @param {string} props.placeholder - Placeholder text (default "Select...")
 * @param {boolean} props.disabled - Whether the field is read-only
 * @param {string} props.modalTitle - Title for the lookup modal
 * @param {Array} props.data - Array of records to search/select from
 * @param {Array} props.columns - Column definitions for the lookup table
 * @param {Array} props.searchableKeys - Object keys to include in search matching
 * @param {string} props.displayValue - Display text for the currently selected value
 */
﻿import React, { useState } from 'react';
import { Search } from 'lucide-react';
import LookupModal from './LookupModal';

export default function LookupField({
  label,
  value,
  onChange,
  onClear,
  placeholder = 'Select...',
  disabled = false,
  modalTitle = 'Select Item',
  data = [],
  columns = [],
  searchableKeys = [],
  displayValue, // function to display the currently selected value in the box
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {label && <label className="form-label">{label}</label>}
      <div 
        className="form-input" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? 'var(--bg-card-alt, #f1f5f9)' : 'var(--bg-card, #fff)',
          color: value ? 'inherit' : '#94a3b8'
        }}
        onClick={() => !disabled && setOpen(true)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? displayValue : placeholder}
        </span>
        <Search size={14} color="#94a3b8" />
      </div>

      <LookupModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={onChange}
        title={modalTitle}
        data={data}
        columns={columns}
        searchableKeys={searchableKeys}
      />
    </div>
  );
}
