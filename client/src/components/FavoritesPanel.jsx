/**
 * @file Header dropdown panel for managing saved favorites.
 * @module FavoritesPanel
 *
 * Shows saved favorites with inline rename and delete. Navigates to the favorited path with its saved filter state on click.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, Trash2, Edit2, Check, X, ChevronRight } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export default function FavoritesPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites, removeFavorite, renameFavorite } = useFavorites();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on navigation
  useEffect(() => { setOpen(false); setEditingId(null); }, [location.pathname]);

  const go = (fav) => {
    navigate(fav.path, { state: { filters: fav.filters } });
    setOpen(false);
  };

  const startEdit = (fav, e) => {
    e.stopPropagation();
    setEditingId(fav.id);
    setEditName(fav.name);
  };

  const commitEdit = (id, e) => {
    e?.stopPropagation();
    if (editName.trim()) renameFavorite(id, editName.trim());
    setEditingId(null);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`recent-items-btn favorites-btn${open ? ' active' : ''}`}
        onClick={() => setOpen(p => !p)}
        title="Favorites"
      >
        <Star size={14} fill={favorites.length > 0 ? 'currentColor' : 'none'} />
        Favorites
        {favorites.length > 0 && (
          <span className="favorites-count">{favorites.length}</span>
        )}
      </button>

      {open && (
        <div className="favorites-dropdown">
          <div className="favorites-dropdown-header">
            <Star size={13} />
            <span>Favorites</span>
          </div>

          {favorites.length === 0 ? (
            <div className="favorites-empty">
              <Star size={22} style={{ opacity: 0.25, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: 13 }}>No favorites yet</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
                Use the <Star size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> button
                in any table to save a view.
              </div>
            </div>
          ) : (
            <div className="favorites-list">
              {favorites.map(fav => (
                <div
                  key={fav.id}
                  className="favorites-item"
                  onClick={() => editingId !== fav.id && go(fav)}
                >
                  {editingId === fav.id ? (
                    /* ── inline rename ── */
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        className="favorites-rename-input"
                        value={editName}
                        autoFocus
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit(fav.id, e);
                          if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); }
                        }}
                      />
                      <button className="favorites-action-btn" onClick={e => commitEdit(fav.id, e)} title="Save">
                        <Check size={13} color="#22c55e" />
                      </button>
                      <button className="favorites-action-btn" onClick={e => { e.stopPropagation(); setEditingId(null); }} title="Cancel">
                        <X size={13} color="#94a3b8" />
                      </button>
                    </div>
                  ) : (
                    /* ── normal display ── */
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="favorites-item-name">{fav.name}</div>
                        {fav.filterSummary && (
                          <div className="favorites-item-sub">{fav.filterSummary}</div>
                        )}
                      </div>
                      <div className="favorites-item-actions">
                        <button
                          className="favorites-action-btn"
                          onClick={e => startEdit(fav, e)}
                          title="Rename"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="favorites-action-btn fav-delete"
                          onClick={e => { e.stopPropagation(); removeFavorite(fav.id); }}
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                        <ChevronRight size={12} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
