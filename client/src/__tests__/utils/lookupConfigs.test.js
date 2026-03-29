/**
 * Unit tests for lookupConfigs utility
 */
import { describe, it, expect } from 'vitest';
import {
  LOOKUP_VENDORS,
  LOOKUP_CONTRACTS,
  LOOKUP_USERS,
  LOOKUP_ACCOUNTS,
  LOOKUP_LOCATIONS,
  LOOKUP_LOCATION_TEXT,
  LOOKUP_CURRENCIES,
  LOOKUP_INVOICES,
  LOOKUP_INVENTORY,
  LOOKUP_ORDERS,
} from '../../utils/lookupConfigs';

const lookups = [
  { name: 'LOOKUP_VENDORS', fn: LOOKUP_VENDORS, idKey: 'vendors_id', displayKey: 'name' },
  { name: 'LOOKUP_CONTRACTS', fn: LOOKUP_CONTRACTS, idKey: 'contracts_id', displayKey: 'contract_number' },
  { name: 'LOOKUP_USERS', fn: LOOKUP_USERS, idKey: 'users_id', displayKey: 'display_name' },
  { name: 'LOOKUP_ACCOUNTS', fn: LOOKUP_ACCOUNTS, idKey: 'accounts_id', displayKey: 'account_number' },
  { name: 'LOOKUP_LOCATIONS', fn: LOOKUP_LOCATIONS, idKey: 'locations_id', displayKey: 'location_name' },
  { name: 'LOOKUP_LOCATION_TEXT', fn: LOOKUP_LOCATION_TEXT, idKey: 'location_name', displayKey: 'location_name' },
  { name: 'LOOKUP_CURRENCIES', fn: LOOKUP_CURRENCIES, idKey: 'currency_id', displayKey: 'currency_code' },
  { name: 'LOOKUP_INVOICES', fn: LOOKUP_INVOICES, idKey: 'invoices_id', displayKey: 'invoice_number' },
  { name: 'LOOKUP_INVENTORY', fn: LOOKUP_INVENTORY, idKey: 'inventory_id', displayKey: 'inventory_number' },
  { name: 'LOOKUP_ORDERS', fn: LOOKUP_ORDERS, idKey: 'orders_id', displayKey: 'order_number' },
];

describe('lookupConfigs', () => {
  for (const { name, fn, idKey, displayKey } of lookups) {
    describe(name, () => {
      it('is a function', () => {
        expect(typeof fn).toBe('function');
      });

      it('returns config with required properties', () => {
        const config = fn([]);
        expect(config).toHaveProperty('data');
        expect(config).toHaveProperty('idKey', idKey);
        expect(config).toHaveProperty('displayKey', displayKey);
        expect(config).toHaveProperty('modalTitle');
        expect(config).toHaveProperty('searchableKeys');
        expect(config).toHaveProperty('columns');
        expect(config).toHaveProperty('placeholder');
      });

      it('passes data through', () => {
        const testData = [{ id: 1 }, { id: 2 }];
        const config = fn(testData);
        expect(config.data).toBe(testData);
      });

      it('defaults to empty array when no data given', () => {
        const config = fn();
        expect(config.data).toEqual([]);
      });

      it('has non-empty columns array', () => {
        const config = fn();
        expect(Array.isArray(config.columns)).toBe(true);
        expect(config.columns.length).toBeGreaterThan(0);
      });

      it('columns have key and label', () => {
        const config = fn();
        for (const col of config.columns) {
          expect(col).toHaveProperty('key');
          expect(col).toHaveProperty('label');
          expect(typeof col.key).toBe('string');
          expect(typeof col.label).toBe('string');
        }
      });

      it('has non-empty searchableKeys', () => {
        const config = fn();
        expect(Array.isArray(config.searchableKeys)).toBe(true);
        expect(config.searchableKeys.length).toBeGreaterThan(0);
      });

      it('placeholder is a string', () => {
        const config = fn();
        expect(typeof config.placeholder).toBe('string');
        expect(config.placeholder.length).toBeGreaterThan(0);
      });

      it('modalTitle is a string', () => {
        const config = fn();
        expect(typeof config.modalTitle).toBe('string');
      });
    });
  }
});
