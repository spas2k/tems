/**
 * Unit tests for middleware/auth.js — requireRole and requirePermission
 */
jest.mock('../../db', () => {
  const mockDb = jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    select: jest.fn().mockResolvedValue([]),
  }));
  mockDb.raw = jest.fn().mockResolvedValue({});
  return mockDb;
});

const { requireRole, requirePermission } = require('../../middleware/auth');

describe('auth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        users_id: 1,
        email: 'admin@test.com',
        display_name: 'Admin User',
        role_name: 'Admin',
        permissions: ['*'],
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('requireRole', () => {
    it('returns a middleware function', () => {
      const mw = requireRole('Admin');
      expect(typeof mw).toBe('function');
    });

    it('calls next() when user has matching role', () => {
      requireRole('Admin')(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next() when user matches any of multiple roles', () => {
      req.user.role_name = 'Manager';
      requireRole('Admin', 'Manager', 'Analyst')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 when user role does not match', () => {
      req.user.role_name = 'Viewer';
      requireRole('Admin', 'Manager')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Forbidden' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 message listing required roles', () => {
      req.user.role_name = 'Viewer';
      requireRole('Admin', 'Manager')(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Admin, Manager'),
        })
      );
    });

    it('returns 401 when no user is attached', () => {
      req.user = null;
      requireRole('Admin')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Authentication required' })
      );
    });

    it('returns 401 when user is undefined', () => {
      delete req.user;
      requireRole('Admin')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requirePermission', () => {
    it('returns a middleware function', () => {
      const mw = requirePermission('accounts', 'read');
      expect(typeof mw).toBe('function');
    });

    it('allows wildcard permissions (*)', () => {
      req.user.permissions = ['*'];
      requirePermission('accounts', 'read')(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows exact permission match', () => {
      req.user.permissions = ['accounts:read', 'accounts:create'];
      requirePermission('accounts', 'read')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 when permission is missing', () => {
      req.user.permissions = ['accounts:read'];
      requirePermission('accounts', 'delete')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Forbidden' })
      );
    });

    it('returns 403 message with resource and action', () => {
      req.user.permissions = [];
      requirePermission('invoices', 'create')(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('create'),
        })
      );
    });

    it('returns 401 when no user is attached', () => {
      req.user = null;
      requirePermission('reports', 'read')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('handles empty permissions array', () => {
      req.user.permissions = [];
      requirePermission('vendors', 'read')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('handles undefined permissions', () => {
      req.user.permissions = undefined;
      requirePermission('vendors', 'read')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
