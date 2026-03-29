/**
 * Unit tests for db.js — database connection and helpers
 */

// We test the insertReturningId logic by mocking knex
jest.mock('knex', () => {
  const mockReturning = jest.fn();
  const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
  const mockDbFn = jest.fn().mockReturnValue({ insert: mockInsert });
  mockDbFn.raw = jest.fn().mockResolvedValue(true);
  mockDbFn._mocks = { mockInsert, mockReturning };
  const knexFactory = jest.fn().mockReturnValue(mockDbFn);
  return knexFactory;
});

jest.mock('../knexfile', () => ({
  development: {
    client: 'pg',
    connection: { database: 'test_db' },
  },
}));

describe('db module', () => {
  let db;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache so each test gets fresh state
    jest.resetModules();

    // Re-mock after resetModules
    jest.mock('knex', () => {
      const mockReturning = jest.fn();
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockDbFn = jest.fn().mockReturnValue({ insert: mockInsert });
      mockDbFn.raw = jest.fn().mockResolvedValue(true);
      mockDbFn._mocks = { mockInsert, mockReturning };
      const knexFactory = jest.fn().mockReturnValue(mockDbFn);
      return knexFactory;
    });

    jest.mock('../knexfile', () => ({
      development: {
        client: 'pg',
        connection: { database: 'test_db' },
      },
    }));

    db = require('../db');
  });

  it('exports a function (knex instance)', () => {
    expect(typeof db).toBe('function');
  });

  it('has insertReturningId method', () => {
    expect(typeof db.insertReturningId).toBe('function');
  });

  describe('insertReturningId', () => {
    it('uses {table}_id convention for PK column', async () => {
      db._mocks.mockReturning.mockResolvedValue([{ accounts_id: 42 }]);
      const result = await db.insertReturningId('accounts', { name: 'Test' });
      expect(result).toBe(42);
      expect(db._mocks.mockReturning).toHaveBeenCalledWith('accounts_id');
    });

    it('uses PK_OVERRIDES for circuits table', async () => {
      db._mocks.mockReturning.mockResolvedValue([{ cir_id: 7 }]);
      const result = await db.insertReturningId('circuits', { name: 'C1' });
      expect(result).toBe(7);
      expect(db._mocks.mockReturning).toHaveBeenCalledWith('cir_id');
    });

    it('uses PK_OVERRIDES for form_instructions table', async () => {
      db._mocks.mockReturning.mockResolvedValue([{ id: 99 }]);
      const result = await db.insertReturningId('form_instructions', { text: 'Hello' });
      expect(result).toBe(99);
      expect(db._mocks.mockReturning).toHaveBeenCalledWith('id');
    });

    it('handles raw integer return value', async () => {
      db._mocks.mockReturning.mockResolvedValue([55]);
      const result = await db.insertReturningId('vendors', { name: 'V1' });
      expect(result).toBe(55);
    });

    it('constructs correct PK for various tables', async () => {
      db._mocks.mockReturning.mockResolvedValue([{ invoices_id: 1 }]);
      await db.insertReturningId('invoices', { invoice_number: 'INV-001' });
      expect(db._mocks.mockReturning).toHaveBeenCalledWith('invoices_id');

      await db.insertReturningId('vendors', { name: 'V1' });
      expect(db._mocks.mockReturning).toHaveBeenCalledWith('vendors_id');

      await db.insertReturningId('contracts', { contract_name: 'C1' });
      expect(db._mocks.mockReturning).toHaveBeenCalledWith('contracts_id');
    });
  });
});
