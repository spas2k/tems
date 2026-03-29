/**
 * @file Animated status toggle switch component.
 * @module StatusToggle
 *
 * A sliding bubble on/off switch with animated color, position, and border-radius transitions.
 * Green = Active, Red = Inactive.
 */
import React, { useState } from 'react';

export default function StatusToggle({ value, onChange, disabled }) {
  const isActive = value === 'Active';
  const [pressed, setPressed] = useState(false);

  const toggle = () => {
    if (disabled) return;
    onChange(isActive ? 'Inactive' : 'Active');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        className={`status-toggle ${isActive ? 'status-toggle--active' : 'status-toggle--inactive'} ${pressed ? 'status-toggle--pressed' : ''}`}
        onClick={toggle}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        disabled={disabled}
        aria-label={`Status: ${value}. Click to toggle.`}
        role="switch"
        aria-checked={isActive}
      >
        <span className="status-toggle__track">
          <span className="status-toggle__knob">
            <span className="status-toggle__icon">
              {isActive ? '✓' : '✕'}
            </span>
          </span>
        </span>
        <span className="status-toggle__label">
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </button>
    </div>
  );
}
