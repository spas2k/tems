/**
 * @file Simple overlay modal with header, body slot, and action buttons.
 * @module Modal
 *
 * @param {boolean} props.open - Whether the modal is visible
 * @param {string} props.title - Modal header title
 * @param {Function} props.onClose - Callback when the modal is dismissed
 * @param {Function} props.onSave - Callback when the Save button is clicked
 * @param {string} props.saveLabel - Label for the save button (default "Save")
 * @param {ReactNode} props.children - Modal body content
 * @param {number} props.width - Modal width in pixels (default 560)
 */
import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, onSave, saveLabel = 'Save', children, width = 560 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  );
}
