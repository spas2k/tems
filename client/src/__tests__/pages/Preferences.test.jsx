import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUpdatePreferences = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      display_name: 'Alice',
      email: 'alice@example.com',
      role_name: 'Admin',
      preferences: { theme: 'light', show_form_instructions: true },
    },
    updatePreferences: mockUpdatePreferences,
  })),
}));

import Preferences from '../../pages/Preferences';

describe('Preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the theme section with Light, Dark, Auto options', () => {
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('clicking a theme option changes the selection', () => {
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    const darkBtn = screen.getByText('Dark').closest('button');
    fireEvent.click(darkBtn);
    expect(darkBtn.className).toContain('theme-card-active');
  });

  it('renders Coming Soon sections', () => {
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Layout')).toBeInTheDocument();
    expect(screen.getByText('Regional & Locale')).toBeInTheDocument();
    expect(screen.getByText('Session & Security')).toBeInTheDocument();
    const badges = screen.getAllByText('Coming Soon');
    expect(badges.length).toBe(3);
  });

  it('renders form instructions toggle', () => {
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    expect(screen.getByText('Show Form Instructions')).toBeInTheDocument();
  });

  it('clicking form instructions toggle calls updatePreferences', () => {
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    const toggleBtn = screen.getByTitle('Hide form instructions');
    fireEvent.click(toggleBtn);
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ show_form_instructions: false });
  });

  it('renders user profile card', () => {
    render(<MemoryRouter><Preferences /></MemoryRouter>);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
