import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

vi.mock('../../api', () => ({
  getCurrentUser: vi.fn(),
  getDemoUsers: vi.fn(),
  updateMyPreferences: vi.fn(),
}));

import { getCurrentUser, getDemoUsers, updateMyPreferences } from '../../api';

const mockUser = {
  users_id: 1,
  email: 'alice@example.com',
  display_name: 'Alice',
  role_name: 'Admin',
  permissions: ['*'],
  status: 'Active',
  preferences: { theme: 'dark' },
};

function TestConsumer({ onAuth } = {}) {
  const auth = useAuth();
  if (onAuth) onAuth(auth);
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user ? auth.user.display_name : 'none'}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="isImpersonating">{String(auth.isImpersonating)}</span>
      <span data-testid="demoUsers">{JSON.stringify(auth.demoUsers)}</span>
    </div>
  );
}

function renderWithProvider(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getCurrentUser.mockResolvedValue({ data: { ...mockUser, preferences: { ...mockUser.preferences } } });
  getDemoUsers.mockResolvedValue({ data: [{ users_id: 2, display_name: 'Bob' }] });
  updateMyPreferences.mockResolvedValue({});
});

describe('AuthProvider', () => {
  it('renders children', async () => {
    renderWithProvider(<span>hello</span>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows loading initially', () => {
    // Make getCurrentUser never resolve so loading stays true
    getCurrentUser.mockReturnValue(new Promise(() => {}));
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('loads user from API on mount', async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('Alice');
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('parses string preferences into object', async () => {
    getCurrentUser.mockResolvedValue({
      data: { ...mockUser, preferences: '{"theme":"light"}' },
    });

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);

    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.user.preferences).toEqual({ theme: 'light' });
  });

  it('falls back to default admin on 404 error', async () => {
    localStorage.setItem('tems-demo-user-id', '99');
    getCurrentUser.mockRejectedValue({ response: { status: 404 } });

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);

    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.user.email).toBe('anonymous@dev');
    expect(captured.user.role_name).toBe('Admin');
    expect(captured.user.permissions).toEqual(['*']);
    expect(localStorage.getItem('tems-demo-user-id')).toBeNull();
  });

  it('hasPermission with wildcard (*) returns true for anything', async () => {
    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.hasPermission('anything', 'read')).toBe(true);
    expect(captured.hasPermission('vendors', 'delete')).toBe(true);
  });

  it('hasPermission with specific permission matches correctly', async () => {
    getCurrentUser.mockResolvedValue({
      data: { ...mockUser, permissions: ['vendors:read'], preferences: {} },
    });

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));

    expect(captured.hasPermission('vendors', 'read')).toBe(true);
    expect(captured.hasPermission('vendors', 'delete')).toBe(false);
    expect(captured.hasPermission('accounts', 'read')).toBe(false);
  });

  it('hasPermission returns false when user is null', () => {
    // Render outside provider is tricky; instead test via never-resolving load
    getCurrentUser.mockReturnValue(new Promise(() => {}));

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);

    // While loading, user is null
    expect(captured.hasPermission('vendors', 'read')).toBe(false);
  });

  it('hasRole matches role_name', async () => {
    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.hasRole('Admin')).toBe(true);
  });

  it('hasRole with multiple roles', async () => {
    getCurrentUser.mockResolvedValue({
      data: { ...mockUser, role_name: 'Viewer', permissions: [], preferences: {} },
    });

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.hasRole('Admin', 'Viewer')).toBe(true);
  });

  it('hasRole returns false when no match', async () => {
    getCurrentUser.mockResolvedValue({
      data: { ...mockUser, role_name: 'Viewer', permissions: [], preferences: {} },
    });

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.hasRole('Admin', 'Manager')).toBe(false);
  });

  it('canWrite returns true if any of create/update/delete', async () => {
    getCurrentUser.mockResolvedValue({
      data: { ...mockUser, permissions: ['vendors:update'], preferences: {} },
    });

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.canWrite('vendors')).toBe(true);
  });

  it('canWrite returns false when no write permissions', async () => {
    getCurrentUser.mockResolvedValue({
      data: { ...mockUser, permissions: ['vendors:read'], preferences: {} },
    });

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.canWrite('vendors')).toBe(false);
  });

  it('isAdmin is true for Admin role', async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('true');
    });
  });

  it('isAdmin is false for non-Admin role', async () => {
    getCurrentUser.mockResolvedValue({
      data: { ...mockUser, role_name: 'Viewer', permissions: [], preferences: {} },
    });

    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('false');
    });
  });

  it('switchDemoUser saves to localStorage and re-loads', async () => {
    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));

    await act(async () => {
      captured.switchDemoUser(5);
    });

    expect(localStorage.getItem('tems-demo-user-id')).toBe('5');
    // loadUser is called again
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it('switchDemoUser(null) removes from localStorage', async () => {
    localStorage.setItem('tems-demo-user-id', '5');

    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));

    await act(async () => {
      captured.switchDemoUser(null);
    });

    expect(localStorage.getItem('tems-demo-user-id')).toBeNull();
  });

  it('updatePreferences merges with existing and calls API', async () => {
    let captured;
    renderWithProvider(<TestConsumer onAuth={(a) => (captured = a)} />);
    await waitFor(() => expect(captured.loading).toBe(false));

    await act(async () => {
      await captured.updatePreferences({ rows_per_page: 50 });
    });

    expect(captured.user.preferences).toEqual({ theme: 'dark', rows_per_page: 50 });
    expect(updateMyPreferences).toHaveBeenCalledWith({ rows_per_page: 50 });
  });

  it('getDemoUsers loads demo user list', async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => {
      expect(screen.getByTestId('demoUsers').textContent).toBe(
        JSON.stringify([{ users_id: 2, display_name: 'Bob' }])
      );
    });
    expect(getDemoUsers).toHaveBeenCalledTimes(1);
  });
});

describe('useAuth', () => {
  it('throws outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within <AuthProvider>'
    );
    spy.mockRestore();
  });
});
