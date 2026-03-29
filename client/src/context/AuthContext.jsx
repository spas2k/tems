/**
 * @file Authentication context provider and useAuth hook.
 * @module AuthContext
 *
 * Loads the current user and demo user list on mount. Exposes auth state,
 * role/permission checks (hasPermission, hasRole, canWrite, isAdmin),
 * user preference updates, and demo-user impersonation switching.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, getDemoUsers, updateMyPreferences } from '../api';

const AuthContext = createContext(null);

/**
 * @component AuthProvider
 * @param {Object} props - { children }
 * Wraps the app in auth context, fetching user on mount.
 */
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
      
      const userData = res.data;
      if (typeof userData.preferences === 'string') {
        try { userData.preferences = JSON.parse(userData.preferences); } catch(e) { userData.preferences = {}; }
      } else {
        userData.preferences = userData.preferences || {};
      }
      
      // Sync DB preferences to localStorage for FOUC and external scripts
      if (userData.preferences.theme) localStorage.setItem('tems-theme', userData.preferences.theme);
      if (userData.preferences.rows_per_page) localStorage.setItem('tems-rows-per-page', userData.preferences.rows_per_page);

      setUser(userData);
    } catch (err) {
      if (err?.response?.status === 404) {
        localStorage.removeItem('tems-demo-user-id');
      }
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

  const updatePreferences = async (newPrefs) => {
    if (!user) return;
    const merged = { ...(user.preferences || {}), ...newPrefs };
    setUser(u => ({ ...u, preferences: merged }));
    
    if (merged.theme) localStorage.setItem('tems-theme', merged.theme);
    if (merged.rows_per_page) localStorage.setItem('tems-rows-per-page', merged.rows_per_page);
    
    try {
      await updateMyPreferences(newPrefs);
    } catch (e) {
      console.error('Failed to save preferences to server', e);
    }
  };

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
    updatePreferences,
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

/**
 * @function useAuth
 * Returns { user, loading, demoUsers, isImpersonating, refreshUser, updatePreferences, hasPermission, hasRole, canWrite, isAdmin, switchDemoUser, endImpersonation }.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export default AuthContext;
