/**
 * Unit tests for _validators.js — validation rules and middleware
 */
const { validationResult } = require('express-validator');

// We need to test the validation chains by running them against mock requests
const {
  validate,
  idParam,
  vendorRules,
  accountRules,
  contractRules,
  invoiceRules,
  lineItemRules,
  disputeRules,
} = require('../../routes/_validators');

// Helper to run express-validator chains against a mock request
async function runValidation(chains, reqData) {
  const req = {
    body: reqData.body || {},
    params: reqData.params || {},
    query: reqData.query || {},
    headers: {},
  };
  for (const chain of (Array.isArray(chains) ? chains : [chains])) {
    await chain.run(req);
  }
  return validationResult(req);
}

describe('_validators', () => {
  describe('validate middleware', () => {
    it('calls next() when no errors', () => {
      const req = { body: {}, params: {}, query: {}, headers: {} };
      // Pretend validationResult returns no errors
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      // We need a request that has been processed by express-validator
      // For a simpler test, we use the validate function with empty validator context
      const mockReq = {
        ...req,
        [Symbol.for('express-validator#contexts')]: [],
      };
      validate(mockReq, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('idParam', () => {
    it('accepts valid positive integer', async () => {
      const result = await runValidation(idParam, { params: { id: '5' } });
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects zero', async () => {
      const result = await runValidation(idParam, { params: { id: '0' } });
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects negative numbers', async () => {
      const result = await runValidation(idParam, { params: { id: '-1' } });
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects non-numeric values', async () => {
      const result = await runValidation(idParam, { params: { id: 'abc' } });
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects float values', async () => {
      const result = await runValidation(idParam, { params: { id: '1.5' } });
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('vendorRules', () => {
    const validVendor = {
      name: 'Acme Corp',
      status: 'Active',
    };

    it('accepts valid vendor data', async () => {
      const result = await runValidation(vendorRules, { body: validVendor });
      expect(result.isEmpty()).toBe(true);
    });

    it('requires name', async () => {
      const result = await runValidation(vendorRules, { body: { ...validVendor, name: '' } });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'name')).toBe(true);
    });

    it('validates status enum', async () => {
      const result = await runValidation(vendorRules, { body: { ...validVendor, status: 'Invalid' } });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(e => e.path === 'status')).toBe(true);
    });

    it('accepts Active status', async () => {
      const result = await runValidation(vendorRules, { body: { ...validVendor, status: 'Active' } });
      expect(result.isEmpty()).toBe(true);
    });

    it('accepts Inactive status', async () => {
      const result = await runValidation(vendorRules, { body: { ...validVendor, status: 'Inactive' } });
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects name exceeding max length', async () => {
      const result = await runValidation(vendorRules, { body: { ...validVendor, name: 'x'.repeat(121) } });
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts optional fields as empty', async () => {
      const result = await runValidation(vendorRules, { body: { name: 'Test' } });
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('accountRules', () => {
    const validAccount = {
      vendors_id: 1,
      account_number: 'ACC-001',
      status: 'Active',
    };

    it('accepts valid account data', async () => {
      const result = await runValidation(accountRules, { body: validAccount });
      expect(result.isEmpty()).toBe(true);
    });

    it('requires vendors_id', async () => {
      const result = await runValidation(accountRules, { body: { ...validAccount, vendors_id: '' } });
      expect(result.isEmpty()).toBe(false);
    });

    it('requires account_number', async () => {
      const result = await runValidation(accountRules, { body: { ...validAccount, account_number: '' } });
      expect(result.isEmpty()).toBe(false);
    });

    it('validates vendors_id is positive integer', async () => {
      const result = await runValidation(accountRules, { body: { ...validAccount, vendors_id: -1 } });
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('contractRules', () => {
    const validContract = {
      vendors_id: 1,
      status: 'Active',
    };

    it('accepts valid contract data', async () => {
      const result = await runValidation(contractRules, { body: validContract });
      expect(result.isEmpty()).toBe(true);
    });

    it('requires vendors_id', async () => {
      const result = await runValidation(contractRules, { body: { ...validContract, vendors_id: '' } });
      expect(result.isEmpty()).toBe(false);
    });

    it('validates status enum (Active, Expired, Pending, Terminated)', async () => {
      const result = await runValidation(contractRules, { body: { ...validContract, status: 'Bogus' } });
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts Expired status', async () => {
      const result = await runValidation(contractRules, { body: { ...validContract, status: 'Expired' } });
      expect(result.isEmpty()).toBe(true);
    });

    it('validates date fields as ISO-8601', async () => {
      const result = await runValidation(contractRules, {
        body: { ...validContract, start_date: 'not-a-date' },
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid ISO-8601 dates', async () => {
      const result = await runValidation(contractRules, {
        body: { ...validContract, start_date: '2025-01-15', expiration_date: '2026-01-15' },
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('validates term_months is positive integer', async () => {
      const result = await runValidation(contractRules, {
        body: { ...validContract, term_months: -5 },
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('validates auto_renew is boolean', async () => {
      const result = await runValidation(contractRules, {
        body: { ...validContract, auto_renew: 'yes' },
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts boolean auto_renew', async () => {
      const result = await runValidation(contractRules, {
        body: { ...validContract, auto_renew: true },
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('validates decimal fields', async () => {
      const result = await runValidation(contractRules, {
        body: { ...validContract, contracted_rate: 'not-a-number' },
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid decimal fields', async () => {
      const result = await runValidation(contractRules, {
        body: { ...validContract, contracted_rate: '99.50', contract_value: '10000.00' },
      });
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('invoiceRules', () => {
    it('exports invoiceRules as array', () => {
      expect(Array.isArray(invoiceRules)).toBe(true);
      expect(invoiceRules.length).toBeGreaterThan(0);
    });
  });

  describe('lineItemRules', () => {
    it('exports lineItemRules as array', () => {
      expect(Array.isArray(lineItemRules)).toBe(true);
      expect(lineItemRules.length).toBeGreaterThan(0);
    });
  });

  describe('disputeRules', () => {
    it('exports disputeRules as array', () => {
      expect(Array.isArray(disputeRules)).toBe(true);
      expect(disputeRules.length).toBeGreaterThan(0);
    });
  });
});
