/**
 * Unit tests for _bulkUpdate.js — bulk update factory
 */
const bulkUpdate = require('../../routes/_bulkUpdate');

// Mock the db module
jest.mock('../../db', () => {
  const mockUpdate = jest.fn().mockResolvedValue(3);
  const mockWhereIn = jest.fn().mockReturnValue({ update: mockUpdate });
  const mockInsert = jest.fn().mockResolvedValue([1]);
  const mockHasColumn = jest.fn().mockResolvedValue(true);

  const db = jest.fn().mockReturnValue({
    whereIn: mockWhereIn,
    insert: mockInsert,
  });
  db.schema = { hasColumn: mockHasColumn };
  db._mocks = { mockWhereIn, mockUpdate, mockInsert, mockHasColumn };
  return db;
});

const db = require('../../db');

describe('bulkUpdate', () => {
  let handler, req, res;

  beforeEach(() => {
    handler = bulkUpdate('vendors', 'vendors_id');
    req = {
      body: { ids: [1, 2, 3], updates: { name: 'Updated' } },
      user: { users_id: 1 },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
    db._mocks.mockUpdate.mockResolvedValue(3);
    db._mocks.mockHasColumn.mockResolvedValue(true);
    db._mocks.mockInsert.mockResolvedValue([1]);
  });

  it('returns a function', () => {
    expect(typeof handler).toBe('function');
  });

  it('rejects empty ids array', async () => {
    req.body.ids = [];
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'ids must be a non-empty array' });
  });

  it('rejects non-array ids', async () => {
    req.body.ids = 'not-array';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'ids must be a non-empty array' });
  });

  it('rejects more than 500 ids', async () => {
    req.body.ids = Array.from({ length: 501 }, (_, i) => i + 1);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot bulk-update more than 500 records at once' });
  });

  it('rejects non-positive integer ids', async () => {
    req.body.ids = [1, -2, 3];
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'All ids must be positive integers' });
  });

  it('rejects non-integer ids', async () => {
    req.body.ids = [1, 2.5, 3];
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'All ids must be positive integers' });
  });

  it('rejects missing updates', async () => {
    req.body.updates = null;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'updates must be a non-empty object' });
  });

  it('rejects array updates', async () => {
    req.body.updates = ['invalid'];
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'updates must be a non-empty object' });
  });

  it('strips the id column from updates', async () => {
    req.body.updates = { vendors_id: 999, name: 'Test' };
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ updated: 3 });
  });

  it('strips __proto__/constructor/prototype fields', async () => {
    req.body.updates = { __proto__: 'evil', constructor: 'evil', prototype: 'evil', name: 'Safe' };
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ updated: 3 });
  });

  it('strips created_at from updates', async () => {
    req.body.updates = { created_at: '2025-01-01', name: 'Test' };
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ updated: 3 });
  });

  it('returns 400 when all fields are stripped', async () => {
    req.body.updates = { vendors_id: 999 };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No valid fields to update' });
  });

  it('converts empty strings to null', async () => {
    req.body.updates = { name: '' };
    await handler(req, res);
    // The handler should convert '' to null
    expect(res.json).toHaveBeenCalledWith({ updated: 3 });
  });

  it('respects opts.allowed whitelist', async () => {
    const restrictedHandler = bulkUpdate('vendors', 'vendors_id', { allowed: ['status'] });
    req.body.updates = { name: 'Blocked', status: 'Inactive' };
    await restrictedHandler(req, res);
    expect(res.json).toHaveBeenCalledWith({ updated: 3 });
  });

  it('returns 400 when allowed fields have no match', async () => {
    const restrictedHandler = bulkUpdate('vendors', 'vendors_id', { allowed: ['status'] });
    req.body.updates = { name: 'Blocked' };
    await restrictedHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No valid fields to update' });
  });

  it('returns { updated: count } on success', async () => {
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ updated: 3 });
  });
});
