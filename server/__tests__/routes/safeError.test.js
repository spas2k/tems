/**
 * Unit tests for _safeError.js — shared error handler
 */
const safeError = require('../../routes/_safeError');

describe('safeError', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('sends 500 status with error object', () => {
    safeError(res, new Error('something broke'), 'test');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('logs error with context label', () => {
    const err = new Error('fail');
    safeError(res, err, 'vendors');
    expect(console.error).toHaveBeenCalledWith('[vendors]', err);
  });

  it('logs with [api] when no context given', () => {
    const err = new Error('fail');
    safeError(res, err);
    expect(console.error).toHaveBeenCalledWith('[api]', err);
  });

  it('maps unique constraint errors to friendly message', () => {
    safeError(res, new Error('unique constraint violated on key "vendors_name"'), 'vendors');
    expect(res.json).toHaveBeenCalledWith({
      error: 'A record with that value already exists. Please use a unique identifier.',
    });
  });

  it('maps duplicate entry errors', () => {
    safeError(res, new Error('ER_DUP_ENTRY: Duplicate key'), 'invoices');
    expect(res.json).toHaveBeenCalledWith({
      error: 'A record with that value already exists. Please use a unique identifier.',
    });
  });

  it('maps foreign key errors to friendly message', () => {
    safeError(res, new Error('foreign key constraint "fk_vendors" failed'), 'accounts');
    expect(res.json).toHaveBeenCalledWith({
      error: 'The referenced record does not exist. Please check your selections.',
    });
  });

  it('maps not null errors to friendly message', () => {
    safeError(res, new Error('not null violation on column "name"'), 'vendors');
    expect(res.json).toHaveBeenCalledWith({
      error: 'A required field is missing. Please fill in all required fields.',
    });
  });

  it('maps data truncation errors to friendly message', () => {
    safeError(res, new Error('Data truncated for column "status"'), 'contracts');
    expect(res.json).toHaveBeenCalledWith({
      error: 'A field value is invalid or too long. Please check your input.',
    });
  });

  it('includes raw message in non-production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    safeError(res, new Error('some random error'), 'test');
    expect(res.json).toHaveBeenCalledWith({ error: 'some random error' });
    process.env.NODE_ENV = originalEnv;
  });

  it('returns generic message in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    safeError(res, new Error('some random error'), 'test');
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    process.env.NODE_ENV = originalEnv;
  });

  it('handles errors with no message', () => {
    safeError(res, new Error(''), 'test');
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
