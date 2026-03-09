import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, getDemoUsers } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);
  // Track which user ID is being impersonated (null = default admin)
  const [impersonatedId, setImpersonatedId] = useState(
    () => localStorage.getItem('tems-demo-user-id') || null
  );

  const loadUser = useCallback(async () => {
    try {
      const res = await getCurrentUser();
      setUser(res.data);
    } catch {
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

  const loadDemoUsers = useCallback(async () => {
    try {
      const res = await getDemoUsers();
      setDemoUsers(res.data || []);
    } catch {
      // Not in dev mode or demo users not seeded yet
    }
  }, []);

  useEffect(() => {
    loadUser();
    loadDemoUsers();
  }, [loadUser, loadDemoUsers]);

  /**
   * Switch the active demo persona.
   * Passing null or the admin user’s ID reverts to the default admin.
   * @param {number|null} userId
   */
  const switchDemoUser = useCallback((userId) => {
    if (userId) {
      localStorage.setItem('tems-demo-user-id', String(userId));
      setImpersonatedId(String(userId));
    } else {
      localStorage.removeItem('tems-demo-user-id');
      setImpersonatedId(null);
    }
    setLoading(true);
    loadUser();
  }, [loadUser]);

  /** Revert to the default admin persona. */
  const endImpersonation = useCallback(() => switchDemoUser(null), [switchDemoUser]);

  /**
   * Check if the current user has a specific permission.
   * @param {string} resource - e.g. 'accounts'
   * @param {string} action   - e.g. 'delete'
   */
  const hasPermission = useCallback((resource, action) => {
    if (!user) return false;
    const perms = user.permissions || [];
    return perms.includes('*') || perms.includes(`${resource}:${action}`);
  }, [user]);

  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.includes(user.role_name);
  }, [user]);

  const canWrite = useCallback((resource) => {
    return hasPermission(resource, 'create') ||
           hasPermission(resource, 'update') ||
           hasPermission(resource, 'delete');
  }, [hasPermission]);

  const value = {
    user,
    loading,
    demoUsers,
    isImpersonating: !!impersonatedId,
    refreshUser: loadUser,
    hasPermission,
    hasRole,
    canWrite,
    isAdmin: user?.role_name === 'Admin',
    switchDemoUser,
    endImpersonation,
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
