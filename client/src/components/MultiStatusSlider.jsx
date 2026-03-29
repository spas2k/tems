/**
 * @file Multi-status slider with hover-to-expand behavior.
 * @module MultiStatusSlider
 *
 * Compact pill showing current status; expands on hover to reveal all options
 * with an animated sliding knob and color transitions.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';

const STATUS_COLORS = {
  Active:             { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)',  text: '#16a34a', darkText: '#4ade80' },
  Inactive:           { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', glow: 'rgba(100,116,139,0.3)', text: '#64748b', darkText: '#94a3b8' },
  Pending:            { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', glow: 'rgba(59,130,246,0.4)',  text: '#2563eb', darkText: '#60a5fa' },
  'In Progress':      { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', glow: 'rgba(99,102,241,0.4)',  text: '#4f46e5', darkText: '#818cf8' },
  Completed:          { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)',  text: '#16a34a', darkText: '#4ade80' },
  Cancelled:          { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.35)', text: '#dc2626', darkText: '#f87171' },
  Terminated:         { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.35)', text: '#dc2626', darkText: '#f87171' },
  Expired:            { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', glow: 'rgba(100,116,139,0.3)', text: '#64748b', darkText: '#94a3b8' },
  Suspended:          { bg: 'linear-gradient(135deg,#f97316,#ea580c)', glow: 'rgba(249,115,22,0.4)',  text: '#ea580c', darkText: '#fb923c' },
  Disconnected:       { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', glow: 'rgba(100,116,139,0.3)', text: '#64748b', darkText: '#94a3b8' },
  Open:               { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', glow: 'rgba(59,130,246,0.4)',  text: '#2563eb', darkText: '#60a5fa' },
  Closed:             { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', glow: 'rgba(100,116,139,0.3)', text: '#64748b', darkText: '#94a3b8' },
  Paid:               { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)',  text: '#16a34a', darkText: '#4ade80' },
  Unpaid:             { bg: 'linear-gradient(135deg,#f97316,#ea580c)', glow: 'rgba(249,115,22,0.4)',  text: '#ea580c', darkText: '#fb923c' },
  Overdue:            { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.35)', text: '#dc2626', darkText: '#f87171' },
  Disputed:           { bg: 'linear-gradient(135deg,#f97316,#ea580c)', glow: 'rgba(249,115,22,0.4)',  text: '#ea580c', darkText: '#fb923c' },
  Void:               { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', glow: 'rgba(100,116,139,0.3)', text: '#64748b', darkText: '#94a3b8' },
  Won:                { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)',  text: '#16a34a', darkText: '#4ade80' },
  Lost:               { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.35)', text: '#dc2626', darkText: '#f87171' },
  Resolved:           { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)',  text: '#16a34a', darkText: '#4ade80' },
  'Under Review':     { bg: 'linear-gradient(135deg,#eab308,#ca8a04)', glow: 'rgba(234,179,8,0.4)',   text: '#ca8a04', darkText: '#facc15' },
  Credited:           { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)',  text: '#16a34a', darkText: '#4ade80' },
  Denied:             { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.35)', text: '#dc2626', darkText: '#f87171' },
  'On Hold':          { bg: 'linear-gradient(135deg,#eab308,#ca8a04)', glow: 'rgba(234,179,8,0.4)',   text: '#ca8a04', darkText: '#facc15' },
  'In Review':        { bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', glow: 'rgba(139,92,246,0.4)',  text: '#7c3aed', darkText: '#a78bfa' },
  'Pending Vendor':   { bg: 'linear-gradient(135deg,#f97316,#ea580c)', glow: 'rgba(249,115,22,0.4)',  text: '#ea580c', darkText: '#fb923c' },
  'Pending Internal': { bg: 'linear-gradient(135deg,#eab308,#ca8a04)', glow: 'rgba(234,179,8,0.4)',   text: '#ca8a04', darkText: '#facc15' },
  Identified:         { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', glow: 'rgba(59,130,246,0.4)',  text: '#2563eb', darkText: '#60a5fa' },
  Implemented:        { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', glow: 'rgba(34,197,94,0.4)',  text: '#16a34a', darkText: '#4ade80' },
  Rejected:           { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.35)', text: '#dc2626', darkText: '#f87171' },
};

const FALLBACK = { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', glow: 'rgba(100,116,139,0.3)', text: '#64748b', darkText: '#94a3b8' };

function getColor(status) {
  return STATUS_COLORS[status] || FALLBACK;
}

export default function MultiStatusSlider({ value, options, onChange, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const [knobStyle, setKnobStyle] = useState({ x: 0, w: 0, ready: false });
  const containerRef = useRef(null);
  const optionRefs = useRef([]);
  const trackRef = useRef(null);

  const currentIndex = options.indexOf(value);
  const color = getColor(value);

  const measureKnob = useCallback(() => {
    if (!expanded || currentIndex < 0) return;
    const el = optionRefs.current[currentIndex];
    const track = trackRef.current;
    if (el && track) {
      setKnobStyle({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
    }
  }, [expanded, currentIndex]);

  useEffect(() => {
    if (expanded) {
      requestAnimationFrame(() => requestAnimationFrame(measureKnob));
    } else {
      setKnobStyle(s => ({ ...s, ready: false }));
    }
  }, [expanded, measureKnob]);

  useEffect(() => {
    if (expanded) {
      requestAnimationFrame(measureKnob);
    }
  }, [value, expanded, measureKnob]);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded]);

  const toggleExpand = () => {
    if (disabled) return;
    setExpanded(e => !e);
  };

  const handleClick = (opt) => {
    if (disabled || opt === value) return;
    onChange(opt);
    setExpanded(false);
  };

  return (
    <div
      ref={containerRef}
      className={`mss ${expanded ? 'mss--expanded' : 'mss--compact'} ${disabled ? 'mss--disabled' : ''}`}
    >
      {!expanded ? (
        /* ── Compact: just the current status pill ── */
        <div
          className="mss__pill"
          onClick={toggleExpand}
          style={{ background: color.bg, boxShadow: `0 0 12px ${color.glow}` }}
        >
          <span className="mss__pill-dot" />
          <span className="mss__pill-label">{value}</span>
        </div>
      ) : (
        /* ── Expanded: full track with all options ── */
        <div className="mss__track" ref={trackRef}>
          {knobStyle.ready && (
            <div
              className="mss__knob"
              style={{
                transform: `translateX(${knobStyle.x}px)`,
                width: knobStyle.w,
                background: color.bg,
                boxShadow: `0 0 14px ${color.glow}, 0 2px 8px rgba(0,0,0,0.18)`,
              }}
            />
          )}
          {options.map((opt, i) => {
            const isActive = opt === value;
            const optColor = getColor(opt);
            return (
              <button
                key={opt}
                ref={el => optionRefs.current[i] = el}
                className={`mss__option ${isActive ? 'mss__option--active' : ''}`}
                onClick={() => handleClick(opt)}
                disabled={disabled}
                style={{
                  color: isActive ? '#fff' : optColor.text,
                  '--option-border-color': optColor.bg.match(/#[0-9a-f]{6}/i)?.[0] || optColor.text,
                }}
                title={opt}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
