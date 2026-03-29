/**
 * @file Favorites management context for bookmark functionality.
 * @module FavoritesContext
 *
 * Loads user favorites from the API on mount. Provides CRUD operations with
 * dedup-aware addFavorite that replaces existing entries sharing the same key.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFavorites, createFavorite, renameFavorite as apiRename, deleteFavorite } from '../api';

const FavoritesContext = createContext(null);

// Normalize a DB row to the shape the UI expects
function normalize(row) {
  return {
    id: row.user_favorites_id,
    name: row.name,
    path: row.path,
    filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : (row.filters || {}),
    filterSummary: row.filter_summary || '',
    icon: row.icon || null,
    createdAt: row.created_at,
  };
}

/**
 * @component FavoritesProvider
 * @param {Object} props - { children }
 * Fetches favorites on mount and provides CRUD operations.
 */
export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);

  // Load from API on mount
  useEffect(() => {
    getFavorites()
      .then(res => setFavorites(res.data.map(normalize)))
      .catch(() => {});
  }, []);

  const addFavorite = useCallback(async ({ name, path, filters, filterSummary, icon }) => {
    // Remove existing favorite with same path+filters (dedup)
    const key = path + JSON.stringify(filters || {});
    const dup = favorites.find(f => f.path + JSON.stringify(f.filters || {}) === key);
    if (dup) await deleteFavorite(dup.id).catch(() => {});

    const res = await createFavorite({ name, path, filters: filters || {}, filter_summary: filterSummary || '', icon: icon || null });
    const next = normalize(res.data);
    setFavorites(prev => {
      const without = prev.filter(f => f.path + JSON.stringify(f.filters || {}) !== key);
      return [next, ...without];
    });
  }, [favorites]);

  const removeFavorite = useCallback(async (id) => {
    await deleteFavorite(id).catch(() => {});
    setFavorites(prev => prev.filter(f => f.id !== id));
  }, []);

  const renameFavorite = useCallback(async (id, name) => {
    const res = await apiRename(id, name);
    const updated = normalize(res.data);
    setFavorites(prev => prev.map(f => f.id === id ? updated : f));
  }, []);

  const isFavorited = useCallback((path, filters) => {
    const key = path + JSON.stringify(filters || {});
    return favorites.some(f => (f.path + JSON.stringify(f.filters || {})) === key);
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, renameFavorite, isFavorited }}>
      {children}
    </FavoritesContext.Provider>
  );
}

/**
 * @function useFavorites
 * Returns { favorites, addFavorite, removeFavorite, renameFavorite, isFavorited }.
 */
export function useFavorites() {
  return useContext(FavoritesContext);
}
