/**
 * Unit tests for _cascadeGuard.js — delete cascade protection
 */
jest.mock('../../db', () => {
  const mockDb = jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    count: jest.fn().mockResolvedValue([{ count: 0 }]),
    first: jest.fn().mockResolvedValue(null),
  }));
  mockDb.raw = jest.fn().mockResolvedValue({});
  return mockDb;
});

const { DEPS } = require('../../routes/_cascadeGuard');
const cascadeGuard = require('../../routes/_cascadeGuard');

describe('cascadeGuard', () => {
  describe('DEPS map', () => {
    it('exports a DEPS object', () => {
      expect(DEPS).toBeDefined();
      expect(typeof DEPS).toBe('object');
    });

    it('vendors has child tables defined', () => {
      expect(DEPS.vendors).toBeInstanceOf(Array);
      expect(DEPS.vendors.length).toBeGreaterThan(0);
      expect(DEPS.vendors[0]).toHaveProperty('table');
      expect(DEPS.vendors[0]).toHaveProperty('fk');
      expect(DEPS.vendors[0]).toHaveProperty('label');
    });

    it('accounts has child tables defined', () => {
      expect(DEPS.accounts).toBeInstanceOf(Array);
      expect(DEPS.accounts.length).toBeGreaterThan(0);
    });

    it('contracts has child tables defined', () => {
      expect(DEPS.contracts).toBeInstanceOf(Array);
      expect(DEPS.contracts.length).toBeGreaterThan(0);
    });

    it('leaf tables have empty arrays', () => {
      expect(DEPS.contract_rates).toEqual([]);
      expect(DEPS.allocations).toEqual([]);
      expect(DEPS.cost_savings).toEqual([]);
      expect(DEPS.disputes).toEqual([]);
    });

    it('all FK references are strings', () => {
      for (const [parent, deps] of Object.entries(DEPS)) {
        for (const dep of deps) {
          expect(typeof dep.table).toBe('string');
          expect(typeof dep.fk).toBe('string');
          expect(typeof dep.label).toBe('string');
        }
      }
    });

    it('vendors has expected child tables', () => {
      const childTables = DEPS.vendors.map(d => d.table);
      expect(childTables).toContain('accounts');
      expect(childTables).toContain('contracts');
    });

    it('invoices has line_items and disputes as children', () => {
      const childTables = DEPS.invoices.map(d => d.table);
      expect(childTables).toContain('line_items');
      expect(childTables).toContain('disputes');
    });
  });

  describe('middleware factory', () => {
    it('returns a function', () => {
      const middleware = cascadeGuard('vendors', 'vendors_id');
      expect(typeof middleware).toBe('function');
    });

    it('calls next() for tables with no deps', async () => {
      const middleware = cascadeGuard('disputes', 'disputes_id');
      const req = { params: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
