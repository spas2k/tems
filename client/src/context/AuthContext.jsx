import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../api';

/**
 * Auth context — provides current user info and permission checks
 * throughout the React app.
 *
 * In dev mode, the backend returns the admin dev user automatically.
 * When SSO is enabled, the backend validates the token and returns
 * the real authenticated user.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const res = await getCurrentUser();
      setUser(res.data);
    } catch {
      // If auth tables don't exist yet (pre-migration), use fallback
      setUser({
        users_id: null,
        email: 'anonymous@dev',
        display_name: 'Dev User',
        role_name: 'Admin',
        permissions: ['*'],
        status: 'Active',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  /**
   * Check if the current user has a specific permission.
   * @param {string} resource - e.g. 'accounts'
   * @param {string} action   - e.g. 'delete'
   * @returns {boolean}
   */
  const hasPermission = useCallback((resource, action) => {
    if (!user) return false;
    const perms = user.permissions || [];
    return perms.includes('*') || perms.includes(`${resource}:${action}`);
  }, [user]);

  /**
   * Check if current user has one of the given roles.
   * @param  {...string} roles
   * @returns {boolean}
   */
  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.includes(user.role_name);
  }, [user]);

  /**
   * Check if user can perform any write operation on a resource.
   */
  const canWrite = useCallback((resource) => {
    return hasPermission(resource, 'create') ||
           hasPermission(resource, 'update') ||
           hasPermission(resource, 'delete');
  }, [hasPermission]);

  const value = {
    user,
    loading,
    refreshUser: loadUser,
    hasPermission,
    hasRole,
    canWrite,
    isAdmin: user?.role_name === 'Admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export default AuthContext;
