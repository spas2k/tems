/**
 * @file Role color scheme definitions and lookup helpers.
 * @module roleColors
 *
 * Maps role names/objects to hex color schemes with background and text
 * contrast variants. Used by badges, chips, and the role detail page.
 *
 * @exports COLOR_SCHEMES - Array of { bg, text, light } color scheme objects.
 * @exports getRoleColor - getRoleColor(roleOrName, idx) — Returns the primary hex color for a role.
 * @exports getRoleScheme - getRoleScheme(roleOrName, idx) — Returns the full { bg, text, light } scheme.
 * @exports getSchemeForRole - getSchemeForRole(roleOrName) — Alias returning color scheme by name match.
 */
/**
 * Shared role color scheme definitions.
 * Each scheme has a primary `color` hex, a light `bg` for chips/badges,
 * and a `text` hex for readable contrast.
 */
export const COLOR_SCHEMES = [
  { id: '#2563eb', label: 'Ocean Blue', color: '#2563eb', bg: '#dbeafe', text: '#1e40af' },
  { id: '#0d9488', label: 'Teal',       color: '#0d9488', bg: '#ccfbf1', text: '#115e59' },
  { id: '#059669', label: 'Emerald',    color: '#059669', bg: '#d1fae5', text: '#065f46' },
  { id: '#7c3aed', label: 'Violet',     color: '#7c3aed', bg: '#ede9fe', text: '#5b21b6' },
  { id: '#c026d3', label: 'Fuchsia',    color: '#c026d3', bg: '#fae8ff', text: '#86198f' },
  { id: '#e11d48', label: 'Rose',       color: '#e11d48', bg: '#ffe4e6', text: '#9f1239' },
  { id: '#ea580c', label: 'Coral',      color: '#ea580c', bg: '#ffedd5', text: '#9a3412' },
  { id: '#d97706', label: 'Amber',      color: '#d97706', bg: '#fef3c7', text: '#92400e' },
  { id: '#4338ca', label: 'Indigo',     color: '#4338ca', bg: '#e0e7ff', text: '#3730a3' },
  { id: '#475569', label: 'Slate',      color: '#475569', bg: '#e2e8f0', text: '#1e293b' },
];

/** Hex colors for built-in system roles */
const SYSTEM_COLORS = {
  Admin:   '#2563eb',
  Manager: '#0d9488',
  Analyst: '#d97706',
  Viewer:  '#475569',
};

const FALLBACK_PALETTE = ['#7c3aed', '#c026d3', '#059669', '#ea580c', '#4338ca'];

/**
 * Returns the primary color for a role.
 * @param {object|string} roleOrName – role object (with .color, .name) or plain name string
 * @param {number} [idx=0] – position index for fallback palette cycling
 */
export function getRoleColor(roleOrName, idx = 0) {
  if (!roleOrName) return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
  if (typeof roleOrName === 'string') {
    return SYSTEM_COLORS[roleOrName] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
  }
  return roleOrName.color || SYSTEM_COLORS[roleOrName.name] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

/**
 * Returns { color, bg, text } for a role — always colored, never plain gray.
 * Looks up the named scheme first; if not found, derives bg/text from the hex.
 */
export function getRoleScheme(roleOrName, idx = 0) {
  const color = getRoleColor(roleOrName, idx);
  const named = COLOR_SCHEMES.find(s => s.color === color);
  if (named) return named;
  // Derive light bg from the hex (20% opacity) and use the color itself as text
  return { color, bg: `${color}22`, text: color };
}

/**
 * Returns the full scheme object for a role's color, or null if not found.
 */
export function getSchemeForRole(roleOrName) {
  const color = getRoleColor(roleOrName);
  return COLOR_SCHEMES.find(s => s.color === color) || null;
}
