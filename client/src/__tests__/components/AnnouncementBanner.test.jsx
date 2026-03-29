/**
 * Unit tests for AnnouncementBanner component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnnouncementBanner from '../../components/AnnouncementBanner';

// Mock the api module
vi.mock('../../api', () => ({
  getAnnouncements: vi.fn(),
}));

import { getAnnouncements } from '../../api';

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing when no announcements', async () => {
    getAnnouncements.mockResolvedValue({ data: [] });
    const { container } = render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('renders announcements from API', async () => {
    getAnnouncements.mockResolvedValue({
      data: [
        { announcements_id: 1, type: 'info', title: 'System Update', message: 'Planned maintenance tonight.' },
      ],
    });
    render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('System Update')).toBeInTheDocument();
    });
  });

  it('renders multiple announcements', async () => {
    getAnnouncements.mockResolvedValue({
      data: [
        { announcements_id: 1, type: 'info', title: 'Info', message: 'FYI' },
        { announcements_id: 2, type: 'warning', title: 'Warning', message: 'Watch out' },
      ],
    });
    render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });
  });

  it('hides dismissed announcements on load', async () => {
    localStorage.setItem('tems-dismissed-announcements', JSON.stringify([1]));
    getAnnouncements.mockResolvedValue({
      data: [
        { announcements_id: 1, type: 'info', title: 'Hidden', message: 'Should not show' },
        { announcements_id: 2, type: 'info', title: 'Visible', message: 'Should show' },
      ],
    });
    render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
      expect(screen.getByText('Visible')).toBeInTheDocument();
    });
  });

  it('calls API with active filter', async () => {
    getAnnouncements.mockResolvedValue({ data: [] });
    render(<AnnouncementBanner />);
    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalledWith({ active: 'true' });
    });
  });

  it('handles API errors gracefully', async () => {
    getAnnouncements.mockRejectedValue(new Error('Network error'));
    const { container } = render(<AnnouncementBanner />);
    await waitFor(() => {
      // Should render nothing on error, not crash
      expect(container.innerHTML).toBe('');
    });
  });
});
