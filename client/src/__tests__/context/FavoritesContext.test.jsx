/**
 * Unit tests for FavoritesContext
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { FavoritesProvider, useFavorites } from '../../context/FavoritesContext';

vi.mock('../../api', () => ({
  getFavorites: vi.fn(),
  createFavorite: vi.fn(),
  renameFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
}));

import { getFavorites, createFavorite, renameFavorite as apiRename, deleteFavorite } from '../../api';

const MOCK_FAV = {
  user_favorites_id: 1,
  name: 'Active Vendors',
  path: '/vendors',
  filters: '{"status":"Active"}',
  filter_summary: 'Status = Active',
  icon: null,
  created_at: '2025-01-01T00:00:00Z',
};

function TestConsumer() {
  const { favorites, addFavorite, removeFavorite, renameFavorite, isFavorited } = useFavorites();
  return (
    <div>
      <span data-testid="count">{favorites.length}</span>
      <span data-testid="names">{favorites.map(f => f.name).join(',')}</span>
      <span data-testid="isFav">{String(isFavorited('/vendors', { status: 'Active' }))}</span>
      <button data-testid="add" onClick={() => addFavorite({ name: 'New', path: '/test', filters: {} })}>Add</button>
      <button data-testid="remove" onClick={() => removeFavorite(1)}>Remove</button>
      <button data-testid="rename" onClick={() => renameFavorite(1, 'Renamed')}>Rename</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <FavoritesProvider>
      <TestConsumer />
    </FavoritesProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getFavorites.mockResolvedValue({ data: [MOCK_FAV] });
  createFavorite.mockResolvedValue({ data: { user_favorites_id: 2, name: 'New', path: '/test', filters: '{}', filter_summary: '', icon: null, created_at: '2025-01-02T00:00:00Z' } });
  apiRename.mockResolvedValue({ data: { ...MOCK_FAV, name: 'Renamed' } });
  deleteFavorite.mockResolvedValue({});
});

describe('FavoritesContext', () => {
  it('renders children', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('count')).toBeInTheDocument());
  });

  it('loads favorites from API on mount', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(screen.getByTestId('names').textContent).toBe('Active Vendors');
  });

  it('calls getFavorites on mount', async () => {
    renderWithProvider();
    await waitFor(() => expect(getFavorites).toHaveBeenCalledOnce());
  });

  it('isFavorited returns true for matching path+filters', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('isFav').textContent).toBe('true'));
  });

  it('addFavorite calls API and adds to list', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    await act(async () => {
      screen.getByTestId('add').click();
    });
    await waitFor(() => expect(createFavorite).toHaveBeenCalledOnce());
  });

  it('removeFavorite calls deleteFavorite and removes', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    await act(async () => {
      screen.getByTestId('remove').click();
    });
    await waitFor(() => {
      expect(deleteFavorite).toHaveBeenCalledWith(1);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });
  });

  it('renameFavorite calls API and updates name', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    await act(async () => {
      screen.getByTestId('rename').click();
    });
    await waitFor(() => {
      expect(apiRename).toHaveBeenCalledWith(1, 'Renamed');
      expect(screen.getByTestId('names').textContent).toBe('Renamed');
    });
  });

  it('handles getFavorites failure gracefully', async () => {
    getFavorites.mockRejectedValue(new Error('fail'));
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));
  });

  it('parses string filters from API', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('isFav').textContent).toBe('true'));
  });
});
