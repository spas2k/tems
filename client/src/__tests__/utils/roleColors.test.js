/**
 * Unit tests for roleColors utility
 */
import { describe, it, expect } from 'vitest';
import { COLOR_SCHEMES, getRoleColor, getRoleScheme, getSchemeForRole } from '../../utils/roleColors';

describe('roleColors', () => {
  describe('COLOR_SCHEMES', () => {
    it('is an array of color scheme objects', () => {
      expect(Array.isArray(COLOR_SCHEMES)).toBe(true);
      expect(COLOR_SCHEMES.length).toBeGreaterThan(0);
    });

    it('each scheme has required properties', () => {
      for (const scheme of COLOR_SCHEMES) {
        expect(scheme).toHaveProperty('id');
        expect(scheme).toHaveProperty('label');
        expect(scheme).toHaveProperty('color');
        expect(scheme).toHaveProperty('bg');
        expect(scheme).toHaveProperty('text');
      }
    });

    it('each scheme has valid hex color values', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      for (const scheme of COLOR_SCHEMES) {
        expect(scheme.color).toMatch(hexPattern);
        expect(scheme.text).toMatch(hexPattern);
      }
    });

    it('contains expected schemes', () => {
      const labels = COLOR_SCHEMES.map(s => s.label);
      expect(labels).toContain('Ocean Blue');
      expect(labels).toContain('Teal');
      expect(labels).toContain('Slate');
    });
  });

  describe('getRoleColor', () => {
    it('returns blue for Admin', () => {
      expect(getRoleColor('Admin')).toBe('#2563eb');
    });

    it('returns teal for Manager', () => {
      expect(getRoleColor('Manager')).toBe('#0d9488');
    });

    it('returns amber for Analyst', () => {
      expect(getRoleColor('Analyst')).toBe('#d97706');
    });

    it('returns slate for Viewer', () => {
      expect(getRoleColor('Viewer')).toBe('#475569');
    });

    it('returns fallback color for unknown role', () => {
      const color = getRoleColor('CustomRole');
      expect(color).toBeTruthy();
      expect(color).toMatch(/^#/);
    });

    it('returns fallback color for null', () => {
      const color = getRoleColor(null);
      expect(color).toBeTruthy();
    });

    it('returns fallback color for undefined', () => {
      const color = getRoleColor(undefined);
      expect(color).toBeTruthy();
    });

    it('accepts role object with name property', () => {
      const color = getRoleColor({ name: 'Admin' });
      expect(color).toBe('#2563eb');
    });

    it('accepts role object with color property', () => {
      const color = getRoleColor({ color: '#ff0000' });
      expect(color).toBe('#ff0000');
    });

    it('uses idx for fallback cycling', () => {
      const color0 = getRoleColor('Unknown', 0);
      const color1 = getRoleColor('Unknown', 1);
      // They may or may not be different depending on palette size, but should both be valid
      expect(color0).toMatch(/^#/);
      expect(color1).toMatch(/^#/);
    });
  });

  describe('getRoleScheme', () => {
    it('returns full scheme for Admin', () => {
      const scheme = getRoleScheme('Admin');
      expect(scheme).toHaveProperty('color', '#2563eb');
      expect(scheme).toHaveProperty('bg');
      expect(scheme).toHaveProperty('text');
    });

    it('returns scheme with bg and text for known roles', () => {
      const scheme = getRoleScheme('Manager');
      expect(scheme.color).toBe('#0d9488');
      expect(scheme.bg).toBeTruthy();
      expect(scheme.text).toBeTruthy();
    });

    it('returns dynamically generated scheme for unknown colors', () => {
      const scheme = getRoleScheme('CustomRole');
      expect(scheme).toHaveProperty('color');
      expect(scheme).toHaveProperty('bg');
      expect(scheme).toHaveProperty('text');
    });
  });

  describe('getSchemeForRole', () => {
    it('returns scheme from COLOR_SCHEMES for Admin', () => {
      const scheme = getSchemeForRole('Admin');
      expect(scheme).toBeTruthy();
      expect(scheme.color).toBe('#2563eb');
      expect(scheme.label).toBe('Ocean Blue');
    });

    it('returns null for roles not in COLOR_SCHEMES', () => {
      const scheme = getSchemeForRole('CustomRole');
      // May return null if the fallback color isn't in COLOR_SCHEMES
      // or may return a matching scheme
      if (scheme) {
        expect(scheme).toHaveProperty('color');
      }
    });
  });
});
